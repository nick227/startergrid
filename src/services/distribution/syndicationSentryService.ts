import type { PrismaClient } from '@prisma/client';
import { autopilotEnabled, OWNED_CHANNEL, reconcileDealer } from '../autopilot/service.js';
import { getMarketplaceVehicle } from '../marketplace/marketplaceQueryService.js';
import { evidenceStatus } from '../autopilot/decisions.js';
import type { PublicationEvidence } from '../autopilot/contracts.js';

/**
 * Canonical take-down state for one listing, derived only from recorded evidence.
 * Only VERIFIED_REMOVED means the vehicle is confirmed gone; every other value is either
 * StarterGrid-internal (NOT_REQUESTED, QUEUED_LOCALLY), unconfirmed (SUBMISSION_ATTEMPTED,
 * PROVIDER_ACCEPTED), or needs a person (FAILED, UNSUPPORTED).
 */
export type RemovalStatus =
  /** StarterGrid has not started a take-down for this listing. */
  | 'NOT_REQUESTED'
  /** A withdrawal is recorded in StarterGrid; nothing has been sent to the destination. */
  | 'QUEUED_LOCALLY'
  /** StarterGrid sent a removal to the destination; no destination response is recorded. */
  | 'SUBMISSION_ATTEMPTED'
  /** The destination acknowledged the request with a reference; removal is not yet observed. */
  | 'PROVIDER_ACCEPTED'
  /** A readback of the destination confirmed the vehicle is no longer public. */
  | 'VERIFIED_REMOVED'
  /** The removal failed, or its outcome could not be confirmed. */
  | 'FAILED'
  /** StarterGrid cannot remove listings on this destination; a person must end it there. */
  | 'UNSUPPORTED';

export const REMOVAL_STATUSES: readonly RemovalStatus[] = [
  'NOT_REQUESTED', 'QUEUED_LOCALLY', 'SUBMISSION_ATTEMPTED', 'PROVIDER_ACCEPTED', 'VERIFIED_REMOVED', 'FAILED', 'UNSUPPORTED',
];

type TargetRow = {
  vehicleId: string;
  channel: string;
  desiredHash?: string | null;
  operation: string;
  status: string;
  reasonCode?: string | null;
  submittedAt?: Date | null;
  evidence?: unknown;
};

/**
 * Maps a distribution target to its removal state. Returns null for a withdrawal the engine
 * excluded because StarterGrid never published the vehicle there (nothing to take down).
 */
export function targetRemovalStatus(row: TargetRow): RemovalStatus | null {
  if (row.operation !== 'WITHDRAW') return 'NOT_REQUESTED';
  const evidence = (row.evidence ?? null) as PublicationEvidence | null;
  switch (row.status) {
    case 'EXCLUDED':
      return null;
    case 'VERIFIED_REMOVED':
      // Removal evidence does not expire, but it must match this vehicle, channel and withdrawal.
      return evidenceStatus(evidence, {
        channel: row.channel, vehicleId: row.vehicleId, desiredHash: row.desiredHash ?? '', operation: 'WITHDRAW',
      }, new Date(), Number.POSITIVE_INFINITY) === 'VERIFIED_REMOVED' ? 'VERIFIED_REMOVED' : 'FAILED';
    case 'SUBMITTED':
      if (evidence?.reference && evidence.result === 'PENDING') return 'PROVIDER_ACCEPTED';
      return row.submittedAt ? 'SUBMISSION_ATTEMPTED' : 'QUEUED_LOCALLY';
    case 'PROCESSING':
    case 'HELD':
    case 'PAUSED':
      return 'QUEUED_LOCALLY';
    case 'NEEDS_SETUP':
      return row.reasonCode === 'CHANNEL_UNQUALIFIED' ? 'UNSUPPORTED' : 'FAILED';
    default:
      return 'FAILED';
  }
}

export interface GhostListingItem {
  id: string;
  source: 'MARKETPLACE_LISTING' | 'DISTRIBUTION_TARGET';
  dealershipId: string;
  vehicleId: string | null;
  categoryItemId: string | null;
  stockNumber: string;
  title: string;
  vin?: string;
  channel: string;
  channelDisplayName: string;
  status: string;
  soldAt: string | null;
  removedAt: string | null;
  inactiveSince: string;
  exposureDays: number;
  ftcComplianceRisk: 'HIGH' | 'CRITICAL';
  /** Evidence-based take-down state. Only VERIFIED_REMOVED means confirmed gone. */
  removalStatus: RemovalStatus;
  /** When StarterGrid last sent something to the destination, if it ever did. */
  submittedAt: string | null;
  /** Destination reference recorded with the latest evidence, if any. */
  providerReference: string | null;
  /** What actually removes it. External destinations are never marked removed without evidence. */
  nextAction: string;
}

