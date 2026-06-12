import type { PrismaClient } from '@prisma/client';
import { platformProfiles } from '../../data/platformProfiles.js';
import { dbVehicleToPayload } from './inventorySnapshotService.js';
import { validateVehiclePayloads } from '../../validators/vehicle/vehiclePayloadValidator.js';

export const STOREFRONT_CHANNEL_KEY = 'storefront';

export type VehicleChannelLiveStatus =
  | 'LIVE'
  | 'QUEUED'
  | 'NEEDS_APPROVAL'
  | 'HELD'
  | 'FAILED'
  | 'NOT_LIVE';

export type VehicleChannelRow = {
  channelKey: string;             // platform slug, or 'storefront'
  channelName: string;
  lanes: string[];                // e.g. ['catalogSync', 'marketplaceListing']
  connected: boolean;             // account state allows publishing
  connectionState: string;        // PlatformAccountState, or 'BUILT_IN' for storefront
  eligible: boolean;              // vehicle data satisfies this platform's rules
  eligibilityIssues: string[];    // human-readable blockers (FAIL severity only)
  selected: boolean;              // dealer wants this vehicle on this channel
  liveStatus: VehicleChannelLiveStatus;
  statusDetail: string | null;    // failure reason / approval reason etc.
  externalListingId: string | null;
  lastActivityAt: string | null;  // listing listedAt, queue sentAt, or catalog lastSyncAt
};

export type VehicleChannelMatrix = {
  vehicleId: string;
  listingStatus: string;
  channels: VehicleChannelRow[];
};

const CONNECTED_STATES = new Set(['ACTIVE', 'READY']);

const QUEUE_STATUS_RANK: Array<{ statuses: string[]; live: VehicleChannelLiveStatus }> = [
  { statuses: ['FAILED'], live: 'FAILED' },
  { statuses: ['NEEDS_APPROVAL'], live: 'NEEDS_APPROVAL' },
  { statuses: ['HELD', 'BLOCKED'], live: 'HELD' },
  { statuses: ['READY', 'SCHEDULED', 'CLAIMED'], live: 'QUEUED' },
];

function profileLanes(p: (typeof platformProfiles)[number]): string[] {
  const lanes: string[] = [];
  if (p.socialPosting) lanes.push('socialPosting');
  if (p.catalogSync) lanes.push('catalogSync');
  if (p.marketplaceListing) lanes.push('marketplaceListing');
  if (p.partnerFeed) lanes.push('partnerFeed');
  if (p.leadSync) lanes.push('leadSync');
  return lanes;
}

