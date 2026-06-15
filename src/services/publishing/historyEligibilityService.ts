import type { PrismaClient } from '@prisma/client';
import type { IntegrationClass } from '../../lib/types.js';
import { platformProfiles } from '../../data/platformProfiles.js';
import { isPlatformAllowedForCategory } from '../../data/platformCategoryMap.js';
import { loadSiteAvailabilityMap, resolveSiteEnabled } from '../platform/platformAvailabilityService.js';
import {
  isDealerPlatformRunning,
  isOperatorQueueDestination,
  parseDesiredChannels,
  vehicleChannelKey,
} from './queueEligibilityService.js';
import type { SyncEventInput, SyncEventKind } from './syncEventService.js';
import { recordSyncEvent } from './syncEventService.js';

const OAUTH_EXPIRY_BUFFER_MS = 60_000;
export const CONSUMER_MARKETPLACE_SLUG = 'consumer-marketplace';

export const OUTBOUND_PLATFORM_HISTORY_KINDS = new Set<SyncEventKind>([
  'SUBMISSION_SENT',
  'DISPATCH_CLAIMED',
  'DISPATCH_FAILED',
  'DISPATCH_RETRY',
  'APPROVAL_REQUESTED',
  'APPROVAL_GRANTED',
  'APPROVAL_REJECTED',
  'APPROVAL_HELD',
  'APPROVAL_RELEASED',
  'ACCOUNT_UPDATED',
  'ARTIFACT_GENERATED',
]);

export type DealerOutboundContext = {
  dealershipId: string;
  businessCategory: string | null;
  desiredChannels: string[];
  siteAvailability: Map<string, boolean>;
  accountBySlug: Map<string, {
    state: string;
    dealerEnabled: boolean | null;
    autoSyncReadyInventory: boolean | null;
  }>;
  applicationStatusBySlug: Map<string, string>;
  liveOAuth: Set<string>;
  deselectedKeys: Set<string>;
  eligibleVehicleCountByPlatform: Map<string, number>;
  activeMarketplaceVehicleIds: Set<string>;
  profileBySlug: Map<string, (typeof platformProfiles)[number]>;
};

function liveOAuthProviders(
  tokenRows: Array<{ provider: string; expiresAt: Date | null }>,
): Set<string> {
  const isExpired = (exp: Date | null) =>
    exp !== null && exp.getTime() - OAUTH_EXPIRY_BUFFER_MS <= Date.now();
  return new Set(tokenRows.filter(t => !isExpired(t.expiresAt)).map(t => t.provider));
}

function oauthConnectedForPlatform(
  profile: { oauthProvider?: string | null } | undefined,
  liveProviders: Set<string>,
): boolean {
  if (!profile?.oauthProvider) return true;
  return liveProviders.has(profile.oauthProvider);
}

export function isOutboundPlatformHistoryKind(kind: string): boolean {
  return OUTBOUND_PLATFORM_HISTORY_KINDS.has(kind as SyncEventKind);
}

function runningContext(
  profile: (typeof platformProfiles)[number] | undefined,
  account: { state: string } | undefined,
  liveOAuth: Set<string>,
) {
  return {
    accountState: account?.state ?? null,
    oauthProvider: profile?.oauthProvider ?? null,
    oauthConnected: oauthConnectedForPlatform(profile, liveOAuth),
  };
}

