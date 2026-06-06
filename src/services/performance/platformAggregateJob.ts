import type { PrismaClient, Prisma } from '@prisma/client';
import {
  buildPlatformRowsFromEvents,
  type SyncSubmissionEvent,
  type VehiclePerfInput,
} from './performanceAggregator.js';
import { fetchChannelEventsForDealer } from '../channel/channelEventService.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PlatformJobResult = {
  platforms: number;
};

// ── Main job ──────────────────────────────────────────────────────────────────

// Computes PlatformPerformanceSummary rows for every platform that has at least
// one SUBMISSION_SENT SyncEvent for this dealer.
//
// avgDaysToMove is measured from first SUBMISSION_SENT to soldAt, not from
// vehicle.createdAt — this is the most honest attribution window.
//
// Idempotent: safe to rerun. Uses upsert; no deleteMany before write.
//
// Language contract: no ROI, no cost attribution, no "sold by" language.
// Confidence gates how results are labelled by callers.
export async function computePlatformPerformanceSummaries(
  prisma: PrismaClient,
  dealershipId: string,
  opts: { now?: Date } = {},
): Promise<PlatformJobResult> {
  const now = opts.now ?? new Date();

  // All vehicles (active + sold) so we can join on soldAt.
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

  // Only SUBMISSION_SENT events reveal which platforms a vehicle was listed on.
  // We fetch them ordered by createdAt so buildPlatformRowsFromEvents gets
  // the chronologically first submission per vehicle+platform pair.
  const submissionEvents = await prisma.syncEvent.findMany({
    where: {
      dealershipId,
      kind:         'SUBMISSION_SENT',
      vehicleId:    { not: null },
      platformSlug: { not: null },
    },
    select:  { vehicleId: true, platformSlug: true, createdAt: true },
    orderBy: { createdAt: 'asc' },
  });

  // All leads: used for leadsPerVehicle across the platform.
  const leads = await prisma.lead.findMany({
    where:  { dealershipId },
    select: { platformSlug: true },
  });

  const channelEvents = await fetchChannelEventsForDealer(prisma, dealershipId);

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

  const submissionInputs: SyncSubmissionEvent[] = submissionEvents.map(ev => ({
    vehicleId:    ev.vehicleId,
    platformSlug: ev.platformSlug,
    createdAt:    ev.createdAt,
  }));

  const rows = buildPlatformRowsFromEvents(
    vehicleInputs,
    submissionInputs,
    leads,
    channelEvents,
    now,
  );

  for (const row of rows) {
    await prisma.platformPerformanceSummary.upsert({
      where: { dealershipId_platformSlug: { dealershipId, platformSlug: row.platformSlug } },
      create: {
        dealershipId,
        platformSlug:    row.platformSlug,
        vehiclesListed:  row.vehiclesListed,
        vehiclesSold:    row.vehiclesSold,
        avgDaysToMove:   row.avgDaysToMove,
        medianDaysToMove: row.medianDaysToMove,
        totalLeads:      row.totalLeads,
        leadsPerVehicle: row.leadsPerVehicle,
        confidence:      row.confidence,
        sampleSize:      row.sampleSize,
        channelMetricsJson: row.channelMetrics as unknown as Prisma.InputJsonValue,
        computedAt:      now,
      },
      update: {
        vehiclesListed:  row.vehiclesListed,
        vehiclesSold:    row.vehiclesSold,
        avgDaysToMove:   row.avgDaysToMove,
        medianDaysToMove: row.medianDaysToMove,
        totalLeads:      row.totalLeads,
        leadsPerVehicle: row.leadsPerVehicle,
        confidence:      row.confidence,
        sampleSize:      row.sampleSize,
        channelMetricsJson: row.channelMetrics as unknown as Prisma.InputJsonValue,
        computedAt:      now,
      },
    });
  }

  return { platforms: rows.length };
}
