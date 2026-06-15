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
import { getQueueView, dispatchQueueItemNow } from '../../services/publishing/publishQueueService.js';
import {
  approveQueueItem,
  holdQueueItem,
  rejectQueueItem,
  releaseHeldQueueItem,
} from '../../services/publishing/approvalService.js';
import { platformProfiles } from '../../data/platformProfiles.js';
import { requireDealerAccess } from '../security.js';
import {
  filterDealerHistoryEvents,
  loadDealerOutboundContext,
} from '../../services/publishing/historyEligibilityService.js';
import {
  loadHistoryAssetFields,
  resolveHistoryAssetFields,
} from '../../services/publishing/historyAssetEnrichment.js';
import { preparePublishSchema, validateBody } from '../requestValidation.js';
import {
  filterOfferedPlatformProfiles,
  loadSiteAvailabilityMap,
} from '../../services/platform/platformAvailabilityService.js';
import { platformsForCategory } from '../../data/platformCategoryMap.js';

type DealerParams = { dealershipId: string };
type PrepareBody = { dryRun?: boolean; platforms?: string[] };
type HistoryQuery = { platformSlug?: string; kind?: string; limit?: string; before?: string };
type QueueItemParams = { dealershipId: string; itemId: string };
type QueueActionBody = { reason?: string };