/** Operator-attested channel — stricter than queue eligibility; matches Platforms "connected". */
export function isOperatorAttestedChannelForHistory(
  ctx: DealerOutboundContext,
  platformSlug: string,
  vehicleId: string | null,
  accountStateOverride?: string | null,
): boolean {
  if (!isOperatorQueueDestination(platformSlug)) return false;
  if (!isPlatformAllowedForCategory(platformSlug, ctx.businessCategory)) return false;
  if (!resolveSiteEnabled(platformSlug, ctx.siteAvailability)) return false;

  const profile = ctx.profileBySlug.get(platformSlug);
  if (!profile) return false;

  const account = ctx.accountBySlug.get(platformSlug);
  const accountState = accountStateOverride !== undefined ? accountStateOverride : (account?.state ?? null);
  const runCtx = runningContext(profile, account ? { state: accountState ?? account.state } : undefined, ctx.liveOAuth);

  if (platformSlug === CONSUMER_MARKETPLACE_SLUG) {
    if (vehicleId && ctx.activeMarketplaceVehicleIds.has(vehicleId)) return true;
    if (account?.dealerEnabled === true && isDealerPlatformRunning(runCtx)) return true;
    return false;
  }

  if (account?.dealerEnabled !== true) return false;
  if (!isDealerPlatformRunning(runCtx)) return false;

  const appStatus = ctx.applicationStatusBySlug.get(platformSlug) ?? 'NOT_STARTED';
  const integrationClass = profile.integrationClass as IntegrationClass;

  if (integrationClass === 'OWNED') {
    return appStatus === 'ACTIVE';
  }

  return appStatus === 'ACTIVE' && accountState === 'ACTIVE';
}

export function queueEligibilityInputForPlatform(
  ctx: DealerOutboundContext,
  platformSlug: string,
  vehicleId: string | null,
  accountStateOverride?: string | null,
) {
  const profile = ctx.profileBySlug.get(platformSlug);
  const account = ctx.accountBySlug.get(platformSlug);
  const integrationClass = (profile?.integrationClass ?? 'FEEDABLE') as IntegrationClass;
  return {
    platformSlug,
    integrationClass,
    vehicleId,
    businessCategory: ctx.businessCategory,
    siteEnabled: resolveSiteEnabled(platformSlug, ctx.siteAvailability),
    dealerEnabled: account?.dealerEnabled,
    accountState: accountStateOverride !== undefined ? accountStateOverride : (account?.state ?? null),
    desiredChannels: ctx.desiredChannels,
    eligibleVehicleCountForPlatform: ctx.eligibleVehicleCountByPlatform.get(platformSlug) ?? 0,
    deselectedKeys: ctx.deselectedKeys,
    oauthProvider: profile?.oauthProvider ?? null,
    oauthConnected: oauthConnectedForPlatform(profile, ctx.liveOAuth),
  };
}

export function isPlatformHistoryEligible(
  ctx: DealerOutboundContext,
  platformSlug: string,
  vehicleId: string | null,
  accountStateOverride?: string | null,
): boolean {
  return isOperatorAttestedChannelForHistory(ctx, platformSlug, vehicleId, accountStateOverride);
}

export function isSyncEventVisibleForDealer(
  event: {
    kind: string;
    platformSlug: string | null;
    vehicleId: string | null;
    payload?: unknown;
  },
  ctx: DealerOutboundContext,
): boolean {
  if (!event.platformSlug || !isOutboundPlatformHistoryKind(event.kind)) return true;

  const payload = event.payload && typeof event.payload === 'object'
    ? event.payload as Record<string, unknown>
    : null;
  if (
    event.platformSlug === CONSUMER_MARKETPLACE_SLUG
    && payload?.source === 'marketplace_listing'
  ) {
    return true;
  }

  return isOperatorAttestedChannelForHistory(ctx, event.platformSlug, event.vehicleId);
}

