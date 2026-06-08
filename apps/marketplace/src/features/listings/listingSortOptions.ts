import { isListingFilterEnabled, type ListingFilterConfig } from './listingFilterConfig.ts';
import type { ListingSort } from './listingQuery.ts';

export type ListingSortOption = {
  value: ListingSort;
  label: string;
};

export function buildListingSortOptions(config: ListingFilterConfig, hasQuery = false): ListingSortOption[] {
  const usageLabel = config.labels.usage ?? 'Usage';
  const yearLabel = config.labels.year ?? 'Year';

  const options: ListingSortOption[] = hasQuery
    ? [{ value: 'relevance', label: 'Best match' }]
    : [];

  options.push(
    { value: 'newest', label: 'Newest first' },
    { value: 'price-asc', label: 'Price: low to high' },
    { value: 'price-desc', label: 'Price: high to low' },
  );

  if (isListingFilterEnabled(config, 'usage')) {
    options.push({ value: 'mileage-asc', label: `${usageLabel}: low to high` });
  }

  if (isListingFilterEnabled(config, 'year')) {
    options.push(
      { value: 'year-desc', label: `${yearLabel}: newest first` },
      { value: 'year-asc', label: `${yearLabel}: oldest first` },
    );
  }

  return options;
}
