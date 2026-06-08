import type { CategorySchema } from '../types.js';

export type ConsumerMarketplaceSiteStatus = 'active' | 'coming_soon' | 'disabled';

/**
 * Consumer marketplace gate — uses consumerEnabled only.
 * When listingCount is provided, returns true only when enabled and inventory exists
 * (sites index "Live" badge). Omit listingCount for API/route browse access.
 */
export function isConsumerMarketplaceLive(
  schema: CategorySchema,
  listingCount?: number,
): boolean {
  if (!schema.marketplace.consumerEnabled) return false;
  if (listingCount !== undefined) return listingCount > 0;
  return true;
}

/** Sites index display state — listingCount distinguishes active vs coming_soon. */
export function resolveConsumerMarketplaceSiteStatus(
  schema: CategorySchema,
  listingCount: number,
): ConsumerMarketplaceSiteStatus {
  if (!schema.marketplace.consumerEnabled) return 'disabled';
  if (listingCount > 0) return 'active';
  return 'coming_soon';
}
