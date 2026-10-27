import type { PrismaClient } from '@prisma/client';
import { autopilotEnabled, OWNED_CHANNEL, reconcileDealer } from '../autopilot/service.js';
import { getMarketplaceVehicle } from '../marketplace/marketplaceQueryService.js';

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
  /** RECONCILED: nothing remains. NEEDS_ACTION: some listings still need a verified take-down. */
  status: 'RECONCILED' | 'CLEAN' | 'NEEDS_ACTION';
  reconciledCount: number;
  /** Auto Marketplace rows ended after reading back that the vehicle is no longer public. */
  marketplaceListingsEnded: number;
  /** Distribution targets the Autopilot engine withdrew and verified during this run. */
  distributionTargetsWithdrawn: number;
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
        nextAction: listing.platformSlug === OWNED_CHANNEL
          ? 'Take down now ends it on Auto Marketplace after confirming it is no longer public.'
          : `End the listing on ${formatChannelName(listing.platformSlug)}. StarterGrid cannot confirm removal there.`,
      });
    }

    // 2. Check DistributionTarget where operation != WITHDRAW or status indicates active presence
    if (vehicleIds.length > 0) {
      const activeTargets = await db.distributionTarget.findMany({
        where: {
          dealershipId,
          vehicleId: { in: vehicleIds },
          OR: [
            { operation: { not: 'WITHDRAW' } },
            { status: { in: ['VERIFIED_LIVE', 'PENDING_DELIVERY', 'HELD', 'UNKNOWN'] } },
          ],
        },
      });

      for (const target of activeTargets) {
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
      remaining: [],
      message: 'No StarterGrid record shows a sold or removed vehicle as still listed.',
      reconciledAt: now.toISOString(),
    };
  }

  // Auto Marketplace is StarterGrid's own site: read back the public listing first and only
  // end the stale row once the vehicle is confirmed hidden from shoppers.
  const ownedIds: string[] = [];
  for (const ghost of before.ghostListings) {
    if (ghost.source !== 'MARKETPLACE_LISTING' || ghost.channel !== OWNED_CHANNEL || !ghost.vehicleId) continue;
    if (!await getMarketplaceVehicle(db, ghost.vehicleId)) ownedIds.push(ghost.id);
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
  const targetsCleared = targetGhosts.filter(g => !after.ghostListings.some(a => a.id === g.id)).length;
  const reconciledCount = before.ghostListings.length - after.ghostListings.length;

  await db.adminAuditLog.create({
    data: {
      action: 'SYNDICATION_SENTRY_RECONCILE',
      actorId: actor.id,
      actorEmail: actor.email ?? actor.id,
      detail: {
        dealershipId,
        found: before.ghostListings.length,
        marketplaceListingsEnded: ownedIds.length,
        distributionTargetsWithdrawn: targetsCleared,
        remaining: after.ghostListings.map(g => ({ id: g.id, stockNumber: g.stockNumber, channel: g.channel, exposureDays: g.exposureDays })),
      },
    },
  });

  const remaining = after.ghostListings;
  return {
    dealershipId,
    status: remaining.length === 0 ? 'RECONCILED' : 'NEEDS_ACTION',
    reconciledCount,
    marketplaceListingsEnded: ownedIds.length,
    distributionTargetsWithdrawn: targetsCleared,
    remaining,
    message: remaining.length === 0
      ? `Took down ${reconciledCount} listing${reconciledCount === 1 ? '' : 's'} and confirmed removal.`
      : `Took down ${reconciledCount} of ${before.ghostListings.length}. ${remaining.length} still need${remaining.length === 1 ? 's' : ''} action on the destination; see each next step.`,
    reconciledAt: now.toISOString(),
  };
}
