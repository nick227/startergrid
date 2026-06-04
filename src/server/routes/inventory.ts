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
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = request.body as { rows?: unknown; mapping?: unknown };
      if (!Array.isArray(body.rows))
        return reply.status(400).send({ error: 'rows must be an array' });
      if ((body.rows as unknown[]).length > 2000)
        return reply.status(400).send({ error: 'Max 2000 rows per import' });

      const mapping = (typeof body.mapping === 'object' && body.mapping !== null)
        ? body.mapping as Record<string, string>
        : {};

      const result = await previewImport(prisma, dealershipId, body.rows as Record<string, string>[], mapping);
      return reply.send(result);
    }
  );

  // ── Import commit ─────────────────────────────────────────────────────────────

  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/import/commit',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = request.body as { rows?: unknown; mapping?: unknown };
      if (!Array.isArray(body.rows))
        return reply.status(400).send({ error: 'rows must be an array' });
      if ((body.rows as unknown[]).length > 2000)
        return reply.status(400).send({ error: 'Max 2000 rows per import' });

      const mapping = (typeof body.mapping === 'object' && body.mapping !== null)
        ? body.mapping as Record<string, string>
        : {};

      const result = await commitImport(prisma, dealershipId, body.rows as Record<string, string>[], mapping);
      return reply.send(result);
    }
  );

  // ── Bulk field edit ───────────────────────────────────────────────────────────

  app.patch<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/inventory/bulk',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!await findDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const body = request.body as { stockNumbers?: unknown; fields?: unknown };
      if (!Array.isArray(body.stockNumbers) || (body.stockNumbers as unknown[]).length === 0)
        return reply.status(400).send({ error: 'stockNumbers must be a non-empty array' });
      if (typeof body.fields !== 'object' || body.fields === null)
        return reply.status(400).send({ error: 'fields must be an object' });

      const ALLOWED = ['priceCents', 'mileage', 'condition', 'exteriorColor', 'interiorColor', 'bodyStyle', 'drivetrain', 'fuelType', 'transmission'];
      const safeFields: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(body.fields as Record<string, unknown>)) {
        if (ALLOWED.includes(k) && v !== undefined && v !== null && v !== '') safeFields[k] = v;
      }
      if (!Object.keys(safeFields).length)
        return reply.status(400).send({ error: 'No valid fields to update' });

      const result = await prisma.vehicle.updateMany({
        where: { dealershipId, stockNumber: { in: body.stockNumbers as string[] } },
        data: safeFields
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
      const validation = validatePriceUpdate(request.body);
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
      const validation = validatePhotoUpdate(request.body);
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
