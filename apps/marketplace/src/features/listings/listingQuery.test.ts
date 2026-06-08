import { describe, expect, it } from 'vitest';
import {
  fromListQuery,
  hasListingQueryFilters,
  listingQuerySignature,
  toListQuery,
} from './listingQuery.ts';

describe('listingQuery adapter', () => {
  it('maps semantic fields to legacy list query params', () => {
    expect(toListQuery({
      brand: 'Toyota',
      model: 'Camry',
      usageMax: 50000,
      yearMin: 2020,
      yearMax: 2024,
      priceMin: 10000_00,
      priceMax: 30000_00,
      seller: 'dealer-1',
      condition: 'USED',
      sortBy: 'mileage-asc',
      q: 'camry sedan',
    })).toEqual({
      make: 'Toyota',
      model: 'Camry',
      maxMileage: 50000,
      minYear: 2020,
      maxYear: 2024,
      minPrice: 10000_00,
      maxPrice: 30000_00,
      dealer: 'dealer-1',
      condition: 'USED',
      sortBy: 'mileage-asc',
      q: 'camry sedan',
    });
  });

  it('round-trips through fromListQuery', () => {
    const legacy = {
      make: 'Honda',
      model: 'Civic',
      maxMileage: 12000,
      minYear: 2019,
      sortBy: 'newest' as const,
    };
    expect(toListQuery(fromListQuery(legacy))).toEqual(legacy);
  });

  it('detects active listing query filters', () => {
    expect(hasListingQueryFilters({ brand: 'Ford' })).toBe(true);
    expect(hasListingQueryFilters({ q: 'camry' })).toBe(true);
    expect(hasListingQueryFilters({})).toBe(false);
  });

  it('builds a stable signature for feed cache keys', () => {
    const a = listingQuerySignature({ brand: 'A', sortBy: 'newest' });
    const b = listingQuerySignature({ brand: 'A', sortBy: 'newest' });
    const c = listingQuerySignature({ brand: 'B', sortBy: 'newest' });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
  });
});
