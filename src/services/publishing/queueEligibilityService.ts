import type { IntegrationClass } from '../../lib/types.js';
import { isPlatformAllowedForCategory } from '../../data/platformCategoryMap.js';
import { systemCredentialReadiness } from './platformAccountService.js';
import {
  resolveAutoSyncReadyInventory,
  resolveDealerPlatformEnabled,
  resolveSiteEnabled,
} from '../platform/platformAvailabilityService.js';
import { platformProfiles } from '../../data/platformProfiles.js';

export const CHANNEL_NOT_CONNECTED = 'Channel not connected';
export const ASSET_NOT_SELECTED = 'Asset not selected for this channel';
export const NO_ELIGIBLE_INVENTORY = 'No eligible inventory for this channel';
export const PLATFORM_NOT_ENABLED = 'Platform not enabled for this dealership';
export const PLATFORM_DISABLED_SITEWIDE = 'Platform disabled site-wide';
export const OAUTH_NOT_CONNECTED = 'OAuth connection required';
export const AUTO_SYNC_DISABLED = 'Auto-sync disabled for this channel';

/** Legacy feed channel — operator queue is vehicle posts to configured destinations only. */
export const OPERATOR_QUEUE_EXCLUDED_SLUGS = new Set(['dealer-storefront']);

const ACTIVE_QUEUE_STATUSES = ['READY', 'SCHEDULED', 'NEEDS_APPROVAL', 'HELD', 'CLAIMED'];

export type PlatformDispatchContext = {
  platformSlug: string;
  integrationClass: IntegrationClass;
  businessCategory: string | null;
  siteEnabled: boolean;
  dealerEnabled: boolean | null | undefined;
  desiredChannels: string[];
  accountState: string | null | undefined;
  oauthProvider: string | null;
  oauthConnected: boolean;
  autoSyncReadyInventory?: boolean | null;
};

export { parseDesiredChannels } from '../platform/platformAvailabilityService.js';

export function isOperatorQueueDestination(platformSlug: string): boolean {
  return !OPERATOR_QUEUE_EXCLUDED_SLUGS.has(platformSlug);
}

/** Admin has enabled this platform site-wide and system credentials are ready. */
export function isAdminPlatformEnabled(
  platformSlug: string,
  integrationClass: IntegrationClass,
  oauthProvider: string | null,
  siteEnabled = true,
): boolean {
  if (!siteEnabled) return false;
  if (oauthProvider) {
    return systemCredentialReadiness(platformSlug).ready;
  }
  if (integrationClass === 'OWNED') return true;
  return systemCredentialReadiness(platformSlug).ready;
}

/** Dealer triage/blockers only surface platforms offered site-wide with system credentials ready. */
export function shouldSurfaceDealerBlockersForPlatform(
  platformSlug: string,
  siteAvailability: Map<string, boolean> | ReadonlyMap<string, boolean>,
): boolean {
  if (platformSlug === 'all') return true;
  const profile = platformProfiles.find(p => p.slug === platformSlug);
  if (!profile) return true;
  const siteEnabled = resolveSiteEnabled(platformSlug, siteAvailability);
  return isAdminPlatformEnabled(
    platformSlug,
    profile.integrationClass,
    profile.oauthProvider ?? null,
    siteEnabled,
  );
}

/** Dealer chose to use this destination (toggle or onboarding intent). */
export function isDealerPlatformEnabled(
  dealerEnabled: boolean | null | undefined,
  desiredChannels: string[],
  platformSlug: string,
): boolean {
  return resolveDealerPlatformEnabled(dealerEnabled, desiredChannels, platformSlug);
}

export function isPlatformAccountOutboundReady(accountState: string | null | undefined): boolean {
  return accountState === 'ACTIVE';
}

export function isDealerPlatformRunning(
  ctx: Pick<PlatformDispatchContext, 'accountState' | 'oauthProvider' | 'oauthConnected'>,
): boolean {
  if (!isPlatformAccountOutboundReady(ctx.accountState)) return false;
  if (ctx.oauthProvider && !ctx.oauthConnected) return false;
  return true;
}

export function isAutoSyncEnabledForPlatform(
  platformSlug: string,
  autoSyncReadyInventory: boolean | null | undefined,
): boolean {
  return resolveAutoSyncReadyInventory(platformSlug, autoSyncReadyInventory);
}

