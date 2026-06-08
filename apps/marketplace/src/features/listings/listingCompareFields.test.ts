import { describe, expect, it } from 'vitest';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import { buildCompareRows } from './listingCompareFields.ts';
import { buildListingFilterConfig } from './listingFilterConfig.ts';

describe('buildCompareRows', () => {
  it('uses category-safe row labels', () => {
    const config = buildListingFilterConfig('automotive', resolveCategorySchema('AUTOMOTIVE'));
    const labels = buildCompareRows(config).map(row => row.label);
    expect(labels).toEqual(['Year', 'Price', 'Usage']);
  });

  it('omits usage row when category has no usage filter', () => {
    const config = buildListingFilterConfig('ebooks', resolveCategorySchema('EBOOKS'));
    const labels = buildCompareRows(config).map(row => row.label);
    expect(labels).not.toContain('Usage');
    expect(labels).toContain('Price');
  });
});
