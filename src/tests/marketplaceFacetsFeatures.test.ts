import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { getMarketplaceFacets } from '../services/marketplace/marketplaceQueryService.js';

describe('Marketplace Facets Features', () => {
  it('Automotive returns brand/model dropdown facets', async () => {
    const prisma = {
      vehicle: {
        groupBy: async () => [
          { make: 'Toyota', _count: { make: 10 } },
        ],
        count: async () => 10,
        aggregate: async () => ({
          _min: { priceCents: 10000, year: 2010, mileage: 0 },
          _max: { priceCents: 50000, year: 2020, mileage: 50000 },
        }),
      },
    } as unknown as PrismaClient;

    const result = await getMarketplaceFacets(prisma, { category: 'AUTOMOTIVE' });

    assert.ok(result.brandFacets, 'brandFacets should be present for AUTOMOTIVE');
    assert.ok(result.modelFacets, 'modelFacets should be present for AUTOMOTIVE');
    assert.equal(result.brandFacets.length, 1);
    assert.equal(result.brandFacets[0].value, 'Toyota');
  });

  it('EBOOKS omits brand/model facets', async () => {
    const prisma = {
      categoryInventoryItem: {
        count: async () => 0,
        aggregate: async () => ({
          _min: { priceCents: 100 },
          _max: { priceCents: 1500 },
        }),
      },
    } as unknown as PrismaClient;

    const result = await getMarketplaceFacets(prisma, { category: 'EBOOKS' });

    // Ebooks should omit brand/model for text-input fallback
    assert.equal(result.brandFacets, undefined, 'brandFacets should be omitted for EBOOKS');
    assert.equal(result.modelFacets, undefined, 'modelFacets should be omitted for EBOOKS');
  });

  it('Generic enum facets render through customFacets (BOATS)', async () => {
    const prisma = {
      categoryInventoryItem: {
        count: async () => 5, // mock count for all custom facets
        aggregate: async () => ({
          _min: { priceCents: 100 },
          _max: { priceCents: 1500 },
        }),
      },
    } as unknown as PrismaClient;

    const result = await getMarketplaceFacets(prisma, { category: 'BOATS' });

    // Generic enum facets should render through customFacets
    assert.ok(result.customFacets, 'customFacets should be present');
    assert.ok(result.customFacets['vesselType'], 'vesselType enum facet should be present');
    assert.equal(result.customFacets['vesselType'][0].value, 'Center Console');
  });

  it('Range options include min/max', async () => {
    const prisma = {
      categoryInventoryItem: {
        count: async () => 1,
        aggregate: async () => ({
          _min: { priceCents: 500 },
          _max: { priceCents: 2000 },
        }),
      },
    } as unknown as PrismaClient;

    const result = await getMarketplaceFacets(prisma, { category: 'EBOOKS' });

    assert.ok(result.priceRanges, 'priceRanges should be present');
    assert.ok(result.priceRanges.length > 0, 'priceRanges should have entries');
    assert.ok('min' in result.priceRanges[0], 'range option must include min');
    assert.ok('max' in result.priceRanges[0], 'range option must include max');
  });
});
