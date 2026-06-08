import { describe, expect, it } from 'vitest';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import { buildListingFilterConfig } from './listingFilterConfig.ts';
import { relaxationActionLabel, suggestFilterRelaxation } from './listingFilterRelaxation.ts';

describe('suggestFilterRelaxation', () => {
  const config = buildListingFilterConfig('automotive', resolveCategorySchema('AUTOMOTIVE'));

  it('removes the narrowest active filter first', () => {
    const suggestion = suggestFilterRelaxation({
      brand: 'Toyota',
      model: 'Camry',
      condition: 'USED',
    }, config);

    expect(suggestion?.removedKey).toBe('model');
    expect(suggestion?.query).toEqual({
      brand: 'Toyota',
      condition: 'USED',
    });
    expect(relaxationActionLabel(suggestion!)).toBe('Remove Model / Type: Camry');
  });

  it('returns null when no filters are active', () => {
    expect(suggestFilterRelaxation({}, config)).toBeNull();
  });
});
