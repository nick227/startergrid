import {
  isMarketplaceAvailabilityFilterSupported,
  type MarketplaceAvailabilityFilter,
} from '@auto-dealer/category-schemas';

export const AVAILABILITY_FILTER_LABEL = 'Availability';

export const AVAILABILITY_FILTER_OPTIONS: ReadonlyArray<{
  value: MarketplaceAvailabilityFilter;
  label: string;
}> = [{ value: 'available', label: 'Available' }];

export function isAvailabilityFilterEnabled(): boolean {
  return isMarketplaceAvailabilityFilterSupported();
}

export function defaultAvailabilityFilter(): MarketplaceAvailabilityFilter {
  return 'available';
}
