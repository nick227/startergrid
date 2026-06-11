import type { PrismaClient } from '@prisma/client';

export type InventoryDistributionSummary = {
  liveCount: number;
  queuedCount: number;
  failedCount: number;
  blockedCount: number;
  totalEligiblePlatforms: number;
  lastSyncAt: string | null;
  /** Highest-priority recommended action for this item's distribution state. */
  nextAction: string | null;
  /** Route href for the nextAction CTA, if resolvable. */
  nextActionHref: string | null;
};

const LIVE_QUEUE_STATUSES = ['SENT'] as const;
const QUEUED_STATUSES = ['READY', 'NEEDS_APPROVAL', 'SCHEDULED', 'CLAIMED'] as const;
const FAILED_STATUSES = ['FAILED'] as const;
const HELD_STATUSES = ['HELD', 'BLOCKED', 'CANCELLED'] as const;

const PLATFORM_BLOCKED_STATES = ['CREDENTIALS_NEEDED', 'BLOCKED', 'SUSPENDED', 'FAILED'] as const;

type BlockedState = typeof PLATFORM_BLOCKED_STATES[number];

function isBlockedState(s: string): s is BlockedState {
  return (PLATFORM_BLOCKED_STATES as readonly string[]).includes(s);
}

export async function buildDistributionSummary(
  prisma: PrismaClient,
  dealershipId: string,
  vehicleId: string,
): Promise<InventoryDistributionSummary> {
  const [queueItems, platformAccounts, marketplaceListings, socialPosts, latestSync] =
    await Promise.all([
      prisma.publishQueueItem.findMany({
        where: { dealershipId, vehicleId },
        select: { status: true, platformSlug: true, failureReason: true },
      }),
      prisma.platformAccount.findMany({
        where: { dealershipId },
        select: { platformSlug: true, state: true },
      }),
      prisma.marketplaceListing.findMany({
        where: { dealershipId, vehicleId },
        select: { platformSlug: true, status: true },
      }),
      prisma.socialPost.findMany({
        where: { dealershipId, vehicleId },
        select: { platformSlug: true, status: true },
      }),
      prisma.syncEvent.findFirst({
        where: { dealershipId, vehicleId },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, kind: true },
      }),
    ]);

  // Count queue states
  const queuedCount = queueItems.filter(
    q => (QUEUED_STATUSES as readonly string[]).includes(q.status)
  ).length;
  const failedCount = queueItems.filter(
    q => (FAILED_STATUSES as readonly string[]).includes(q.status)
  ).length;

  // Live evidence: active marketplace listings + recent social posts + SENT queue items
  const liveListings = new Set<string>();
  for (const l of marketplaceListings) {
    if (l.status === 'ACTIVE') liveListings.add(l.platformSlug);
  }
  for (const p of socialPosts) {
    if (p.status === 'PUBLISHED') liveListings.add(p.platformSlug);
  }
  for (const q of queueItems) {
    if ((LIVE_QUEUE_STATUSES as readonly string[]).includes(q.status)) liveListings.add(q.platformSlug);
  }
  const liveCount = liveListings.size;

  // Blocked = platform accounts with bad credential/state
  const blockedCount = platformAccounts.filter(a => isBlockedState(a.state)).length;

  const totalEligiblePlatforms = platformAccounts.length;
  const lastSyncAt = latestSync?.createdAt?.toISOString() ?? null;

  // Determine nextAction with priority: failed > blocked > queued > live (stale)
  let nextAction: string | null = null;
  let nextActionHref: string | null = null;

  if (failedCount > 0) {
    nextAction = `${failedCount} platform${failedCount > 1 ? 's' : ''} failed — review errors`;
  } else if (blockedCount > 0) {
    nextAction = `${blockedCount} platform${blockedCount > 1 ? 's' : ''} need${blockedCount === 1 ? 's' : ''} credentials`;
  } else if (queuedCount > 0) {
    nextAction = `${queuedCount} update${queuedCount > 1 ? 's' : ''} pending`;
  } else if (liveCount === 0 && totalEligiblePlatforms > 0) {
    nextAction = 'Not yet live on any channel';
  }

  return {
    liveCount,
    queuedCount,
    failedCount,
    blockedCount,
    totalEligiblePlatforms,
    lastSyncAt,
    nextAction,
    nextActionHref,
  };
}

