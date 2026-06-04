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
  classifyVehicleReadiness
} from '../../services/inventory/importService.js';
import { requireDealerAccess } from '../security.js';
import {
  bulkEditSchema,
  emptyBodySchema,
  inventoryImportSchema,
  photoUpdateSchema,
  priceUpdateSchema,
  validateBody,
} from '../requestValidation.js';

type VehicleParams = { dealershipId: string; stockNumber: string };
type DealerParams = { dealershipId: string };

async function findDealer(prisma: PrismaClient, dealershipId: string) {
  return prisma.dealershipProfile.findUnique({ where: { id: dealershipId }, select: { id: true } });
}

export function registerInventoryRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // ── Inventory list ──────────────────────────────────────────────────────────

  app.get<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!requireDealerAccess(request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const vehicles = await prisma.vehicle.findMany({
        where: { dealershipId, removedAt: null, soldAt: null },
        select: {
          id: true, stockNumber: true, vin: true, year: true,
          make: true, model: true, trim: true, mileage: true,
          priceCents: true, condition: true, exteriorColor: true,
          bodyStyle: true, updatedAt: true,
          _count: { select: { media: true } }
        },
        orderBy: { updatedAt: 'desc' }
      });

      const items = vehicles.map(v => {
        const { readiness, issues } = classifyVehicleReadiness({ ...v, mediaCount: v._count.media });
        return {
          id: v.id, stockNumber: v.stockNumber, vin: v.vin,
          year: v.year, make: v.make, model: v.model, trim: v.trim,
          mileage: v.mileage, priceCents: v.priceCents,
          condition: v.condition, exteriorColor: v.exteriorColor,
          mediaCount: v._count.media, readiness, issues,
          updatedAt: v.updatedAt.toISOString(),
        };
      });

      return reply.send({
        vehicles: items,
        summary: {
          total: items.length,
          ready: items.filter(v => v.readiness === 'READY').length,
          warning: items.filter(v => v.readiness === 'WARNING').length,
          blocked: items.filter(v => v.readiness === 'BLOCKED').length,
        }
      });
    }
  );

  // ── Import preview (no DB writes) ────────────────────────────────────────────

  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/import/preview',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!requireDealerAccess(request, reply, dealershipId)) return;
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
      if (!requireDealerAccess(request, reply, dealershipId)) return;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = validateBody(inventoryImportSchema, request.body);
      if (!body.ok) return reply.status(400).send({ error: body.error });

      const result = await commitImport(prisma, dealershipId, body.data.rows, body.data.mapping ?? {});
      return reply.send(result);
    }
  );

  // ── Bulk field edit ───────────────────────────────────────────────────────────

  app.patch<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/bulk',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!requireDealerAccess(request, reply, dealershipId)) return;
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
      if (!requireDealerAccess(request, reply, dealershipId)) return;
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
      if (!requireDealerAccess(request, reply, request.params.dealershipId)) return;
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
      if (!requireDealerAccess(request, reply, request.params.dealershipId)) return;
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
      if (!requireDealerAccess(request, reply, request.params.dealershipId)) return;
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
      if (!requireDealerAccess(request, reply, request.params.dealershipId)) return;
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
