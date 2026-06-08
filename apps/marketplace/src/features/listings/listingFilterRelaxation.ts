import { buildListingFilterChips } from './listingFilterChips.ts';
import type { ListingFilterConfig } from './listingFilterConfig.ts';
import type { ListQuery } from '../../lib/routes.ts';

const RELAXATION_ORDER: (keyof ListQuery)[] = [
  'model',
  'make',
  'condition',
  'maxMileage',
  'minPrice',
  'maxPrice',
  'dealer',
];

export type FilterRelaxationSuggestion = {
  query: ListQuery;
  removedKey: keyof ListQuery;
  removedLabel: string;
};

function isActiveFilterValue(key: keyof ListQuery, query: ListQuery): boolean {
  const value = query[key];
  if (value == null) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  return true;
}

export function suggestFilterRelaxation(
  query: ListQuery,
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
