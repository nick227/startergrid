export type MarketplaceAvailabilityFilter = 'available';

export const MARKETPLACE_AVAILABILITY_FILTERS: readonly MarketplaceAvailabilityFilter[] = ['available'];

/**
 * Consumer feed availability filter — MVP is available-only.
 * Unsupported values fail closed to `available`.
 */
export function parseMarketplaceAvailabilityFilter(
  value: string | undefined,
): MarketplaceAvailabilityFilter {
  if (value === 'available') return 'available';
  return 'available';
}

export function isMarketplaceAvailabilityFilterSupported(): boolean {
  return true;
}
