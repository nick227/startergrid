import type { FastifyInstance } from 'fastify';
import type { PrismaClient, Prisma } from '@prisma/client';
import {
  runPrepareAndPublish,
  deriveNextRecommendedAction
} from '../../services/publishing/prepareAndPublishService.js';
import {
  getAutoSyncStatus,
  scheduleBootstrapIfNeeded,
} from '../../services/publishing/autoReconcileService.js';
import { getQueueView } from '../../services/publishing/publishQueueService.js';
import { platformProfiles } from '../../data/platformProfiles.js';

type DealerParams = { dealershipId: string };
type PrepareBody = { dryRun?: boolean; platforms?: string[] };
type HistoryQuery = { platformSlug?: string; kind?: string; limit?: string; before?: string };

// ── helpers ──────────────────────────────────────────────────────────────────

async function requireDealer(prisma: PrismaClient, dealershipId: string): Promise<boolean> {
  const row = await prisma.dealershipProfile.findUnique({
    where: { id: dealershipId }, select: { id: true }
  });
  return row !== null;
}

// ── route registrar ───────────────────────────────────────────────────────────

export function registerPublishRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // POST /api/dealers/:dealershipId/publish/prepare
  app.post<{ Params: DealerParams; Body: PrepareBody }>(
    '/api/dealers/:dealershipId/publish/prepare',
    async (request, reply) => {
      const { dealershipId } = request.params;
      const body: PrepareBody = (request.body as PrepareBody) ?? {};
      const dryRun = body.dryRun !== false; // default true for API safety
      const platformFilter = body.platforms?.length ? body.platforms : undefined;

      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      try {
        const result = await runPrepareAndPublish(prisma, dealershipId, { dryRun, platformFilter });
        return reply.send({
          ...result,
          nextRecommendedAction: deriveNextRecommendedAction(result.vehicles, result.summary)
        });
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found'))
          return reply.status(404).send({ error: err.message });
        throw err;
      }
    }
  );

  // GET /api/dealers/:dealershipId/publish/status
  app.get<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/publish/status',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      await scheduleBootstrapIfNeeded(dealershipId);

      const result = await runPrepareAndPublish(prisma, dealershipId, { dryRun: true });
      const autoSync = getAutoSyncStatus(dealershipId);
      return reply.send({
        dealershipId: result.dealershipId,
        dealerName: result.dealerName,
        preparedAt: result.preparedAt,
        autoSync,
        vehicles: {
          total:   result.vehicles.total,
          ready:   result.vehicles.ready,
          warning: result.vehicles.warning,
          blocked: result.vehicles.blocked,
          details: result.vehicles.details
        },
        readinessSummary: result.readinessSummary,
        platforms: result.platforms,
        summary:   result.summary,
        nextRecommendedAction: deriveNextRecommendedAction(result.vehicles, result.summary)
      });
    }
  );

  // GET /api/dealers/:dealershipId/publish/auto-sync
  app.get<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/publish/auto-sync',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });
      return reply.send(getAutoSyncStatus(dealershipId));
    }
  );

  // GET /api/dealers/:dealershipId/publish/history
  app.get<{ Params: DealerParams; Querystring: HistoryQuery }>(
    '/api/dealers/:dealershipId/publish/history',
    async (request, reply) => {
      const { dealershipId } = request.params;
      const { platformSlug, kind, limit: limitStr, before } = request.query;

      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const limit = Math.min(Math.max(parseInt(limitStr ?? '50', 10) || 50, 1), 200);

      let cursorDate: Date | undefined;
      if (before) {
        const ref = await prisma.syncEvent.findUnique({ where: { id: before }, select: { createdAt: true } });
        if (ref) cursorDate = ref.createdAt;
      }

      const rows = await prisma.syncEvent.findMany({
        where: {
          dealershipId,
          ...(platformSlug ? { platformSlug } : {}),
          ...(kind ? { kind: kind as Prisma.EnumSyncEventKindFilter } : {}),
          ...(cursorDate ? { createdAt: { lt: cursorDate } } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: limit + 1
      });

      const hasMore = rows.length > limit;
      const page = hasMore ? rows.slice(0, limit) : rows;

      return reply.send({
        events: page.map(e => ({
          id:           e.id,
          dealershipId: e.dealershipId,
          vehicleId:    e.vehicleId,
          platformSlug: e.platformSlug,
          kind:         e.kind,
          payload:      e.payload,
          syncRunId:    e.syncRunId,
          createdAt:    e.createdAt.toISOString()
        })),
        meta: {
          hasMore,
          nextCursor: hasMore ? (page[page.length - 1]?.id ?? null) : null
        }
      });
    }
  );

  // GET /api/dealers/:dealershipId/publish/accounts
  // NOTE: inline DB queries here — no service exists yet; extract to publishing/ in Phase 4
  app.get<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/publish/accounts',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const [accounts, applications] = await Promise.all([
        prisma.platformAccount.findMany({ where: { dealershipId } }),
        prisma.platformApplication.findMany({
          where: { dealershipId },
          include: { platform: { select: { slug: true } } }
        })
      ]);

      const accountBySlug = new Map(accounts.map(a => [a.platformSlug, a]));
      const appBySlug     = new Map(applications.map(a => [a.platform.slug, a]));

      const result = platformProfiles.map(p => {
        const acct = accountBySlug.get(p.slug);
        const appl = appBySlug.get(p.slug);
        return {
          platformSlug:      p.slug,
          platformName:      p.name,
          integrationClass:  p.integrationClass,
          accountState:      acct?.state ?? 'ACCOUNT_NEEDED',
          accountId:         acct?.accountId ?? null,
          platformRepName:   acct?.platformRepName ?? null,
          platformRepEmail:  acct?.platformRepEmail ?? null,
          membershipStatus:  acct?.membershipStatus ?? null,
          nextAction:        acct?.nextAction ?? null,
          nextActionOwner:   acct?.nextActionOwner ?? null,
          notes:             acct?.notes ?? null,
          applicationStatus: appl?.status ?? null,
          lastChecked:       acct?.lastChecked?.toISOString()  ?? null,
          updatedAt:         acct?.updatedAt?.toISOString()    ?? appl?.updatedAt?.toISOString() ?? null
        };
      });

      return reply.send({ accounts: result });
    }
  );

  // GET /api/dealers/:dealershipId/publish/queue
  app.get<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/publish/queue',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });
      const view = await getQueueView(prisma, dealershipId);
      return reply.send(view);
    }
  );
}
