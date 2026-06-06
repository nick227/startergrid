import type { Prisma, PrismaClient } from '@prisma/client';
import { buildVehiclePerformanceRows, type VehiclePerfInput, type SyncSubmissionEvent } from './performanceAggregator.js';

export type VehicleJobResult = {
  computed: number;
  purged: number;
  errors: number;
};

export async function computeVehiclePerformanceCache(
  prisma: PrismaClient,
  dealershipId: string,
  opts: { now?: Date } = {},
): Promise<VehicleJobResult> {
  const now = opts.now ?? new Date();

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
      reactivatedAt: true,
    },
  });

  const leads = await prisma.lead.findMany({
    where: { dealershipId },
    select: { vehicleId: true, platformSlug: true },
  });

  const submissionEvents = await prisma.syncEvent.findMany({
    where: {
      dealershipId,
      kind: 'SUBMISSION_SENT',
      vehicleId: { not: null },
    },
    select: { vehicleId: true, platformSlug: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  const vehicleInputs: VehiclePerfInput[] = vehicles.map(v => ({
    id:            v.id,
    stockNumber:   v.stockNumber,
    make:          v.make,
    model:         v.model,
    year:          v.year,
    priceCents:    v.priceCents,
    condition:     v.condition,
    createdAt:     v.createdAt,
    soldAt:        v.soldAt,
    removedAt:     v.removedAt,
    reactivatedAt: v.reactivatedAt,
  }));

  const submissionInputs: SyncSubmissionEvent[] = submissionEvents.map(ev => ({
    vehicleId:    ev.vehicleId,
    platformSlug: ev.platformSlug,
    createdAt:    ev.createdAt,
  }));

  const rows = buildVehiclePerformanceRows(vehicleInputs, leads, now, submissionInputs);
  const activeIds = new Set(rows.map(r => r.vehicleId));

  const stale = await prisma.vehiclePerformanceCache.findMany({
    where: { dealershipId },
    select: { vehicleId: true },
  });
  let purged = 0;
  for (const row of stale) {
    if (activeIds.has(row.vehicleId)) continue;
    await prisma.vehiclePerformanceCache.delete({ where: { vehicleId: row.vehicleId } });
    purged++;
  }

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

  return { computed, purged, errors };
}
