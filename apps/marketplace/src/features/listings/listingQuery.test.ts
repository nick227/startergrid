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

  it('round-trips facet selections through list query params', () => {
    const semantic = {
      brand: 'Toyota',
      facets: { bodyStyle: 'Sedan', drivetrain: 'AWD' },
    };
    const legacy = toListQuery(semantic);
    expect(legacy.facets).toEqual({ bodyStyle: 'Sedan', drivetrain: 'AWD' });
    expect(legacy.facetsParam).toBe('bodyStyle:Sedan,drivetrain:AWD');
    expect(fromListQuery(legacy)).toEqual(semantic);
  });

  it('detects facet-only filters as active', () => {
    expect(hasListingQueryFilters({ facets: { bodyStyle: 'SUV' } })).toBe(true);
  });

  it('keeps sellerName and brand as separate list query params', () => {
    const result = toListQuery({ sellerName: 'Coldwell Banker', brand: 'Toyota' });
    expect(result.sellerName).toBe('Coldwell Banker');
    expect(result.make).toBe('Toyota');
  });

  it('fromListQuery restores sellerName from URL and leaves brand undefined', () => {
    const result = fromListQuery({ sellerName: 'Coldwell Banker', make: 'Coldwell Banker' });
    expect(result.sellerName).toBe('Coldwell Banker');
    expect(result.brand).toBeUndefined();
  });

  it('fromListQuery keeps brand when no sellerName is in URL', () => {
    const result = fromListQuery({ make: 'Toyota' });
    expect(result.brand).toBe('Toyota');
    expect(result.sellerName).toBeUndefined();
  });

  it('round-trips sellerName through toListQuery and fromListQuery', () => {
    const original = { sellerName: 'Coldwell Banker', model: 'Studio' };
    const roundTripped = fromListQuery(toListQuery(original));
    expect(roundTripped.sellerName).toBe('Coldwell Banker');
    expect(roundTripped.model).toBe('Studio');
    expect(roundTripped.brand).toBeUndefined();
  });

  it('detects sellerName as an active filter', () => {
    expect(hasListingQueryFilters({ sellerName: 'Coldwell' })).toBe(true);
    expect(hasListingQueryFilters({ sellerName: '' })).toBe(false);
  });

  it('includes sellerName in query signature for saved search dedupe', () => {
    const a = listingQuerySignature({ sellerName: 'Coldwell' });
    const b = listingQuerySignature({ sellerName: 'Coldwell' });
    const c = listingQuerySignature({ sellerName: 'ReMax' });
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).not.toBe(listingQuerySignature({ brand: 'Coldwell' }));
  });
});
