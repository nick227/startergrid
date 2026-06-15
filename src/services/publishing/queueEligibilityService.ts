import type { IntegrationClass } from '../../lib/types.js';
import { isPlatformAllowedForCategory } from '../../data/platformCategoryMap.js';
import { systemCredentialReadiness } from './platformAccountService.js';

export const CHANNEL_NOT_CONNECTED = 'Channel not connected';
export const ASSET_NOT_SELECTED = 'Asset not selected for this channel';
export const NO_ELIGIBLE_INVENTORY = 'No eligible inventory for this channel';
export const PLATFORM_NOT_ENABLED = 'Platform not enabled for this dealership';
export const OAUTH_NOT_CONNECTED = 'OAuth connection required';

/** Legacy feed channel — operator queue is vehicle posts to configured destinations only. */
export const OPERATOR_QUEUE_EXCLUDED_SLUGS = new Set(['dealer-storefront']);

const ACTIVE_QUEUE_STATUSES = ['READY', 'SCHEDULED', 'NEEDS_APPROVAL', 'HELD', 'CLAIMED'];

export type PlatformDispatchContext = {
  platformSlug: string;
  integrationClass: IntegrationClass;
  businessCategory: string | null;
  accountState: string | null | undefined;
  desiredChannels: string[];
  oauthProvider: string | null;
  oauthConnected: boolean;
};

export function parseDesiredChannels(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
}

export function isOperatorQueueDestination(platformSlug: string): boolean {
  return !OPERATOR_QUEUE_EXCLUDED_SLUGS.has(platformSlug);
}

/** Admin/system has enabled this platform for dealer registration (matches Platforms UI). */
export function isAdminPlatformEnabled(
  platformSlug: string,
  integrationClass: IntegrationClass,
  oauthProvider: string | null,
): boolean {
  if (oauthProvider) {
    return systemCredentialReadiness(platformSlug).ready;
  }
  if (integrationClass === 'OWNED') return true;
  return systemCredentialReadiness(platformSlug).ready;
}

/**
 * Dealer opted into this destination: explicit ACTIVE connect, or listed in onboarding
 * desired channels while setup is in progress.
 */
export function isDealerPlatformOptedIn(
  desiredChannels: string[],
  platformSlug: string,
  accountState: string | null | undefined,
): boolean {
  if (accountState === 'ACTIVE') return true;
  if (desiredChannels.length === 0) return false;
  return desiredChannels.includes(platformSlug);
}

export function isPlatformAccountOutboundReady(accountState: string | null | undefined): boolean {
  return accountState === 'ACTIVE';
}

export function isDealerPlatformRunning(ctx: Pick<PlatformDispatchContext, 'accountState' | 'oauthProvider' | 'oauthConnected'>): boolean {
  if (!isPlatformAccountOutboundReady(ctx.accountState)) return false;
  if (ctx.oauthProvider && !ctx.oauthConnected) return false;
  return true;
}

export function isPlatformOutboundEligible(ctx: PlatformDispatchContext): boolean {
  if (!isOperatorQueueDestination(ctx.platformSlug)) return false;
  if (!isPlatformAllowedForCategory(ctx.platformSlug, ctx.businessCategory)) return false;
  if (!isAdminPlatformEnabled(ctx.platformSlug, ctx.integrationClass, ctx.oauthProvider)) return false;
  if (!isDealerPlatformOptedIn(ctx.desiredChannels, ctx.platformSlug, ctx.accountState)) return false;
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
  accountState: string | null | undefined;
  desiredChannels: string[];
  eligibleVehicleCountForPlatform: number;
  deselectedKeys: Set<string>;
  oauthProvider: string | null;
  oauthConnected: boolean;
}): string | null {
  if (!isOperatorQueueDestination(opts.platformSlug)) return PLATFORM_NOT_ENABLED;
  if (!isPlatformAllowedForCategory(opts.platformSlug, opts.businessCategory)) return PLATFORM_NOT_ENABLED;
  if (!isAdminPlatformEnabled(opts.platformSlug, opts.integrationClass, opts.oauthProvider)) {
    return PLATFORM_NOT_ENABLED;
  }
  if (!isDealerPlatformOptedIn(opts.desiredChannels, opts.platformSlug, opts.accountState)) {
    return CHANNEL_NOT_CONNECTED;
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
