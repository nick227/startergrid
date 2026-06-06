import {
  computeDaysOnline,
  deriveConfidence,
  deriveMovementSignal,
  isComparable,
  median,
  type Confidence,
  type MovementSignal,
} from './performanceMath.js';
import {
  aggregateChannelMetrics,
  type ChannelMetrics,
  type ChannelEventInput,
} from '../channel/channelMetrics.js';

export type { Confidence, MovementSignal, ChannelMetrics };

export type VehiclePerfInput = {
  id: string;
  stockNumber: string;
  make: string;
  model: string;
  year: number;
  priceCents: number;
  condition: string;
  createdAt: Date;
  soldAt: Date | null;
  removedAt: Date | null;
};

export type VehiclePerfRow = {
  vehicleId: string;
  stockNumber: string;
  make: string;
  model: string;
  year: number;
  priceCents: number;
  condition: string;
  daysOnline: number;
  firstListedAt: Date;
  comparableCount: number;
  avgComparableDays: number | null;
  medianComparableDays: number | null;
  benchmarkConfidence: Confidence;
  movementSignal: MovementSignal;
  platformAssistsJson: Record<string, { leads: number }>;
};

export type PlatformPerfRow = {
  platformSlug: string;
  vehiclesListed: number;
  vehiclesSold: number;
  avgDaysToMove: number | null;
  medianDaysToMove: number | null;
  totalLeads: number;
  leadsPerVehicle: number | null;
  confidence: Confidence;
  sampleSize: number;
  channelMetrics: ChannelMetrics;
};

export function aggregatePlatformAssists(
  leads: Array<{ vehicleId: string | null; platformSlug: string }>
): Map<string, Record<string, { leads: number }>> {
  const byVehicle = new Map<string, Record<string, { leads: number }>>();
  for (const lead of leads) {
    if (!lead.vehicleId) continue;
    const bucket = byVehicle.get(lead.vehicleId) ?? {};
    const entry = bucket[lead.platformSlug] ?? { leads: 0 };
    entry.leads += 1;
    bucket[lead.platformSlug] = entry;
    byVehicle.set(lead.vehicleId, bucket);
  }
  return byVehicle;
}

function soldComparables(vehicles: VehiclePerfInput[], target: VehiclePerfInput, now: Date): number[] {
  const days: number[] = [];
  for (const v of vehicles) {
    if (!v.soldAt) continue;
    if (!isComparable(target, v)) continue;
    days.push(computeDaysOnline(v.createdAt, v.soldAt, now));
  }
  return days;
}

export function buildVehiclePerformanceRows(
  vehicles: VehiclePerfInput[],
  leads: Array<{ vehicleId: string | null; platformSlug: string }>,
  now: Date = new Date()
): VehiclePerfRow[] {
  const assists = aggregatePlatformAssists(leads);
  const active = vehicles.filter(v => !v.soldAt && !v.removedAt);

  return active.map(vehicle => {
    const compDays = soldComparables(vehicles, vehicle, now);
    const comparableCount = compDays.length;
    const avgComparableDays = comparableCount > 0
      ? compDays.reduce((s, d) => s + d, 0) / comparableCount
      : null;
    const medianComparableDays = median(compDays);
    const daysOnline = computeDaysOnline(vehicle.createdAt, null, now);

    return {
      vehicleId: vehicle.id,
      stockNumber: vehicle.stockNumber,
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      priceCents: vehicle.priceCents,
      condition: vehicle.condition,
      daysOnline,
      firstListedAt: vehicle.createdAt,
      comparableCount,
      avgComparableDays,
      medianComparableDays,
      benchmarkConfidence: deriveConfidence(comparableCount),
      movementSignal: deriveMovementSignal(daysOnline, avgComparableDays, comparableCount),
      platformAssistsJson: assists.get(vehicle.id) ?? {},
    };
  });
}

// ── buildPlatformRowsFromEvents ───────────────────────────────────────────────
// Pure function used by platformAggregateJob.
// Builds per-platform performance rows using SUBMISSION_SENT SyncEvent records
// to discover which platforms vehicles were listed on, and from what date.
//
// Each vehicle's "listing start" on a platform is the first SUBMISSION_SENT
// event for that vehicle+platform pair. avgDaysToMove is then measured from
// that date to soldAt (not from createdAt), to credit the platform accurately.

export type SyncSubmissionEvent = {
  vehicleId: string | null;
  platformSlug: string | null;
  createdAt: Date;
};

