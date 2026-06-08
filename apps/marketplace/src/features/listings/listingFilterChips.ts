import type { ListingFilterConfig } from './listingFilterConfig.ts';
import { hasListingQueryFilters, type ListingQuery, type ListingQueryKey } from './listingQuery.ts';

export type ListingFilterChip = {
  key: ListingQueryKey;
  label: string;
};

function formatDollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export function hasListingFilters(query: ListingQuery): boolean {
  return hasListingQueryFilters(query);
}

export function buildListingFilterChips(
  query: ListingQuery,
  config: ListingFilterConfig,
): ListingFilterChip[] {
  const chips: ListingFilterChip[] = [];
  const brandLabel = config.labels.brand ?? 'Brand';
  const modelLabel = config.labels.model ?? 'Model / Type';
  const usageLabel = config.labels.usage ?? 'Usage';
  const conditionLabel = config.labels.condition ?? 'Condition';
  const yearLabel = config.labels.year ?? 'Year';

  if (query.brand) chips.push({ key: 'brand', label: `${brandLabel}: ${query.brand}` });
  if (query.model) chips.push({ key: 'model', label: `${modelLabel}: ${query.model}` });
  if (query.condition) chips.push({ key: 'condition', label: `${conditionLabel}: ${query.condition}` });
  if (query.priceMin != null) chips.push({ key: 'priceMin', label: `Min price: ${formatDollars(query.priceMin)}` });
  if (query.priceMax != null) chips.push({ key: 'priceMax', label: `Max price: ${formatDollars(query.priceMax)}` });
  if (query.usageMax != null) {
    chips.push({ key: 'usageMax', label: `Max ${usageLabel.toLowerCase()}: ${query.usageMax.toLocaleString()}` });
  }
  if (query.yearMin != null) chips.push({ key: 'yearMin', label: `Min ${yearLabel.toLowerCase()}: ${query.yearMin}` });
  if (query.yearMax != null) chips.push({ key: 'yearMax', label: `Max ${yearLabel.toLowerCase()}: ${query.yearMax}` });
  if (query.seller) chips.push({ key: 'seller', label: `Seller: ${query.seller}` });

  return chips;
}
