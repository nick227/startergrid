import type { PrismaClient } from '@prisma/client';
import { computeVehiclePerformanceCache } from './vehicleAggregateJob.js';
import { computePlatformPerformanceSummaries } from './platformAggregateJob.js';

export type PerformanceComputeResult = {
  vehicles: number;
  vehicleErrors: number;
  platforms: number;
  durationMs: number;
  computedAt: string;
};

/** Recompute vehicle + platform performance caches for one dealer. Idempotent. */
export async function runPerformanceComputeForDealer(
  prisma: PrismaClient,
  dealershipId: string,
  opts: { now?: Date } = {},
): Promise<PerformanceComputeResult> {
  const startedAt = Date.now();
  const now = opts.now ?? new Date();
  const [vResult, pResult] = await Promise.all([
    computeVehiclePerformanceCache(prisma, dealershipId, { now }),
    computePlatformPerformanceSummaries(prisma, dealershipId, { now }),
  ]);

  return {
    vehicles: vResult.computed,
    vehicleErrors: vResult.errors,
    platforms: pResult.platforms,
    durationMs: Date.now() - startedAt,
    computedAt: now.toISOString(),
  };
}