export async function loadDealerOutboundContext(
  prisma: PrismaClient,
  dealershipId: string,
): Promise<DealerOutboundContext> {
  const dealer = await prisma.dealershipProfile.findUniqueOrThrow({
    where: { id: dealershipId },
    select: { businessCategory: true, desiredChannels: true },
  });
  const businessCategory = dealer.businessCategory;
  const desiredChannels = parseDesiredChannels(dealer.desiredChannels);

  const [accounts, applications, deselections, readyVehicles, oauthTokens, siteAvailability, marketplaceListings] =
    await Promise.all([
    prisma.platformAccount.findMany({
      where: { dealershipId },
      select: {
        platformSlug: true,
        state: true,
        dealerEnabled: true,
        autoSyncReadyInventory: true,
      },
    }),
    prisma.platformApplication.findMany({
      where: { dealershipId },
      select: { status: true, platform: { select: { slug: true } } },
    }),
    prisma.vehicleChannelSelection.findMany({
      where: { dealershipId, selected: false },
      select: { vehicleId: true, channelKey: true },
    }),
    prisma.vehicle.findMany({
      where: { dealershipId, soldAt: null, removedAt: null, listingStatus: 'READY' },
      select: { id: true },
    }),
    prisma.platformOAuthToken.findMany({
      where: { dealershipId },
      select: { provider: true, expiresAt: true },
    }),
    loadSiteAvailabilityMap(prisma),
    prisma.marketplaceListing.findMany({
      where: { dealershipId, platformSlug: CONSUMER_MARKETPLACE_SLUG, status: 'ACTIVE' },
      select: { vehicleId: true },
    }),
  ]);

  const profileBySlug = new Map(platformProfiles.map(p => [p.slug, p]));
  const accountBySlug = new Map(accounts.map(a => [a.platformSlug, a]));
  const applicationStatusBySlug = new Map(applications.map(a => [a.platform.slug, a.status]));
  const liveOAuth = liveOAuthProviders(oauthTokens);
  const deselectedKeys = new Set(
    deselections.map(d => vehicleChannelKey(d.vehicleId, d.channelKey)),
  );
  const readyVehicleIds = new Set(readyVehicles.map(v => v.id));
  const eligibleVehicleCountByPlatform = new Map<string, number>();
  const activeMarketplaceVehicleIds = new Set(
    marketplaceListings.map(l => l.vehicleId).filter((id): id is string => id !== null),
  );

  for (const profile of platformProfiles) {
    if (!isPlatformAllowedForCategory(profile.slug, businessCategory)) continue;
    let count = 0;
    for (const vehicleId of readyVehicleIds) {
      if (!deselectedKeys.has(vehicleChannelKey(vehicleId, profile.slug))) count++;
    }
    eligibleVehicleCountByPlatform.set(profile.slug, count);
  }

  return {
    dealershipId,
    businessCategory,
    desiredChannels,
    siteAvailability,
    accountBySlug,
    applicationStatusBySlug,
    liveOAuth,
    deselectedKeys,
    eligibleVehicleCountByPlatform,
    activeMarketplaceVehicleIds,
    profileBySlug,
  };
}

export function filterDealerHistoryEvents<T extends {
  kind: string;
  platformSlug: string | null;
  vehicleId: string | null;
  payload?: unknown;
}>(events: T[], ctx: DealerOutboundContext): T[] {
  return events.filter(e => isSyncEventVisibleForDealer(e, ctx));
}

/** Record platform-scoped history only when the channel is operator-attested for the dealer. */
export async function recordOutboundSyncEvent(
  prisma: PrismaClient,
  input: SyncEventInput,
  ctx?: DealerOutboundContext,
  accountStateOverride?: string | null,
): Promise<string | null> {
  if (!input.platformSlug || !isOutboundPlatformHistoryKind(input.kind)) {
    return recordSyncEvent(prisma, input);
  }

  const context = ctx ?? await loadDealerOutboundContext(prisma, input.dealershipId);
  if (
    !isOperatorAttestedChannelForHistory(
      context,
      input.platformSlug,
      input.vehicleId ?? null,
      accountStateOverride,
    )
  ) {
    return null;
  }

  return recordSyncEvent(prisma, input);
}

export async function recordMarketplaceListingPublished(
  prisma: PrismaClient,
  dealershipId: string,
  platformSlug: string,
  vehicleId: string | null,
): Promise<string> {
  return recordSyncEvent(prisma, {
    dealershipId,
    vehicleId,
    platformSlug,
    kind: 'SUBMISSION_SENT',
    payload: { source: 'marketplace_listing', channel: platformSlug },
  });
}
