import { describe, expect, it } from 'vitest';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import {
  buildListingFacetConfig,
  sanitizeListingFacets,
} from './listingFacetConfig.ts';
import { buildListingFilterConfig } from './listingFilterConfig.ts';

describe('buildListingFacetConfig', () => {
  it('exposes automotive enum facets from schema labels', () => {
    const schema = resolveCategorySchema('AUTOMOTIVE');
    const { facets } = buildListingFacetConfig(schema);

    expect(facets.map(f => f.key)).toEqual(['bodyStyle', 'drivetrain', 'fuelType', 'transmission']);
    expect(facets.find(f => f.key === 'bodyStyle')?.label).toBe('Body style');
    expect(facets.find(f => f.key === 'drivetrain')?.options).toEqual(
      expect.arrayContaining([{ value: 'AWD', label: 'AWD' }]),
    );
  });

  it('exposes boats vessel type facet backed by category payload', () => {
    const schema = resolveCategorySchema('BOATS');
    const { facets } = buildListingFacetConfig(schema);

    expect(facets).toHaveLength(1);
    expect(facets[0]).toMatchObject({
      key: 'vesselType',
      label: 'Vessel type',
      filterStorage: { storage: 'categoryPayload', payloadKey: 'vesselType' },
    });
  });

  it('exposes trailers unit type facet backed by category payload', () => {
    const schema = resolveCategorySchema('TRAILERS_POWERSPORTS_RV');
    const { facets } = buildListingFacetConfig(schema);

    expect(facets).toHaveLength(1);
    expect(facets[0]).toMatchObject({
      key: 'unitType',
      label: 'Unit type',
      filterStorage: { storage: 'categoryPayload', payloadKey: 'unitType' },
    });
  });

  it('fails closed for categories without enum or boolean facet fields', () => {
    // SONGS has only text/identifier/currency fields — no facetable enum or boolean.
    const schema = resolveCategorySchema('SONGS');
    expect(buildListingFacetConfig(schema).facets).toEqual([]);
    expect(buildListingFilterConfig('songs', schema).facets).toEqual([]);
  });

  it('exposes ebooks format enum facet backed by category payload', () => {
    const schema = resolveCategorySchema('EBOOKS');
    const { facets } = buildListingFacetConfig(schema);

    expect(facets).toHaveLength(1);
    expect(facets[0]).toMatchObject({
      key: 'format',
      label: 'Format',
      kind: 'enum',
      filterStorage: { storage: 'categoryPayload', payloadKey: 'format' },
    });
    expect(facets[0].options.map((o: { value: string }) => o.value)).toContain('epub');
  });

  it('drops unknown or invalid facet values', () => {
    const schema = resolveCategorySchema('AUTOMOTIVE');
    expect(sanitizeListingFacets(schema, { bodyStyle: 'Sedan', drivetrain: 'HOVER' })).toEqual({
      bodyStyle: 'Sedan',
    });
    expect(sanitizeListingFacets(schema, { freeText: 'nope' })).toBeUndefined();
  });
});
