import type { IntegrationClass } from '../../lib/types.js';
import { isPlatformAllowedForCategory } from '../../data/platformCategoryMap.js';

export const CHANNEL_NOT_CONNECTED = 'Channel not connected';
export const ASSET_NOT_SELECTED = 'Asset not selected for this channel';
export const NO_ELIGIBLE_INVENTORY = 'No eligible inventory for this channel';

const ACTIVE_QUEUE_STATUSES = ['READY', 'SCHEDULED', 'NEEDS_APPROVAL', 'HELD', 'CLAIMED'];

export function parseDesiredChannels(raw: unknown): string[] {
  return Array.isArray(raw) ? raw.filter((s): s is string => typeof s === 'string') : [];
}

/** Dealer declared this platform in onboarding / profile desired channels. */
export function isDealerPlatformOptedIn(desiredChannels: string[], platformSlug: string): boolean {
  if (desiredChannels.length === 0) return true;
  return desiredChannels.includes(platformSlug);
}

export function isPlatformAccountOutboundReady(accountState: string | null | undefined): boolean {
  return accountState === 'ACTIVE';
}

export function isPlatformOutboundEligible(opts: {
  platformSlug: string;
  businessCategory: string | null;
  accountState: string | null | undefined;
  desiredChannels: string[];
}): boolean {
  if (!isPlatformAllowedForCategory(opts.platformSlug, opts.businessCategory)) return false;
  if (!isPlatformAccountOutboundReady(opts.accountState)) return false;
  if (!isDealerPlatformOptedIn(opts.desiredChannels, opts.platformSlug)) return false;
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
  vehicleId: string | null;
  businessCategory: string | null;
  accountState: string | null | undefined;
  desiredChannels: string[];
  eligibleVehicleCountForPlatform: number;
  deselectedKeys: Set<string>;
}): string | null {
  if (
    !isPlatformOutboundEligible({
      platformSlug: opts.platformSlug,
      businessCategory: opts.businessCategory,
      accountState: opts.accountState,
      desiredChannels: opts.desiredChannels,
    })
  ) {
    return CHANNEL_NOT_CONNECTED;
  }
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
}): boolean {
  if (opts.integrationClass !== 'FEEDABLE') return false;
  if (opts.activeQueueItemStatus && ACTIVE_QUEUE_STATUSES.includes(opts.activeQueueItemStatus)) {
    return false;
  }
  if (
    !isPlatformOutboundEligible({
      platformSlug: opts.platformSlug,
      businessCategory: opts.businessCategory,
      accountState: opts.accountState,
      desiredChannels: opts.desiredChannels,
    })
  ) {
    return false;
  }
  return opts.eligibleVehicleCount > 0;
}