export interface SyndicationSentryAuditResult {
  dealershipId: string;
  status: 'CLEAN' | 'GHOST_LISTINGS_DETECTED';
  auditedCount: number;
  activeGhostListingsCount: number;
  verifiedLiveCount: number;
  channelsAudited: string[];
  lastAuditedAt: string;
  ghostListings: GhostListingItem[];
  summary: string;
}

export interface SyndicationSentryReconcileResult {
  dealershipId: string;
  /**
   * RECONCILED: every listing found is VERIFIED_REMOVED (or StarterGrid never published it).
   * NEEDS_ACTION: at least one listing is not confirmed removed; see removalCounts and remaining.
   */
  status: 'RECONCILED' | 'CLEAN' | 'NEEDS_ACTION';
  /** Listings confirmed removed during this run (VERIFIED_REMOVED only). */
  reconciledCount: number;
  /** Auto Marketplace rows ended after reading back that the vehicle is no longer public. */
  marketplaceListingsEnded: number;
  /** Distribution targets that reached VERIFIED_REMOVED during this run. */
  distributionTargetsWithdrawn: number;
  /** Final removal state of every listing found at the start of the run. */
  removalCounts: Record<RemovalStatus, number>;
  /** Found listings that turned out to have no StarterGrid-published listing to remove. */
  notPublishedCount: number;
  remaining: GhostListingItem[];
  message: string;
  reconciledAt: string;
}

const PLATFORM_NAMES: Record<string, string> = {
  auto_marketplace: 'Auto Marketplace',
  'auto-marketplace': 'Auto Marketplace',
  ebay: 'eBay Motors',
  'google-vehicle-ads': 'Google Vehicle Ads',
  'meta-automotive-inventory-ads': 'Meta Automotive Ads',
  craigslist: 'Craigslist',
  tiktok: 'TikTok Shop',
  pinterest: 'Pinterest Catalog',
  snapchat: 'Snapchat Catalog',
  reddit: 'Reddit Catalog',
  x: 'X Catalog',
  nextdoor: 'Nextdoor Catalog',
  storefront: 'Dealer Storefront',
};