function operatorLabel(request: { operator?: { email: string } }): string {
  return request.operator?.email ?? 'operator';
}

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
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      const parsed = validateBody(preparePublishSchema, request.body ?? {});
      if (!parsed.ok) return reply.status(400).send({ error: parsed.error });

      const body: PrepareBody = parsed.data;
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
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
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
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
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
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;

      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const limit = Math.min(Math.max(parseInt(limitStr ?? '50', 10) || 50, 1), 200);
      const fetchLimit = Math.min(limit * 5, 200);

      let cursorDate: Date | undefined;
      if (before) {
        const ref = await prisma.syncEvent.findUnique({ where: { id: before }, select: { createdAt: true } });
        if (ref) cursorDate = ref.createdAt;
      }

      const outboundCtx = await loadDealerOutboundContext(prisma, dealershipId);

      const rows = await prisma.syncEvent.findMany({
        where: {
          dealershipId,
          ...(platformSlug ? { platformSlug } : {}),
          ...(kind ? { kind: kind as Prisma.EnumSyncEventKindFilter } : {}),
          ...(cursorDate ? { createdAt: { lt: cursorDate } } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: fetchLimit + 1
      });

      const filtered = filterDealerHistoryEvents(rows, outboundCtx);
      const hasMore = filtered.length > limit || rows.length > fetchLimit;
      const page = filtered.slice(0, limit);
      const assetFields = await loadHistoryAssetFields(prisma, dealershipId, page);

      return reply.send({
        events: page.map(e => {
          const asset = resolveHistoryAssetFields(e, assetFields);
          return {
            id:           e.id,
            dealershipId: e.dealershipId,
            vehicleId:    e.vehicleId,
            platformSlug: e.platformSlug,
            kind:         e.kind,
            payload:      e.payload,
            syncRunId:    e.syncRunId,
            createdAt:    e.createdAt.toISOString(),
            assetTitle:   asset.assetTitle,
            stockNumber:  asset.stockNumber,
          };
        }),
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
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const dealer = await prisma.dealershipProfile.findUnique({
        where: { id: dealershipId },
        select: { businessCategory: true },
      });
      const siteAvailability = await loadSiteAvailabilityMap(prisma);
      const offeredSlugs = new Set(
        filterOfferedPlatformProfiles(
          platformsForCategory(dealer?.businessCategory ?? null),
          siteAvailability,
        ).map(p => p.slug),
      );

      const [accounts, applications] = await Promise.all([
        prisma.platformAccount.findMany({
          where: { dealershipId, platformSlug: { in: [...offeredSlugs] } },
        }),
        prisma.platformApplication.findMany({
          where: { dealershipId, platform: { slug: { in: [...offeredSlugs] } } },
          include: { platform: { select: { slug: true } } },
        }),
      ]);

      const accountBySlug = new Map(accounts.map(a => [a.platformSlug, a]));
      const appBySlug = new Map(applications.map(a => [a.platform.slug, a]));

      const result = [...offeredSlugs].map(slug => {
        const profile = platformProfiles.find(p => p.slug === slug);
        if (!profile) return null;
        const acct = accountBySlug.get(slug);
        const appl = appBySlug.get(slug);
        return {
          platformSlug:      slug,
          platformName:      profile.name,
          integrationClass:  profile.integrationClass,
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
          updatedAt:         acct?.updatedAt?.toISOString()    ?? appl?.updatedAt?.toISOString() ?? null,
        };
      }).filter((row): row is NonNullable<typeof row> => row !== null);

      return reply.send({ accounts: result });
    }
  );

  // GET /api/dealers/:dealershipId/publish/queue
  app.get<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/publish/queue',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });
      const view = await getQueueView(prisma, dealershipId);
      return reply.send(view);
    }
  );

  async function requireQueueItem(
    dealershipId: string,
    itemId: string,
  ) {
    return prisma.publishQueueItem.findFirst({
      where: { id: itemId, dealershipId },
      select: { id: true },
    });
  }

  // POST /api/dealers/:dealershipId/publish/queue/:itemId/approve
  app.post<{ Params: QueueItemParams }>(
    '/api/dealers/:dealershipId/publish/queue/:itemId/approve',
    async (request, reply) => {
      const { dealershipId, itemId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId)) return reply.status(404).send({ error: 'Dealer not found' });
      if (!await requireQueueItem(dealershipId, itemId)) return reply.status(404).send({ error: 'Queue item not found' });
      try {
        await approveQueueItem(prisma, itemId, operatorLabel(request));
        return reply.send({ ok: true, itemId });
      } catch (err: unknown) {
        return reply.status(400).send({ error: err instanceof Error ? err.message : 'Approve failed' });
      }
    }
  );

  // POST /api/dealers/:dealershipId/publish/queue/:itemId/hold
  app.post<{ Params: QueueItemParams; Body: QueueActionBody }>(
    '/api/dealers/:dealershipId/publish/queue/:itemId/hold',
    async (request, reply) => {
      const { dealershipId, itemId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId)) return reply.status(404).send({ error: 'Dealer not found' });
      if (!await requireQueueItem(dealershipId, itemId)) return reply.status(404).send({ error: 'Queue item not found' });
      const reason = request.body?.reason?.trim() || 'Held by operator';
      try {
        await holdQueueItem(prisma, itemId, operatorLabel(request), reason);
        return reply.send({ ok: true, itemId });
      } catch (err: unknown) {
        return reply.status(400).send({ error: err instanceof Error ? err.message : 'Hold failed' });
      }
    }
  );

  // POST /api/dealers/:dealershipId/publish/queue/:itemId/reject
  app.post<{ Params: QueueItemParams; Body: QueueActionBody }>(
    '/api/dealers/:dealershipId/publish/queue/:itemId/reject',
    async (request, reply) => {
      const { dealershipId, itemId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId)) return reply.status(404).send({ error: 'Dealer not found' });
      if (!await requireQueueItem(dealershipId, itemId)) return reply.status(404).send({ error: 'Queue item not found' });
      const reason = request.body?.reason?.trim() || 'Rejected by operator';
      try {
        await rejectQueueItem(prisma, itemId, operatorLabel(request), reason);
        return reply.send({ ok: true, itemId });
      } catch (err: unknown) {
        return reply.status(400).send({ error: err instanceof Error ? err.message : 'Reject failed' });
      }
    }
  );

  // POST /api/dealers/:dealershipId/publish/queue/:itemId/release
  app.post<{ Params: QueueItemParams }>(
    '/api/dealers/:dealershipId/publish/queue/:itemId/release',
    async (request, reply) => {
      const { dealershipId, itemId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId)) return reply.status(404).send({ error: 'Dealer not found' });
      if (!await requireQueueItem(dealershipId, itemId)) return reply.status(404).send({ error: 'Queue item not found' });
      try {
        await releaseHeldQueueItem(prisma, itemId, operatorLabel(request));
        return reply.send({ ok: true, itemId });
      } catch (err: unknown) {
        return reply.status(400).send({ error: err instanceof Error ? err.message : 'Release failed' });
      }
    }
  );

  // POST /api/dealers/:dealershipId/publish/queue/:itemId/publish-now
  app.post<{ Params: QueueItemParams }>(
    '/api/dealers/:dealershipId/publish/queue/:itemId/publish-now',
    async (request, reply) => {
      const { dealershipId, itemId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId)) return reply.status(404).send({ error: 'Dealer not found' });
      try {
        const result = await dispatchQueueItemNow(prisma, dealershipId, itemId, operatorLabel(request));
        return reply.send(result);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Publish failed';
        const status = message.includes('not found') ? 404 : 400;
        return reply.status(status).send({ error: message });
      }
    }
  );
}