export function isPlatformOutboundEligible(ctx: PlatformDispatchContext): boolean {
  if (!isOperatorQueueDestination(ctx.platformSlug)) return false;
  if (!isPlatformAllowedForCategory(ctx.platformSlug, ctx.businessCategory)) return false;
  if (!isAdminPlatformEnabled(ctx.platformSlug, ctx.integrationClass, ctx.oauthProvider, ctx.siteEnabled)) {
    return false;
  }
  if (!isDealerPlatformEnabled(ctx.dealerEnabled, ctx.desiredChannels, ctx.platformSlug)) return false;
  if (!isDealerPlatformRunning(ctx)) return false;
  return true;
}

export function vehicleChannelKey(vehicleId: string, platformSlug: string): string {
  return `${vehicleId}:${platformSlug}`;
}

export function isVehicleSelectedForPlatform(
  vehicleId: string | null | undefined,
  platformSlug: string,
  deselectedKeys: Set<string>,
): boolean {
  if (!vehicleId) return true;
  return !deselectedKeys.has(vehicleChannelKey(vehicleId, platformSlug));
}

export function ineligibleReasonForQueueItem(opts: {
  platformSlug: string;
  integrationClass: IntegrationClass;
  vehicleId: string | null;
  businessCategory: string | null;
  siteEnabled: boolean;
  dealerEnabled: boolean | null | undefined;
  accountState: string | null | undefined;
  desiredChannels: string[];
  eligibleVehicleCountForPlatform: number;
  deselectedKeys: Set<string>;
  oauthProvider: string | null;
  oauthConnected: boolean;
}): string | null {
  if (!isOperatorQueueDestination(opts.platformSlug)) return PLATFORM_NOT_ENABLED;
  if (!isPlatformAllowedForCategory(opts.platformSlug, opts.businessCategory)) return PLATFORM_NOT_ENABLED;
  if (!opts.siteEnabled) return PLATFORM_DISABLED_SITEWIDE;
  if (!isAdminPlatformEnabled(opts.platformSlug, opts.integrationClass, opts.oauthProvider, opts.siteEnabled)) {
    return PLATFORM_NOT_ENABLED;
  }
  if (!isDealerPlatformEnabled(opts.dealerEnabled, opts.desiredChannels, opts.platformSlug)) {
    return PLATFORM_NOT_ENABLED;
  }
  if (!isPlatformAccountOutboundReady(opts.accountState)) return CHANNEL_NOT_CONNECTED;
  if (opts.oauthProvider && !opts.oauthConnected) return OAUTH_NOT_CONNECTED;
  if (!opts.vehicleId) {
    if (opts.eligibleVehicleCountForPlatform === 0) return NO_ELIGIBLE_INVENTORY;
    return null;
  }
  if (!isVehicleSelectedForPlatform(opts.vehicleId, opts.platformSlug, opts.deselectedKeys)) {
    return ASSET_NOT_SELECTED;
  }
  return null;
}

export function isQueueItemOutboundEligible(
  opts: Parameters<typeof ineligibleReasonForQueueItem>[0],
): boolean {
  return ineligibleReasonForQueueItem(opts) === null;
}

/** Whether a FEEDABLE platform should receive an INITIAL_PUBLISH scheduled row. */
export function canCreateInitialPublishQueueItem(opts: {
  integrationClass: IntegrationClass;
  platformSlug: string;
  businessCategory: string | null;
  siteEnabled: boolean;
  dealerEnabled: boolean | null | undefined;
  accountState: string | null;
  desiredChannels: string[];
  eligibleVehicleCount: number;
  activeQueueItemStatus: string | null;
  oauthProvider: string | null;
  oauthConnected: boolean;
}): boolean {
  if (opts.integrationClass !== 'FEEDABLE') return false;
  if (opts.activeQueueItemStatus && ACTIVE_QUEUE_STATUSES.includes(opts.activeQueueItemStatus)) {
    return false;
  }
  if (
    !isPlatformOutboundEligible({
      platformSlug: opts.platformSlug,
      integrationClass: opts.integrationClass,
      businessCategory: opts.businessCategory,
      siteEnabled: opts.siteEnabled,
      dealerEnabled: opts.dealerEnabled,
      accountState: opts.accountState,
      desiredChannels: opts.desiredChannels,
      oauthProvider: opts.oauthProvider,
      oauthConnected: opts.oauthConnected,
    })
  ) {
    return false;
  }
  return opts.eligibleVehicleCount > 0;
}
