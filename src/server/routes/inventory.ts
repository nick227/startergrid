import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import {
  applyVehicleUpdate,
  validatePriceUpdate,
  validatePhotoUpdate
} from '../../services/inventory/inventoryUpdateService.js';
import {
  previewImport,
  commitImport,
  ingestJsonVehicles,
} from '../../services/inventory/importService.js';
import { listInventoryVehicles, type LifecycleScope } from '../../services/inventory/inventoryListService.js';
import { requireDealerAccess } from '../security.js';
import {
  bulkEditSchema,
  emptyBodySchema,
  inventoryImportSchema,
  jsonIngestSchema,
  photoUpdateSchema,
  priceUpdateSchema,
  snapshotCommitSchema,
  validateBody,
} from '../requestValidation.js';

type VehicleParams = { dealershipId: string; stockNumber: string };
type DealerParams = { dealershipId: string };

async function findDealer(prisma: PrismaClient, dealershipId: string) {
  return prisma.dealershipProfile.findUnique({ where: { id: dealershipId }, select: { id: true } });
}

export function registerInventoryRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // ── Inventory list ──────────────────────────────────────────────────────────

  app.get<{ Params: DealerParams; Querystring: { lifecycleScope?: string } }>(
    '/api/dealers/:dealershipId/inventory',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const rawScope = request.query.lifecycleScope ?? 'active';
      const scope: LifecycleScope =
        rawScope === 'sold' || rawScope === 'removed' || rawScope === 'all'
          ? rawScope
          : 'active';

      const result = await listInventoryVehicles(prisma, dealershipId, scope);
      return reply.send(result);
    }
  );

  // ── Import preview (no DB writes) ────────────────────────────────────────────

  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/import/preview',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(inventoryImportSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const result = await previewImport(prisma, dealershipId, body.data.rows, body.data.mapping ?? {});
      return reply.send(result);
    }
  );

  // ── Import commit ─────────────────────────────────────────────────────────────

  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/import/commit',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(inventoryImportSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const result = await commitImport(prisma, dealershipId, body.data.rows, body.data.mapping ?? {});
      return reply.send(result);
    }
  );

  // ── JSON ingest ───────────────────────────────────────────────────────────────

  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/ingest/json',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(jsonIngestSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const result = await ingestJsonVehicles(prisma, dealershipId, body.data.vehicles, {
        sourceSlug:  body.data.sourceSlug,
        sourceLabel: body.data.sourceLabel,
        snapshotMode: body.data.snapshotMode,
        dryRun: body.data.dryRun,
        commitSnapshotRemovals: body.data.commitSnapshotRemovals,
      });
      return reply.send(result);
    }
  );

  // ── Snapshot removal commit (explicit, after dry-run ingest) ─────────────────

  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/ingest/snapshot/commit',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(snapshotCommitSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const { commitSnapshotRemovals } = await import('../../services/inventory/salesStatusReconcileService.js');
      const result = await commitSnapshotRemovals(
        prisma,
        dealershipId,
        body.data.ingressRunId,
        body.data.stockNumbers,
        {
          statusChangedAt: body.data.statusChangedAt
            ? new Date(body.data.statusChangedAt)
            : undefined,
        },
      );

      if (result.rejected.length > 0 && result.applied === 0) {
        return reply.status(400).send({
          error: 'No stock numbers matched the snapshot dry-run for this ingress run',
          ...result,
        });
      }

      return reply.send(result);
    }
  );

  // ── Lifecycle audit trail ───────────────────────────────────────────────────

  app.get<{ Params: DealerParams; Querystring: { limit?: string; stockNumber?: string } }>(
    '/api/dealers/:dealershipId/inventory/lifecycle-events',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const limit = request.query.limit ? parseInt(request.query.limit, 10) : 50;
      const { listLifecycleEvents } = await import('../../services/inventory/lifecycleEventService.js');
      const events = await listLifecycleEvents(prisma, dealershipId, {
        limit: Number.isFinite(limit) ? limit : 50,
        stockNumber: request.query.stockNumber,
      });

      return reply.send({ events });
    }
  );

  // ── Bulk field edit ───────────────────────────────────────────────────────────

  app.patch<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/bulk',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(bulkEditSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const result = await prisma.vehicle.updateMany({
        where: { dealershipId, stockNumber: { in: body.data.stockNumbers } },
        data: body.data.fields
      });

      if (result.count > 0) {
        const { scheduleAutoReconcile } = await import('../../services/publishing/autoReconcileService.js');
        scheduleAutoReconcile(dealershipId, { full: true });
      }

      return reply.send({ updated: result.count });
    }
  );

  // ── Import batch history ──────────────────────────────────────────────────────

  app.get<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/import/batches',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await requireDealerAccess(prisma, request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const events = await prisma.syncEvent.findMany({
        where: { dealershipId, kind: 'INVENTORY_IMPORT' },
        orderBy: { createdAt: 'desc' },
        take: 15,
      });

      return reply.send({
        batches: events.map(e => ({
          id: e.id,
          createdAt: e.createdAt.toISOString(),
          ...(e.payload as Record<string, unknown>),
        }))
      });
    }
  );

  app.patch<{ Params: VehicleParams }>(
    '/api/dealers/:dealershipId/vehicles/:stockNumber/price',
    async (request, reply) => {
      if (!await requireDealerAccess(prisma, request, reply, request.params.dealershipId)) return;
      const body = validateBody(priceUpdateSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const validation = validatePriceUpdate(body.data);
      if (!validation.ok) return reply.status(400).send({ error: validation.error });
      try {
        const result = await applyVehicleUpdate(
          prisma, request.params.dealershipId, request.params.stockNumber,
          'PRICE_CHANGE', { priceCents: validation.priceCents }
        );
        return reply.send(result);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found'))
          return reply.status(404).send({ error: err.message });
        throw err;
      }
    }
  );

  app.post<{ Params: VehicleParams }>(
    '/api/dealers/:dealershipId/vehicles/:stockNumber/sold',
    async (request, reply) => {
      if (!await requireDealerAccess(prisma, request, reply, request.params.dealershipId)) return;
      const body = validateBody(emptyBodySchema, request.body ?? {});
      if (!body.ok) return reply.status(400).send({ error: body.error });

      try {
        const result = await applyVehicleUpdate(
          prisma, request.params.dealershipId, request.params.stockNumber, 'SOLD'
        );
        return reply.send(result);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found'))
          return reply.status(404).send({ error: err.message });
        throw err;
      }
    }
  );

  app.post<{ Params: VehicleParams }>(
    '/api/dealers/:dealershipId/vehicles/:stockNumber/removed',
    async (request, reply) => {
      if (!await requireDealerAccess(prisma, request, reply, request.params.dealershipId)) return;
      const body = validateBody(emptyBodySchema, request.body ?? {});
      if (!body.ok) return reply.status(400).send({ error: body.error });

      try {
        const result = await applyVehicleUpdate(
          prisma, request.params.dealershipId, request.params.stockNumber, 'REMOVED'
        );
        return reply.send(result);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found'))
          return reply.status(404).send({ error: err.message });
        throw err;
      }
    }
  );

  app.patch<{ Params: VehicleParams }>(
    '/api/dealers/:dealershipId/vehicles/:stockNumber/photos',
    async (request, reply) => {
      if (!await requireDealerAccess(prisma, request, reply, request.params.dealershipId)) return;
      const body = validateBody(photoUpdateSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const validation = validatePhotoUpdate(body.data);
      if (!validation.ok) return reply.status(400).send({ error: validation.error });
      try {
        const result = await applyVehicleUpdate(
          prisma, request.params.dealershipId, request.params.stockNumber,
          'PHOTO_CHANGE', { photoUrls: validation.photoUrls }
        );
        return reply.send(result);
      } catch (err: unknown) {
        if (err instanceof Error && err.message.includes('not found'))
          return reply.status(404).send({ error: err.message });
        throw err;
      }
    }
  );
}