export async function buildVehicleChannelMatrix(
  prisma: PrismaClient,
  dealershipId: string,
  vehicleId: string,
): Promise<VehicleChannelMatrix | null> {
  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId, dealershipId },
    include: { media: true, channelSelections: true },
  });
  if (!vehicle) return null;

  const dealer = await prisma.dealershipProfile.findUniqueOrThrow({ where: { id: dealershipId } });

  const [accounts, listings, posts, queueItems, catalogConfigs] = await Promise.all([
    prisma.platformAccount.findMany({
      where: { dealershipId },
      select: { platformSlug: true, state: true },
    }),
    prisma.marketplaceListing.findMany({
      where: { dealershipId, vehicleId },
      select: { platformSlug: true, status: true, errorMessage: true, externalListingId: true, listedAt: true },
    }),
    prisma.socialPost.findMany({
      where: { dealershipId, vehicleId },
      select: { platformSlug: true, status: true, publishedAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.publishQueueItem.findMany({
      where: { dealershipId, vehicleId, status: { not: 'CANCELLED' } },
      select: { platformSlug: true, status: true, failureReason: true, approvalRequiredReason: true, holdReason: true, sentAt: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.platformCatalogSync.findMany({
      where: { dealershipId },
      select: { platformSlug: true, lastSyncAt: true },
    }),
  ]);

  const vehiclePayload = dbVehicleToPayload(vehicle);

  const deselected = new Set(
    vehicle.channelSelections.filter(s => !s.selected).map(s => s.channelKey),
  );
  const listingsBySlug = new Map(listings.map(l => [l.platformSlug, l]));
  const catalogBySlug = new Map(catalogConfigs.map(c => [c.platformSlug, c]));
  const accountStateBySlug = new Map(accounts.map(a => [a.platformSlug, a.state as string]));

  const queueBySlug = new Map<string, typeof queueItems>();
  for (const q of queueItems) {
    if (!queueBySlug.has(q.platformSlug)) queueBySlug.set(q.platformSlug, []);
    queueBySlug.get(q.platformSlug)!.push(q);
  }
  const publishedPostSlugs = new Map<string, Date | null>();
  for (const p of posts) {
    if (p.status === 'PUBLISHED' && !publishedPostSlugs.has(p.platformSlug)) {
      publishedPostSlugs.set(p.platformSlug, p.publishedAt);
    }
  }

  const channels: VehicleChannelRow[] = [];

  // ── Storefront pseudo-channel ───────────────────────────────────────────────
  const storefrontState = accountStateBySlug.get('dealer-storefront') ?? 'ACCOUNT_NEEDED';
  const storefrontConnected = CONNECTED_STATES.has(storefrontState);
  const storefrontSelected = !deselected.has(STOREFRONT_CHANNEL_KEY);
  const storefrontLive =
    storefrontConnected && vehicle.listingStatus === 'READY' && !vehicle.soldAt && !vehicle.removedAt && storefrontSelected;
  channels.push({
    channelKey: STOREFRONT_CHANNEL_KEY,
    channelName: 'Dealer Storefront',
    lanes: ['storefront'],
    connected: storefrontConnected,
    connectionState: storefrontState,
    eligible: storefrontConnected,
    eligibilityIssues: storefrontConnected ? [] : ['Connect Dealer Storefront on Platforms'],
    selected: storefrontSelected,
    liveStatus: storefrontLive ? 'LIVE' : 'NOT_LIVE',
    statusDetail: storefrontLive ? null
      : !storefrontConnected ? 'Connect Dealer Storefront on Platforms'
      : vehicle.listingStatus !== 'READY' ? 'Vehicle is in Draft'
      : !storefrontSelected ? 'Excluded by dealer'
      : 'Vehicle is sold or removed',
    externalListingId: null,
    lastActivityAt: null,
  });

  // ── Platform channels (one row per platform account for this dealer) ────────
  // Account rows may exist for the whole registry — only platforms that support
  // this dealership's business category belong in the matrix.
  for (const account of accounts) {
    // The registry's 'dealer-storefront' profile is the built-in storefront — already
    // rendered above as the pseudo-channel; a second row would be a duplicate.
    if (account.platformSlug === 'dealer-storefront') continue;
    const profile = platformProfiles.find(p => p.slug === account.platformSlug);
    if (!profile) continue;
    if (!profile.supportedCategories.includes(dealer.businessCategory)) continue;

    const failIssues = validateVehiclePayloads(
      [vehiclePayload],
      profile.requiredVehicleFields,
      profile.requiredMediaRules,
      { businessCategory: dealer.businessCategory },
    ).filter(i => i.severity === 'FAIL');

    const queue = queueBySlug.get(account.platformSlug) ?? [];
    const listing = listingsBySlug.get(account.platformSlug);
    const catalog = catalogBySlug.get(account.platformSlug);
    const postedAt = publishedPostSlugs.get(account.platformSlug);

    let liveStatus: VehicleChannelLiveStatus = 'NOT_LIVE';
    let statusDetail: string | null = null;
    let lastActivityAt: Date | null = null;

    // Queue problems take display priority over stale live state
    for (const rank of QUEUE_STATUS_RANK) {
      const hit = queue.find(q => rank.statuses.includes(q.status));
      if (hit) {
        liveStatus = rank.live;
        statusDetail = hit.failureReason ?? hit.approvalRequiredReason ?? hit.holdReason ?? null;
        break;
      }
    }

    if (liveStatus === 'NOT_LIVE') {
      if (listing?.status === 'ACTIVE') {
        liveStatus = 'LIVE';
        lastActivityAt = listing.listedAt;
      } else if (listing?.status === 'FAILED') {
        liveStatus = 'FAILED';
        statusDetail = listing.errorMessage;
      } else if (publishedPostSlugs.has(account.platformSlug)) {
        liveStatus = 'LIVE';
        lastActivityAt = postedAt ?? null;
      } else if (queue.some(q => q.status === 'SENT')) {
        liveStatus = 'LIVE';
        lastActivityAt = queue.find(q => q.status === 'SENT')?.sentAt ?? null;
      } else if (
        catalog?.lastSyncAt &&
        vehicle.listingStatus === 'READY' &&
        !deselected.has(account.platformSlug) &&
        failIssues.length === 0
      ) {
        // Catalog sync is dealership-wide; an eligible+selected READY vehicle
        // is part of the synced catalog.
        liveStatus = 'LIVE';
        statusDetail = 'Included in catalog sync';
        lastActivityAt = catalog.lastSyncAt;
      }
    }

    channels.push({
      channelKey: account.platformSlug,
      channelName: profile.name,
      lanes: profileLanes(profile),
      connected: CONNECTED_STATES.has(accountStateBySlug.get(account.platformSlug) ?? ''),
      connectionState: accountStateBySlug.get(account.platformSlug) ?? 'ACCOUNT_NEEDED',
      eligible: failIssues.length === 0,
      eligibilityIssues: failIssues.map(i => i.message),
      selected: !deselected.has(account.platformSlug),
      liveStatus,
      statusDetail,
      externalListingId: listing?.externalListingId ?? null,
      lastActivityAt: lastActivityAt?.toISOString() ?? null,
    });
  }

  return {
    vehicleId,
    listingStatus: vehicle.listingStatus,
    channels,
  };
}
