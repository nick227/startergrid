import type { MarketplaceFacetDef } from '@auto-dealer/category-schemas';
import type { ListingFilterConfig } from './listingFilterConfig.ts';
import { hasListingQueryFilters, type ListingQuery, type ListingQueryKey } from './listingQuery.ts';

export type ListingFilterChipKey = ListingQueryKey | `facet:${string}`;

export type ListingFilterChip = {
  key: ListingFilterChipKey;
  label: string;
};

function formatDollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

export function hasListingFilters(query: ListingQuery): boolean {
  return hasListingQueryFilters(query);
}

function facetValueLabel(facets: MarketplaceFacetDef[], key: string, value: string): string {
  const facet = facets.find(item => item.key === key);
  const option = facet?.options.find(item => item.value === value);
  return option?.label ?? value;
}

export function buildListingFilterChips(
  query: ListingQuery,
  config: ListingFilterConfig,
  facets: MarketplaceFacetDef[] = [],
): ListingFilterChip[] {
  const chips: ListingFilterChip[] = [];
  const brandLabel = config.labels.brand ?? 'Brand';
  const modelLabel = config.labels.model ?? 'Model / Type';
  const usageLabel = config.labels.usage ?? 'Usage';
  const conditionLabel = config.labels.condition ?? 'Condition';
  const yearLabel = config.labels.year ?? 'Year';

  if (query.q) chips.push({ key: 'q', label: `Search: "${query.q}"` });
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
  if (query.sellerName) {
    const sellerLabel = config.labels.sellerName ?? 'Seller';
    chips.push({ key: 'sellerName', label: `${sellerLabel}: ${query.sellerName}` });
  }
  if (query.seller) chips.push({ key: 'seller', label: `Seller: ${query.seller}` });
  if (query.facets) {
    for (const [key, value] of Object.entries(query.facets).sort(([a], [b]) => a.localeCompare(b))) {
      const facet = facets.find(item => item.key === key);
      const label = facet?.label ?? key;
      chips.push({
        key: `facet:${key}`,
        label: `${label}: ${facetValueLabel(facets, key, value)}`,
      });
    }
  }

  return chips;
}
