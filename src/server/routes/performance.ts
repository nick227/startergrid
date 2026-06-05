import type { FastifyInstance } from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { requireDealerAccess } from '../security.js';
import {
  listVehiclePerformance,
  getVehiclePerformanceByStock,
  listPlatformPerformance,
  getPerformanceSummary,
} from '../../services/performance/performanceQueryService.js';
import { computeVehiclePerformanceCache }      from '../../services/performance/vehicleAggregateJob.js';
import { computePlatformPerformanceSummaries } from '../../services/performance/platformAggregateJob.js';

type DealerParams  = { dealershipId: string };
type VehicleParams = { dealershipId: string; stockNumber: string };

async function requireDealer(prisma: PrismaClient, dealershipId: string): Promise<boolean> {
  const row = await prisma.dealershipProfile.findUnique({
    where: { id: dealershipId }, select: { id: true },
  });
  return row !== null;
}

export function registerPerformanceRoutes(app: FastifyInstance, prisma: PrismaClient): void {

  // GET /api/dealers/:dealershipId/performance/vehicles
  // Returns cached movement signal and comparable benchmark for every active vehicle.
  // Cache-only: run POST /performance/compute if no data appears.
  app.get<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/performance/vehicles',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!requireDealerAccess(request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      return reply.send(await listVehiclePerformance(prisma, dealershipId));
    }
  );

  // GET /api/dealers/:dealershipId/performance/vehicles/:stockNumber
  // Returns cached performance for a single vehicle. 404 when not yet computed.
  app.get<{ Params: VehicleParams }>(
    '/api/dealers/:dealershipId/performance/vehicles/:stockNumber',
    async (request, reply) => {
      const { dealershipId, stockNumber } = request.params;
      if (!requireDealerAccess(request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const item = await getVehiclePerformanceByStock(prisma, dealershipId, stockNumber);
      if (!item)
        return reply.status(404).send({ error: 'No performance data for this vehicle. Run POST /performance/compute first.' });
      return reply.send({ item });
    }
  );

  // GET /api/dealers/:dealershipId/performance/platforms
  // Returns per-platform observed assist data — avg days to move, lead counts, confidence.
  app.get<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/performance/platforms',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!requireDealerAccess(request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      return reply.send(await listPlatformPerformance(prisma, dealershipId));
    }
  );

  // GET /api/dealers/:dealershipId/performance/summary
  // Returns top movers, stale risks, best observed platform, and signal counts.
  app.get<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/performance/summary',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!requireDealerAccess(request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      return reply.send({ summary: await getPerformanceSummary(prisma, dealershipId) });
    }
  );

  // POST /api/dealers/:dealershipId/performance/compute
  // Triggers performance cache recomputation. Returns counts and any job errors.
  // Does not hide errors: vehicleErrors > 0 means some vehicles failed to cache.
  app.post<{ Params: DealerParams }>(
    '/api/dealers/:dealershipId/performance/compute',
    async (request, reply) => {
      const { dealershipId } = request.params;
      if (!requireDealerAccess(request, reply, dealershipId)) return;
      if (!await requireDealer(prisma, dealershipId))
        return reply.status(404).send({ error: 'Dealer not found' });

      const startedAt = Date.now();
      const now = new Date();
      const [vResult, pResult] = await Promise.all([
        computeVehiclePerformanceCache(prisma, dealershipId, { now }),
        computePlatformPerformanceSummaries(prisma, dealershipId, { now }),
      ]);

      return reply.send({
        result: {
          vehicles:      vResult.computed,
          vehicleErrors: vResult.errors,
          platforms:     pResult.platforms,
          durationMs:    Date.now() - startedAt,
          computedAt:    now.toISOString(),
        },
      });
    }
  );
}
