import { describe, expect, it } from 'vitest';
import {
  isGeoRadiusSearchActive,
  nextGeoRadiusMiles,
  suggestGeoRelaxation,
} from './listingGeoRelaxation.ts';
import type { BuyerLocationPreference } from './buyerLocation.ts';

const activePreference: BuyerLocationPreference = {
  postalCode: '78701',
  lat: 30.27,
  lng: -97.74,
  radiusMiles: 50,
  nationwide: false,
};

describe('listingGeoRelaxation', () => {
  it('detects active geo radius search', () => {
    expect(isGeoRadiusSearchActive(activePreference)).toBe(true);
    expect(isGeoRadiusSearchActive({ ...activePreference, nationwide: true })).toBe(false);
    expect(isGeoRadiusSearchActive({ ...activePreference, lat: undefined })).toBe(false);
  });

  it('suggests expanding radius then nationwide', () => {
    const actions = suggestGeoRelaxation(activePreference);
    expect(actions).toEqual([
      { type: 'expand_radius', radiusMiles: 100, label: 'Expand to 100 miles' },
      { type: 'nationwide', label: 'Search nationwide' },
    ]);
  });

  it('suggests only nationwide at max radius', () => {
    const actions = suggestGeoRelaxation({ ...activePreference, radiusMiles: 500 });
    expect(actions).toEqual([{ type: 'nationwide', label: 'Search nationwide' }]);
  });

  it('returns no actions when geo radius is inactive', () => {
    expect(suggestGeoRelaxation(null)).toEqual([]);
  });

  it('steps through radius options in order', () => {
    expect(nextGeoRadiusMiles(25)).toBe(50);
    expect(nextGeoRadiusMiles(500)).toBeNull();
  });
});
