import type { ListQuery } from '../../lib/routes.ts';
import type { ListingFilterConfig } from './listingFilterConfig.ts';

export type ListingFilterChip = {
  key: keyof ListQuery;
  label: string;
};

function formatDollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export function hasListingFilters(query: ListQuery): boolean {
  return Boolean(
    query.make ||
    query.model ||
    query.condition ||
    query.minPrice != null ||
    query.maxPrice != null ||
    query.maxMileage != null ||
    query.dealer,
  );
}

export function buildListingFilterChips(
  query: ListQuery,
  config: ListingFilterConfig,
): ListingFilterChip[] {
  const chips: ListingFilterChip[] = [];
  const brandLabel = config.labels.brand ?? 'Brand';
  const modelLabel = config.labels.model ?? 'Model / Type';
  const usageLabel = config.labels.usage ?? 'Usage';
  const conditionLabel = config.labels.condition ?? 'Condition';

  if (query.make) chips.push({ key: 'make', label: `${brandLabel}: ${query.make}` });
  if (query.model) chips.push({ key: 'model', label: `${modelLabel}: ${query.model}` });
  if (query.condition) chips.push({ key: 'condition', label: `${conditionLabel}: ${query.condition}` });
  if (query.minPrice != null) chips.push({ key: 'minPrice', label: `Min price: ${formatDollars(query.minPrice)}` });
  if (query.maxPrice != null) chips.push({ key: 'maxPrice', label: `Max price: ${formatDollars(query.maxPrice)}` });
  if (query.maxMileage != null) {
    chips.push({ key: 'maxMileage', label: `Max ${usageLabel.toLowerCase()}: ${query.maxMileage.toLocaleString()}` });
  }
  if (query.dealer) chips.push({ key: 'dealer', label: `Seller: ${query.dealer}` });

  return chips;
}
