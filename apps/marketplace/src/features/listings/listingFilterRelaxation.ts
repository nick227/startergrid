import { buildListingFilterChips } from './listingFilterChips.ts';
import type { ListingFilterConfig } from './listingFilterConfig.ts';
import type { ListingQuery, ListingQueryKey } from './listingQuery.ts';

const RELAXATION_ORDER: ListingQueryKey[] = [
  'model',
  'brand',
  'sellerName',
  'condition',
  'usageMax',
  'priceMin',
  'priceMax',
  'seller',
  'yearMin',
  'yearMax',
];

export type FilterRelaxationSuggestion = {
  query: ListingQuery;
  removedKey: ListingQueryKey;
  removedLabel: string;
};

function isActiveFilterValue(key: ListingQueryKey, query: ListingQuery): boolean {
  const value = query[key];
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function suggestFilterRelaxation(
  query: ListingQuery,
  config: ListingFilterConfig,
): FilterRelaxationSuggestion | null {
  const chips = buildListingFilterChips(query, config);
  if (chips.length === 0) return null;

  for (const key of RELAXATION_ORDER) {
    if (!isActiveFilterValue(key, query)) continue;
    const chip = chips.find(entry => entry.key === key);
    if (!chip) continue;
    return {
      query: { ...query, [key]: undefined, page: undefined },
      removedKey: key,
      removedLabel: chip.label,
    };
  }

  return null;
}

export function relaxationActionLabel(suggestion: FilterRelaxationSuggestion): string {
  return `Remove ${suggestion.removedLabel}`;
}