/** Batch loader — fetches distribution summaries for multiple vehicles without N+1 queries. */
export async function buildDistributionSummaryBatch(
  prisma: PrismaClient,
  dealershipId: string,
  vehicleIds: string[],
): Promise<Map<string, InventoryDistributionSummary>> {
  if (vehicleIds.length === 0) return new Map();

  const [queueItems, platformAccounts, marketplaceListings, socialPosts, syncEvents] =
    await Promise.all([
      prisma.publishQueueItem.findMany({
        where: { dealershipId, vehicleId: { in: vehicleIds } },
        select: { vehicleId: true, status: true, platformSlug: true },
      }),
      prisma.platformAccount.findMany({
        where: { dealershipId },
        select: { platformSlug: true, state: true },
      }),
      prisma.marketplaceListing.findMany({
        where: { dealershipId, vehicleId: { in: vehicleIds } },
        select: { vehicleId: true, platformSlug: true, status: true },
      }),
      prisma.socialPost.findMany({
        where: { dealershipId, vehicleId: { in: vehicleIds } },
        select: { vehicleId: true, platformSlug: true, status: true },
      }),
      // Latest sync per vehicle — get all, group in memory
      prisma.syncEvent.findMany({
        where: { dealershipId, vehicleId: { in: vehicleIds } },
        orderBy: { createdAt: 'desc' },
        select: { vehicleId: true, createdAt: true },
        take: vehicleIds.length * 3, // reasonable upper bound per vehicle
      }),
    ]);

  const blockedPlatformCount = platformAccounts.filter(a => isBlockedState(a.state)).length;
  const totalEligible = platformAccounts.length;

  // Group by vehicleId
  const queueByVehicle = new Map<string, typeof queueItems>();
  for (const q of queueItems) {
    if (!q.vehicleId) continue;
    if (!queueByVehicle.has(q.vehicleId)) queueByVehicle.set(q.vehicleId, []);
    queueByVehicle.get(q.vehicleId)!.push(q);
  }

  const listingsByVehicle = new Map<string, typeof marketplaceListings>();
  for (const l of marketplaceListings) {
    if (!l.vehicleId) continue;
    if (!listingsByVehicle.has(l.vehicleId)) listingsByVehicle.set(l.vehicleId, []);
    listingsByVehicle.get(l.vehicleId)!.push(l);
  }

  const postsByVehicle = new Map<string, typeof socialPosts>();
  for (const p of socialPosts) {
    if (!p.vehicleId) continue;
    if (!postsByVehicle.has(p.vehicleId)) postsByVehicle.set(p.vehicleId, []);
    postsByVehicle.get(p.vehicleId)!.push(p);
  }

  const latestSyncByVehicle = new Map<string, Date>();
  for (const e of syncEvents) {
    if (!e.vehicleId) continue;
    if (!latestSyncByVehicle.has(e.vehicleId)) {
      latestSyncByVehicle.set(e.vehicleId, e.createdAt);
    }
  }

  const result = new Map<string, InventoryDistributionSummary>();

  for (const vehicleId of vehicleIds) {
    const vQueue = queueByVehicle.get(vehicleId) ?? [];
    const vListings = listingsByVehicle.get(vehicleId) ?? [];
    const vPosts = postsByVehicle.get(vehicleId) ?? [];

    const queuedCount = vQueue.filter(q => (QUEUED_STATUSES as readonly string[]).includes(q.status)).length;
    const failedCount = vQueue.filter(q => (FAILED_STATUSES as readonly string[]).includes(q.status)).length;

    const liveSet = new Set<string>();
    for (const l of vListings) {
      if (l.status === 'ACTIVE') liveSet.add(l.platformSlug);
    }
    for (const p of vPosts) {
      if (p.status === 'PUBLISHED') liveSet.add(p.platformSlug);
    }
    for (const q of vQueue) {
      if ((LIVE_QUEUE_STATUSES as readonly string[]).includes(q.status)) liveSet.add(q.platformSlug);
    }

    const liveCount = liveSet.size;
    const lastSync = latestSyncByVehicle.get(vehicleId);

    let nextAction: string | null = null;
    if (failedCount > 0) nextAction = `${failedCount} failed`;
    else if (blockedPlatformCount > 0) nextAction = `${blockedPlatformCount} need credentials`;
    else if (queuedCount > 0) nextAction = `${queuedCount} pending`;
    else if (liveCount === 0 && totalEligible > 0) nextAction = 'Not yet live';

    result.set(vehicleId, {
      liveCount, queuedCount, failedCount,
      blockedCount: blockedPlatformCount,
      totalEligiblePlatforms: totalEligible,
      lastSyncAt: lastSync?.toISOString() ?? null,
      nextAction,
      nextActionHref: null,
    });
  }

  return result;
}
