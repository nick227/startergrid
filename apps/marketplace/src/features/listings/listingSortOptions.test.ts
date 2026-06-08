import { describe, expect, it } from 'vitest';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import { buildListingFilterConfig } from './listingFilterConfig.ts';
import { buildListingSortOptions } from './listingSortOptions.ts';

describe('buildListingSortOptions', () => {
  it('uses category-safe usage and year labels for automotive', () => {
    const config = buildListingFilterConfig('automotive', resolveCategorySchema('AUTOMOTIVE'));
    const labels = buildListingSortOptions(config).map(option => option.label);
    expect(labels).toContain('Usage: low to high');
    expect(labels).toContain('Year: newest first');
    expect(labels).not.toContain('Mileage: low to high');
  });

  it('omits usage sort when category has no usage filter', () => {
    const config = buildListingFilterConfig('ebooks', resolveCategorySchema('EBOOKS'));
    const values = buildListingSortOptions(config).map(option => option.value);
    expect(values).not.toContain('mileage-asc');
  });
});
