import type { Prisma, PrismaClient } from '@prisma/client';
import type { ChannelEventInput } from './channelMetrics.js';
import { MARKETPLACE_PLATFORM_SLUG } from './channelMetrics.js';

export { MARKETPLACE_PLATFORM_SLUG };

export type RecordChannelEventInput = {
  dealershipId:     string;
  platformSlug:     string;
  eventType:        Prisma.ChannelEventCreateInput['eventType'];
  sourceConfidence: Prisma.ChannelEventCreateInput['sourceConfidence'];
  vehicleId?:       string | null;
  listingId?:       string | null;
  quantity?:        number;
  metadataJson?:    Record<string, unknown> | null;
  occurredAt?:      Date;
};

export async function recordChannelEvent(
  prisma: PrismaClient,
  input: RecordChannelEventInput,
): Promise<string> {
  const row = await prisma.channelEvent.create({
    data: {
      dealershipId:     input.dealershipId,
      platformSlug:       input.platformSlug,
      vehicleId:          input.vehicleId ?? null,
      listingId:          input.listingId ?? null,
      eventType:          input.eventType,
      sourceConfidence:   input.sourceConfidence,
      quantity:           input.quantity ?? 1,
      metadataJson:       input.metadataJson != null
        ? (input.metadataJson as Prisma.InputJsonValue)
        : undefined,
      occurredAt:         input.occurredAt ?? new Date(),
    },
    select: { id: true },
  });
  return row.id;
}

export async function recordMarketplaceChannelEvent(
  prisma: PrismaClient,
  input: {
    eventType:   Prisma.ChannelEventCreateInput['eventType'];
    listingId?:  string | null;
    dealerId?:   string | null;
    quantity?:   number;
    category?:   string | null;
  },
): Promise<{ eventId: string } | null> {
  let vehicleId: string | null = null;
  let dealershipId: string | null = input.dealerId ?? null;
  const listingId: string | null = input.listingId ?? null;

  if (listingId) {
    const vehicle = await prisma.vehicle.findFirst({
      where:  { id: listingId, soldAt: null, removedAt: null, priceCents: { gt: 0 } },
      select: { id: true, dealershipId: true, dealership: { select: { businessCategory: true } } },
    });
    if (!vehicle) return null;
    if (input.category && vehicle.dealership.businessCategory !== input.category) return null;
    vehicleId = vehicle.id;
    dealershipId = vehicle.dealershipId;
  } else if (dealershipId) {
    const dealer = await prisma.dealershipProfile.findUnique({
      where:  { id: dealershipId },
      select: { id: true, businessCategory: true },
    });
    if (!dealer) return null;
    if (input.category && dealer.businessCategory !== input.category) return null;
  }

  if (!dealershipId) return null;

  const eventId = await recordChannelEvent(prisma, {
    dealershipId,
    platformSlug: MARKETPLACE_PLATFORM_SLUG,
    eventType: input.eventType,
    sourceConfidence: 'OBSERVED_FIRST_PARTY',
    vehicleId,
    listingId,
    quantity: input.quantity,
    metadataJson: input.category ? { businessCategory: input.category } : null,
  });

  return { eventId };
}

export function recordMarketplaceChannelEventAsync(
  prisma: PrismaClient,
  input: Parameters<typeof recordMarketplaceChannelEvent>[1],
): void {
  void recordMarketplaceChannelEvent(prisma, input).catch(() => {
    // Measurement must not block browse paths.
  });
}

export async function fetchChannelEventsForDealer(
  prisma: PrismaClient,
  dealershipId: string,
): Promise<ChannelEventInput[]> {
  const rows = await prisma.channelEvent.findMany({
    where: { dealershipId },
    select: {
      platformSlug:     true,
      eventType:        true,
      sourceConfidence: true,
      quantity:         true,
      vehicleId:        true,
    },
  });
  return rows.map(r => ({
    platformSlug:     r.platformSlug,
    eventType:        r.eventType,
    sourceConfidence: r.sourceConfidence,
    quantity:         r.quantity,
    vehicleId:        r.vehicleId,
  }));
}

// ── Channel activity summary ──────────────────────────────────────────────────
// Aggregate-only summary of observed marketplace activity and reported platform
// activity. Contains no buyer PII, no vehicle VINs, and no operator internals.
// Used in dealer:export and proof manifests to document channel engagement.

export type ChannelActivitySummary = {
  total:              number;            // sum of all event quantities
  byPlatform:         Record<string, number>;
  byEventType:        Record<string, number>;
  bySourceConfidence: Record<string, number>;
  latestOccurredAt:   string | null;     // ISO 8601; null if no events
};

export async function buildChannelActivitySummary(
  prisma:       PrismaClient,
  dealershipId: string,
): Promise<ChannelActivitySummary> {
  const [byPlatform, byEventType, byConfidence, latest] = await Promise.all([
    prisma.channelEvent.groupBy({
      by:    ['platformSlug'],
      where: { dealershipId },
      _sum:  { quantity: true },
    }),
    prisma.channelEvent.groupBy({
      by:    ['eventType'],
      where: { dealershipId },
      _sum:  { quantity: true },
    }),
    prisma.channelEvent.groupBy({
      by:    ['sourceConfidence'],
      where: { dealershipId },
      _sum:  { quantity: true },
    }),
    prisma.channelEvent.findFirst({
      where:   { dealershipId },
      orderBy: { occurredAt: 'desc' },
      select:  { occurredAt: true },
    }),
  ]);

  const toRecord = <T extends { _sum: { quantity: number | null } }>(
    rows: T[],
    key: (r: T) => string,
  ): Record<string, number> =>
    Object.fromEntries(rows.map(r => [key(r), r._sum.quantity ?? 0]));

  const platformMap = toRecord(byPlatform, r => r.platformSlug);
  const total = Object.values(platformMap).reduce((s, n) => s + n, 0);

  return {
    total,
    byPlatform:         platformMap,
    byEventType:        toRecord(byEventType, r => r.eventType as string),
    bySourceConfidence: toRecord(byConfidence, r => r.sourceConfidence as string),
    latestOccurredAt:   latest?.occurredAt.toISOString() ?? null,
  };
}

export type MarketplaceDealerStats = {
  dealerId:           string;
  vehicleDetailViews: number;
  dealerPageViews:    number;
  inquirySubmissions: number;
};

export async function getDealerMarketplaceStats(
  prisma: PrismaClient,
  dealerId: string,
): Promise<MarketplaceDealerStats | null> {
  const dealer = await prisma.dealershipProfile.findUnique({
    where:  { id: dealerId },
    select: { id: true },
  });
  if (!dealer) return null;

  const rows = await prisma.channelEvent.groupBy({
    by:    ['eventType'],
    where: {
      dealershipId:     dealerId,
      platformSlug:     MARKETPLACE_PLATFORM_SLUG,
      sourceConfidence: 'OBSERVED_FIRST_PARTY',
    },
    _sum: { quantity: true },
  });

  const totals: Record<string, number> = {};
  for (const row of rows) totals[row.eventType] = row._sum.quantity ?? 0;

  return {
    dealerId,
    vehicleDetailViews: totals['VEHICLE_DETAIL_VIEW'] ?? 0,
    dealerPageViews:    totals['DEALER_PAGE_VIEW'] ?? 0,
    inquirySubmissions: totals['INQUIRY_SUBMITTED'] ?? 0,
  };
}