export function buildPlatformRowsFromEvents(
  vehicles: VehiclePerfInput[],
  submissions: SyncSubmissionEvent[],
  leads: Array<{ platformSlug: string }>,
  channelEvents: ChannelEventInput[] = [],
  now: Date = new Date(),
): PlatformPerfRow[] {
  const vehicleById = new Map(vehicles.map(v => [v.id, v]));

  const platformVehicleFirst = new Map<string, Map<string, Date>>();
  for (const ev of submissions) {
    if (!ev.vehicleId || !ev.platformSlug) continue;
    const vehicleMap = platformVehicleFirst.get(ev.platformSlug) ?? new Map<string, Date>();
    if (!vehicleMap.has(ev.vehicleId)) {
      vehicleMap.set(ev.vehicleId, ev.createdAt);
    }
    platformVehicleFirst.set(ev.platformSlug, vehicleMap);
  }

  const leadCounts = new Map<string, number>();
  for (const lead of leads) {
    leadCounts.set(lead.platformSlug, (leadCounts.get(lead.platformSlug) ?? 0) + 1);
  }

  const eventsByPlatform = new Map<string, ChannelEventInput[]>();
  for (const ev of channelEvents) {
    const bucket = eventsByPlatform.get(ev.platformSlug) ?? [];
    bucket.push(ev);
    eventsByPlatform.set(ev.platformSlug, bucket);
  }

  const allSlugs = new Set<string>([
    ...platformVehicleFirst.keys(),
    ...eventsByPlatform.keys(),
  ]);

  const rows: PlatformPerfRow[] = [];

  for (const platformSlug of [...allSlugs].sort()) {
    const vehicleMap = platformVehicleFirst.get(platformSlug) ?? new Map<string, Date>();
    const listedIds = [...vehicleMap.keys()];
    let vehiclesListed = listedIds.length;

    if (vehiclesListed === 0) {
      const eventVehicleIds = new Set(
        (eventsByPlatform.get(platformSlug) ?? [])
          .map(e => e.vehicleId)
          .filter((id): id is string => Boolean(id)),
      );
      vehiclesListed = eventVehicleIds.size;
    }

    const daysToMove: number[] = [];
    let vehiclesSold = 0;

    for (const vehicleId of listedIds) {
      const vehicle = vehicleById.get(vehicleId);
      if (!vehicle?.soldAt) continue;
      vehiclesSold++;
      const firstSubmit = vehicleMap.get(vehicleId)!;
      daysToMove.push(computeDaysOnline(firstSubmit, vehicle.soldAt, now));
    }

    const totalLeads = leadCounts.get(platformSlug) ?? 0;
    const avgDaysToMove = daysToMove.length > 0
      ? daysToMove.reduce((s, d) => s + d, 0) / daysToMove.length
      : null;

    rows.push({
      platformSlug,
      vehiclesListed,
      vehiclesSold,
      avgDaysToMove,
      medianDaysToMove: median(daysToMove),
      totalLeads,
      leadsPerVehicle: vehiclesListed > 0 ? totalLeads / vehiclesListed : null,
      confidence: deriveConfidence(vehiclesSold),
      sampleSize: vehiclesSold,
      channelMetrics: aggregateChannelMetrics(eventsByPlatform.get(platformSlug) ?? []),
    });
  }

  return rows;
}

export function buildPlatformPerformanceRows(
  vehicles: VehiclePerfInput[],
  leads: Array<{ platformSlug: string }>,
  now: Date = new Date()
): PlatformPerfRow[] {
  const sold = vehicles.filter(v => v.soldAt);
  const listed = vehicles.filter(v => !v.soldAt && !v.removedAt);
  const soldDays = sold.map(v => computeDaysOnline(v.createdAt, v.soldAt, now));
  const confidence = deriveConfidence(sold.length);

  const leadCounts = new Map<string, number>();
  for (const lead of leads) {
    leadCounts.set(lead.platformSlug, (leadCounts.get(lead.platformSlug) ?? 0) + 1);
  }

  const slugs = new Set([
    'dealer-storefront',
    ...leads.map(l => l.platformSlug),
  ]);

  return [...slugs].sort().map(platformSlug => {
    const totalLeads = leadCounts.get(platformSlug) ?? 0;
    return {
      platformSlug,
      vehiclesListed: listed.length,
      vehiclesSold: sold.length,
      avgDaysToMove: soldDays.length > 0
        ? soldDays.reduce((s, d) => s + d, 0) / soldDays.length
        : null,
      medianDaysToMove: median(soldDays),
      totalLeads,
      leadsPerVehicle: listed.length > 0 ? totalLeads / listed.length : null,
      confidence,
      sampleSize: sold.length,
      channelMetrics: {},
    };
  });
}
