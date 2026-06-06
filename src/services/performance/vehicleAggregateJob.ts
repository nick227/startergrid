import type { Prisma, PrismaClient } from '@prisma/client';
import { buildVehiclePerformanceRows, type VehiclePerfInput } from './performanceAggregator.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type VehicleJobResult = {
  computed: number;
  errors: number;
};

// ── Main job ──────────────────────────────────────────────────────────────────

// Fetches all vehicles for a dealer (active + sold — sold vehicles are needed to
// compute the comparable average), plus leads, then upserts one cache row per active vehicle.
//
// Idempotent: safe to rerun at any time. Uses upsert so partial runs leave the
// table in a consistent state; no deleteMany before recreating.
export async function computeVehiclePerformanceCache(
  prisma: PrismaClient,
  dealershipId: string,
  opts: { now?: Date } = {},
): Promise<VehicleJobResult> {
  const now = opts.now ?? new Date();

  // Fetch all vehicles — including sold ones so comparableAvgDays is accurate.
  const vehicles = await prisma.vehicle.findMany({
    where: { dealershipId },
    select: {
      id: true,
      stockNumber: true,
      make: true,
      model: true,
      year: true,
      priceCents: true,
      condition: true,
      createdAt: true,
      soldAt: true,
      removedAt: true,
    },
  });

  // Leads drive the platformAssistsJson: which platforms generated leads for each vehicle.
  const leads = await prisma.lead.findMany({
    where: { dealershipId },
    select: { vehicleId: true, platformSlug: true },
  });

  const vehicleInputs: VehiclePerfInput[] = vehicles.map(v => ({
    id:          v.id,
    stockNumber: v.stockNumber,
    make:        v.make,
    model:       v.model,
    year:        v.year,
    priceCents:  v.priceCents,
    condition:   v.condition,
    createdAt:   v.createdAt,
    soldAt:      v.soldAt,
    removedAt:   v.removedAt,
  }));

  const rows = buildVehiclePerformanceRows(vehicleInputs, leads, now);

  let computed = 0;
  let errors = 0;

  for (const row of rows) {
    try {
      const cacheData = {
        dealershipId,
        vehicleId:            row.vehicleId,
        stockNumber:          row.stockNumber,
        make:                 row.make,
        model:                row.model,
        year:                 row.year,
        priceCents:           row.priceCents,
        condition:            row.condition,
        daysOnline:           row.daysOnline,
        firstListedAt:        row.firstListedAt,
        comparableCount:      row.comparableCount,
        avgComparableDays:    row.avgComparableDays,
        medianComparableDays: row.medianComparableDays,
        benchmarkConfidence:  row.benchmarkConfidence,
        movementSignal:       row.movementSignal,
        platformAssistsJson:  row.platformAssistsJson as unknown as Prisma.InputJsonValue,
        computedAt:           now,
      };

      await prisma.vehiclePerformanceCache.upsert({
        where:  { vehicleId: row.vehicleId },
        create: cacheData,
        update: cacheData,
      });
      computed++;
    } catch (err) {
      errors++;
      console.error(`[vehicleAggregateJob] failed to upsert ${row.vehicleId}:`, err);
    }
  }

  return { computed, errors };
}
