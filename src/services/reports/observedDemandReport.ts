import type { PrismaClient } from '@prisma/client';
import type { ReportTimeWindow } from './reportRange.js';
import { reportRangeWhere, toReportTimeWindowDto } from './reportRange.js';
import type { ObservedDemandAssetRow, ObservedDemandReport } from './reportTypes.js';

/** Channel events counted as observed demand (not impressions). */
const DEMAND_CHANNEL_EVENT_TYPES = [
  'INQUIRY_SUBMITTED',
  'REPORTED_CONTACT',
] as const;

const HIGH_AGE_DAYS = 21;
const HIGH_AGE_SIGNALS = new Set(['STALE', 'SLOW']);

type DemandBucket = {
  assetId: string;
  assetRef: string;
  leads: number;
  channelEvents: number;
  byChannel: Map<string, { leads: number; channelEvents: number }>;
};

function isHighAge(daysOnline: number | null, movementSignal: string | null): boolean {
  if (movementSignal && HIGH_AGE_SIGNALS.has(movementSignal)) return true;
  return daysOnline != null && daysOnline >= HIGH_AGE_DAYS;
}

export async function buildObservedDemandReport(
  prisma: PrismaClient,
  dealershipId: string,
  window: ReportTimeWindow,
  now: Date = new Date(),
): Promise<ObservedDemandReport> {
  const range = reportRangeWhere(window);

  const [leads, channelEvents, cacheRows, refByVehicleId] = await Promise.all([
    prisma.lead.findMany({
      where: { dealershipId, createdAt: range, vehicleId: { not: null } },
      select: { vehicleId: true, platformSlug: true },
    }),
    prisma.channelEvent.findMany({
      where: {
        dealershipId,
        occurredAt: range,
        vehicleId: { not: null },
        eventType: { in: [...DEMAND_CHANNEL_EVENT_TYPES] },
      },
      select: { vehicleId: true, platformSlug: true, quantity: true },
    }),
    prisma.vehiclePerformanceCache.findMany({
      where: { dealershipId },
      select: {
        vehicleId: true,
        stockNumber: true,
        daysOnline: true,
        movementSignal: true,
      },
    }),
    prisma.vehicle.findMany({
      where: { dealershipId, soldAt: null, removedAt: null },
      select: { id: true, stockNumber: true },
    }),
  ]);

  const refMap = new Map(refByVehicleId.map(v => [v.id, v.stockNumber]));
  const cacheMap = new Map(cacheRows.map(c => [c.vehicleId, c]));
  const buckets = new Map<string, DemandBucket>();

  const touch = (assetId: string): DemandBucket => {
    const existing = buckets.get(assetId);
    if (existing) return existing;
    const cache = cacheMap.get(assetId);
    const row: DemandBucket = {
      assetId,
      assetRef: cache?.stockNumber ?? refMap.get(assetId) ?? assetId,
      leads: 0,
      channelEvents: 0,
      byChannel: new Map(),
    };
    buckets.set(assetId, row);
    return row;
  };

  const touchChannel = (bucket: DemandBucket, channelSlug: string) => {
    const ch = bucket.byChannel.get(channelSlug) ?? { leads: 0, channelEvents: 0 };
    bucket.byChannel.set(channelSlug, ch);
    return ch;
  };

  for (const lead of leads) {
    if (!lead.vehicleId) continue;
    const bucket = touch(lead.vehicleId);
    bucket.leads += 1;
    touchChannel(bucket, lead.platformSlug).leads += 1;
  }

  for (const ev of channelEvents) {
    if (!ev.vehicleId) continue;
    const qty = ev.quantity;
    const bucket = touch(ev.vehicleId);
    bucket.channelEvents += qty;
    touchChannel(bucket, ev.platformSlug).channelEvents += qty;
  }

  const assets: ObservedDemandAssetRow[] = [...buckets.values()]
    .map(bucket => {
      const cache = cacheMap.get(bucket.assetId);
      const observedDemandCount = bucket.leads + bucket.channelEvents;
      return {
        assetId: bucket.assetId,
        assetRef: bucket.assetRef,
        daysOnline: cache?.daysOnline ?? null,
        movementSignal: cache?.movementSignal ?? null,
        observedDemandCount,
        observedLeads: bucket.leads,
        observedChannelEvents: bucket.channelEvents,
        byChannel: [...bucket.byChannel.entries()]
          .map(([channelSlug, counts]) => ({
            channelSlug,
            observedLeads: counts.leads,
            observedChannelEvents: counts.channelEvents,
          }))
          .sort(
            (a, b) =>
              b.observedLeads + b.observedChannelEvents - (a.observedLeads + a.observedChannelEvents),
          ),
      };
    })
    .sort(
      (a, b) => b.observedDemandCount - a.observedDemandCount || a.assetRef.localeCompare(b.assetRef),
    );

  const assetsWithObservedDemand = assets.filter(a => a.observedDemandCount > 0).length;
  const totalObservedDemand = assets.reduce((n, a) => n + a.observedDemandCount, 0);

  const highAgeZeroDemandCount = cacheRows.filter(cache => {
    const demand = buckets.get(cache.vehicleId);
    const demandCount = demand ? demand.leads + demand.channelEvents : 0;
    return demandCount === 0 && isHighAge(cache.daysOnline, cache.movementSignal);
  }).length;

  return {
    meta: {
      dealershipId,
      generatedAt: now.toISOString(),
      range: toReportTimeWindowDto(window),
    },
    summary: {
      assetsWithObservedDemand,
      totalObservedDemand,
      highAgeZeroDemandCount,
    },
    assets,
  };
}
