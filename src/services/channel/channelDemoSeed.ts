import type { PrismaClient } from '@prisma/client';
import { recordChannelEvent, MARKETPLACE_PLATFORM_SLUG } from './channelEventService.js';
import { runPerformanceComputeForDealer } from '../performance/computePerformanceService.js';

const DEMO_MARKER = { channelDemoSeed: true } as const;

/** Demo first-party marketplace events + one partner-reported click row for mixed-confidence UI. */
export async function seedChannelMetricsDemo(
  prisma: PrismaClient,
  dealershipId: string,
  opts: { now?: Date; skipCompute?: boolean } = {},
): Promise<void> {
  const existing = await prisma.channelEvent.findFirst({
    where: {
      dealershipId,
      metadataJson: { path: ['channelDemoSeed'], equals: true },
    },
    select: { id: true },
  });
  if (existing) return;

  const activeVehicles = await prisma.vehicle.findMany({
    where: { dealershipId, soldAt: null, removedAt: null },
    select: { id: true, stockNumber: true },
    orderBy: { stockNumber: 'asc' },
    take: 3,
  });

  const impressionQty = [420, 380, 440];
  const detailQty = [28, 24, 34];
  const inquiryQty = [4, 3, 5];

  for (let i = 0; i < activeVehicles.length; i++) {
    const vehicle = activeVehicles[i]!;
    await recordChannelEvent(prisma, {
      dealershipId,
      platformSlug: MARKETPLACE_PLATFORM_SLUG,
      eventType: 'VEHICLE_IMPRESSION',
      sourceConfidence: 'OBSERVED_FIRST_PARTY',
      vehicleId: vehicle.id,
      listingId: vehicle.id,
      quantity: impressionQty[i] ?? 400,
      metadataJson: DEMO_MARKER,
    });
    await recordChannelEvent(prisma, {
      dealershipId,
      platformSlug: MARKETPLACE_PLATFORM_SLUG,
      eventType: 'VEHICLE_DETAIL_VIEW',
      sourceConfidence: 'OBSERVED_FIRST_PARTY',
      vehicleId: vehicle.id,
      listingId: vehicle.id,
      quantity: detailQty[i] ?? 30,
      metadataJson: DEMO_MARKER,
    });
    await recordChannelEvent(prisma, {
      dealershipId,
      platformSlug: MARKETPLACE_PLATFORM_SLUG,
      eventType: 'INQUIRY_SUBMITTED',
      sourceConfidence: 'OBSERVED_FIRST_PARTY',
      vehicleId: vehicle.id,
      listingId: vehicle.id,
      quantity: inquiryQty[i] ?? 3,
      metadataJson: DEMO_MARKER,
    });
  }

  await recordChannelEvent(prisma, {
    dealershipId,
    platformSlug: MARKETPLACE_PLATFORM_SLUG,
    eventType: 'DEALER_PAGE_VIEW',
    sourceConfidence: 'OBSERVED_FIRST_PARTY',
    quantity: 52,
    metadataJson: DEMO_MARKER,
  });

  await recordChannelEvent(prisma, {
    dealershipId,
    platformSlug: 'cargurus-dealer',
    eventType: 'REPORTED_CLICK',
    sourceConfidence: 'PLATFORM_REPORTED',
    quantity: 318,
    metadataJson: DEMO_MARKER,
  });

  if (!opts.skipCompute) {
    await runPerformanceComputeForDealer(prisma, dealershipId, { now: opts.now });
  }
}