export function formatChannelName(slug: string): string {
  if (PLATFORM_NAMES[slug]) return PLATFORM_NAMES[slug];
  return slug
    .split(/[-_]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function auditDealershipSyndication(
  db: PrismaClient,
  dealershipId: string,
): Promise<SyndicationSentryAuditResult> {
  const now = new Date();

  // Find all sold or removed vehicles
  const soldOrRemovedVehicles = await db.vehicle.findMany({
    where: {
      dealershipId,
      OR: [
        { soldAt: { not: null } },
        { removedAt: { not: null } },
      ],
    },
    select: {
      id: true,
      stockNumber: true,
      year: true,
      make: true,
      model: true,
      vin: true,
      soldAt: true,
      removedAt: true,
    },
  });

  // Find all sold or removed category items
  const soldOrRemovedCategoryItems = await db.categoryInventoryItem.findMany({
    where: {
      dealershipId,
      OR: [
        { soldAt: { not: null } },
        { removedAt: { not: null } },
      ],
    },
    select: {
      id: true,
      stockNumber: true,
      primaryIdentifier: true,
      soldAt: true,
      removedAt: true,
    },
  });

  const auditedCount = soldOrRemovedVehicles.length + soldOrRemovedCategoryItems.length;
  const vehicleMap = new Map(soldOrRemovedVehicles.map(v => [v.id, v]));
  const itemMap = new Map(soldOrRemovedCategoryItems.map(i => [i.id, i]));

  const vehicleIds = soldOrRemovedVehicles.map(v => v.id);
  const itemIds = soldOrRemovedCategoryItems.map(i => i.id);

  // Check verified live distribution count for dealership
  const verifiedLiveCount = await db.distributionTarget.count({
    where: {
      dealershipId,
      status: 'VERIFIED_LIVE',
    },
  });

  // Check distinct channels from accounts and distribution targets
  const [distinctTargets, accounts] = await Promise.all([
    db.distributionTarget.findMany({
      where: { dealershipId },
      select: { channel: true },
      distinct: ['channel'],
    }),
    db.platformAccount.findMany({
      where: { dealershipId },
      select: { platformSlug: true },
    }),
  ]);

  const channelSet = new Set<string>();
  for (const t of distinctTargets) channelSet.add(t.channel);
  for (const a of accounts) channelSet.add(a.platformSlug);
  if (channelSet.size === 0) {
    channelSet.add('auto_marketplace');
  }

  const ghostListings: GhostListingItem[] = [];

  if (vehicleIds.length > 0 || itemIds.length > 0) {
    // 1. Check MarketplaceListing where status is ACTIVE
    const orFilters: Array<{ vehicleId?: { in: string[] }; categoryItemId?: { in: string[] } }> = [];
    if (vehicleIds.length > 0) orFilters.push({ vehicleId: { in: vehicleIds } });
    if (itemIds.length > 0) orFilters.push({ categoryItemId: { in: itemIds } });

    const activeMarketplaceListings = await db.marketplaceListing.findMany({
      where: {
        dealershipId,
        status: 'ACTIVE',
        OR: orFilters,
      },
    });

    for (const listing of activeMarketplaceListings) {
      const v = listing.vehicleId ? vehicleMap.get(listing.vehicleId) : null;
      const it = listing.categoryItemId ? itemMap.get(listing.categoryItemId) : null;

      const inactiveDate = v ? (v.soldAt ?? v.removedAt) : it ? (it.soldAt ?? it.removedAt) : null;
      const inactiveSince = (inactiveDate ?? now).toISOString();
      const exposureDays = Math.max(1, Math.floor((now.getTime() - new Date(inactiveSince).getTime()) / (1000 * 60 * 60 * 24)));

      ghostListings.push({
        id: listing.id,
        source: 'MARKETPLACE_LISTING',
        dealershipId,
        vehicleId: listing.vehicleId,
        categoryItemId: listing.categoryItemId,
        stockNumber: v?.stockNumber ?? it?.stockNumber ?? 'N/A',
        title: v ? `${v.year} ${v.make} ${v.model}` : (it?.primaryIdentifier ?? 'Category Item'),
        vin: v?.vin,
        channel: listing.platformSlug,
        channelDisplayName: formatChannelName(listing.platformSlug),
        status: listing.status,
        soldAt: (v?.soldAt ?? it?.soldAt)?.toISOString() ?? null,
        removedAt: (v?.removedAt ?? it?.removedAt)?.toISOString() ?? null,
        inactiveSince,
        exposureDays,
        ftcComplianceRisk: exposureDays >= 3 ? 'CRITICAL' : 'HIGH',
        // An ACTIVE row is a ghost; StarterGrid can only take down its own marketplace.
        removalStatus: listing.platformSlug === OWNED_CHANNEL ? 'NOT_REQUESTED' : 'UNSUPPORTED',
        submittedAt: null,
        providerReference: null,
        nextAction: listing.platformSlug === OWNED_CHANNEL
          ? 'Take down now ends it on Auto Marketplace after confirming it is no longer public.'
          : `End the listing on ${formatChannelName(listing.platformSlug)}. StarterGrid cannot confirm removal there.`,
      });
    }

    // 2. Check DistributionTarget where operation != WITHDRAW or status indicates active presence
    if (vehicleIds.length > 0) {
      // Every target for sold stock is a ghost until its removal is verified. Filtering by
      // status here once let NEEDS_SETUP/FAILED/SUBMITTED withdrawals count as removed.
      const soldTargets = await db.distributionTarget.findMany({
        where: { dealershipId, vehicleId: { in: vehicleIds } },
      });

      for (const target of soldTargets) {
        const removalStatus = targetRemovalStatus(target);
        if (removalStatus === null || removalStatus === 'VERIFIED_REMOVED') continue;

        // Skip if already captured by active marketplace listing for the same vehicle & channel
        const alreadyFound = ghostListings.some(
          g => g.vehicleId === target.vehicleId && g.channel === target.channel
        );
        if (alreadyFound) continue;

        const v = vehicleMap.get(target.vehicleId);
        const inactiveDate = v ? (v.soldAt ?? v.removedAt) : null;
        const inactiveSince = (inactiveDate ?? now).toISOString();
        const exposureDays = Math.max(1, Math.floor((now.getTime() - new Date(inactiveSince).getTime()) / (1000 * 60 * 60 * 24)));

        ghostListings.push({
          id: target.id,
          source: 'DISTRIBUTION_TARGET',
          dealershipId,
          vehicleId: target.vehicleId,
          categoryItemId: null,
          stockNumber: v?.stockNumber ?? 'N/A',
          title: v ? `${v.year} ${v.make} ${v.model}` : 'Vehicle',
          vin: v?.vin,
          channel: target.channel,
          channelDisplayName: formatChannelName(target.channel),
          status: target.status,
          soldAt: v?.soldAt?.toISOString() ?? null,
          removedAt: v?.removedAt?.toISOString() ?? null,
          inactiveSince,
          exposureDays,
          ftcComplianceRisk: exposureDays >= 3 ? 'CRITICAL' : 'HIGH',
          removalStatus,
          submittedAt: target.submittedAt?.toISOString() ?? null,
          providerReference: (target.evidence as PublicationEvidence | null)?.reference ?? null,
          nextAction: target.nextAction ?? 'Waiting for Autopilot to withdraw and verify removal.',
        });
      }
    }
  }

  // Sort by exposureDays desc (most urgent first)
  ghostListings.sort((a, b) => b.exposureDays - a.exposureDays);

  const isClean = ghostListings.length === 0;

  return {
    dealershipId,
    status: isClean ? 'CLEAN' : 'GHOST_LISTINGS_DETECTED',
    auditedCount,
    activeGhostListingsCount: ghostListings.length,
    verifiedLiveCount,
    channelsAudited: Array.from(channelSet),
    lastAuditedAt: now.toISOString(),
    ghostListings,
    // This audit reads StarterGrid's own listing and distribution records; it does not
    // query external sites, so "clean" means no record still shows them as listed.
    summary: isClean
      ? 'No StarterGrid record shows a sold or removed vehicle as still listed.'
      : `${ghostListings.length} listing${ghostListings.length === 1 ? '' : 's'} for sold or removed vehicles ${ghostListings.length === 1 ? 'is' : 'are'} still active in StarterGrid's records.`,
  };
}

/**
 * Takes down what StarterGrid can verify and reports the rest. Nothing on an external
 * destination is marked removed here: distribution targets go through the Autopilot engine,
 * which withdraws under the dealer's safeguards and records evidence or an incident.
 */
export async function reconcileGhostListings(
  db: PrismaClient,
  dealershipId: string,
  actor: { id: string; email?: string | null },
): Promise<SyndicationSentryReconcileResult> {
  const before = await auditDealershipSyndication(db, dealershipId);
  const now = new Date();

  if (before.ghostListings.length === 0) {
    return {
      dealershipId,
      status: 'CLEAN',
      reconciledCount: 0,
      marketplaceListingsEnded: 0,
      distributionTargetsWithdrawn: 0,
      removalCounts: emptyCounts(),
      notPublishedCount: 0,
      remaining: [],
      message: 'No StarterGrid record shows a sold or removed vehicle as still listed.',
      reconciledAt: now.toISOString(),
    };
  }

  // Auto Marketplace is StarterGrid's own site: read back the public listing first and only
  // end the stale row once the vehicle is confirmed hidden from shoppers.
  const ownedIds: string[] = [];
  const ownedStillPublic = new Set<string>();
  for (const ghost of before.ghostListings) {
    if (ghost.source !== 'MARKETPLACE_LISTING' || ghost.channel !== OWNED_CHANNEL || !ghost.vehicleId) continue;
    if (await getMarketplaceVehicle(db, ghost.vehicleId)) ownedStillPublic.add(ghost.id);
    else ownedIds.push(ghost.id);
  }
  if (ownedIds.length > 0) {
    await db.marketplaceListing.updateMany({
      where: { id: { in: ownedIds }, dealershipId, status: 'ACTIVE' },
      data: { status: 'ENDED', endedAt: now, errorMessage: 'Ended after confirming the sold or removed vehicle is no longer public.' },
    });
  }

  const targetGhosts = before.ghostListings.filter(g => g.source === 'DISTRIBUTION_TARGET');
  if (targetGhosts.length > 0 && autopilotEnabled()) await reconcileDealer(db, dealershipId);

  const after = await auditDealershipSyndication(db, dealershipId);
  const remaining = after.ghostListings.map(g => ownedStillPublic.has(g.id)
    ? { ...g, removalStatus: 'FAILED' as const, nextAction: 'Still public on Auto Marketplace after the take-down check. Ask support to investigate.' }
    : g);

  // Classify every listing found at the start by where it ended up. A listing that left the
  // ghost list counts as removed only when its row now carries verified removal evidence.
  const counts = emptyCounts();
  let notPublishedCount = 0;
  let targetsVerified = 0;
  const targetRows = targetGhosts.length > 0
    ? await db.distributionTarget.findMany({ where: { dealershipId, id: { in: targetGhosts.map(g => g.id) } } })
    : [];
  for (const ghost of before.ghostListings) {
    const still = remaining.find(r => r.id === ghost.id);
    if (still) { counts[still.removalStatus]++; continue; }
    if (ghost.source === 'MARKETPLACE_LISTING') {
      if (ownedIds.includes(ghost.id)) counts.VERIFIED_REMOVED++;
      else counts.FAILED++; // left the list without a verified take-down by this run
      continue;
    }
    const row = targetRows.find(t => t.id === ghost.id);
    const status = row ? targetRemovalStatus(row) : 'FAILED';
    if (status === null) notPublishedCount++;
    else {
      counts[status]++;
      if (status === 'VERIFIED_REMOVED') targetsVerified++;
    }
  }

  await db.adminAuditLog.create({
    data: {
      action: 'SYNDICATION_SENTRY_RECONCILE',
      actorId: actor.id,
      actorEmail: actor.email ?? actor.id,
      detail: {
        dealershipId,
        found: before.ghostListings.length,
        marketplaceListingsEnded: ownedIds.length,
        distributionTargetsWithdrawn: targetsVerified,
        removalCounts: counts,
        remaining: remaining.map(g => ({ id: g.id, stockNumber: g.stockNumber, channel: g.channel, removalStatus: g.removalStatus, exposureDays: g.exposureDays })),
      },
    },
  });

  return {
    dealershipId,
    status: remaining.length === 0 && counts.VERIFIED_REMOVED + notPublishedCount === before.ghostListings.length ? 'RECONCILED' : 'NEEDS_ACTION',
    reconciledCount: counts.VERIFIED_REMOVED,
    marketplaceListingsEnded: ownedIds.length,
    distributionTargetsWithdrawn: targetsVerified,
    removalCounts: counts,
    notPublishedCount,
    remaining,
    message: reconcileMessage(counts, notPublishedCount),
    reconciledAt: now.toISOString(),
  };
}

function emptyCounts(): Record<RemovalStatus, number> {
  return Object.fromEntries(REMOVAL_STATUSES.map(s => [s, 0])) as Record<RemovalStatus, number>;
}

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Plain summary that never describes a local or unconfirmed state as a completed removal. */
export function reconcileMessage(counts: Record<RemovalStatus, number>, notPublished = 0): string {
  const parts = [
    counts.VERIFIED_REMOVED && `Confirmed removed: ${plural(counts.VERIFIED_REMOVED, 'listing', 'listings')}.`,
    counts.PROVIDER_ACCEPTED && `${plural(counts.PROVIDER_ACCEPTED, 'request was', 'requests were')} accepted by the destination; removal is not confirmed yet.`,
    counts.SUBMISSION_ATTEMPTED && `${plural(counts.SUBMISSION_ATTEMPTED, 'removal was', 'removals were')} sent to the destination with no response yet.`,
    counts.QUEUED_LOCALLY && `${plural(counts.QUEUED_LOCALLY, 'removal is', 'removals are')} recorded in StarterGrid and not sent to the destination yet.`,
    counts.UNSUPPORTED && `${plural(counts.UNSUPPORTED, 'listing', 'listings')} must be ended on the destination; StarterGrid cannot remove ${counts.UNSUPPORTED === 1 ? 'it' : 'them'} there.`,
    counts.FAILED && `${plural(counts.FAILED, 'removal', 'removals')} failed or could not be confirmed.`,
    counts.NOT_REQUESTED && `${plural(counts.NOT_REQUESTED, 'listing has', 'listings have')} no take-down started.`,
    notPublished && `${plural(notPublished, 'listing was', 'listings were')} never published by StarterGrid, so there was nothing to take down.`,
  ].filter(Boolean);
  return parts.length ? parts.join(' ') : 'No StarterGrid record shows a sold or removed vehicle as still listed.';
}
