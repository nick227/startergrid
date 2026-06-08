import { describe, expect, it } from 'vitest';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import { buildListingFilterChips, hasListingFilters } from './listingFilterChips.ts';
import { buildListingFilterConfig } from './listingFilterConfig.ts';

describe('listing filter chips', () => {
  const automotiveConfig = buildListingFilterConfig('automotive', resolveCategorySchema('AUTOMOTIVE'));

  it('detects active listing filters', () => {
    expect(hasListingFilters({ brand: 'Toyota' })).toBe(true);
    expect(hasListingFilters({})).toBe(false);
  });

  it('builds category-safe chip labels', () => {
    expect(buildListingFilterChips({
      brand: 'Toyota',
      model: 'Camry',
      usageMax: 50000,
    }, automotiveConfig)).toEqual([
      { key: 'brand', label: 'Brand: Toyota' },
      { key: 'model', label: 'Model / Type: Camry' },
      { key: 'usageMax', label: 'Max usage: 50,000' },
    ]);
  });
});
