import { describe, expect, it, beforeEach, vi } from 'vitest';
import {
  BUYER_LOCATION_STORAGE_KEY,
  clearBuyerLocationPreference,
  commitBuyerLocationDraft,
  readBuyerLocationPreference,
  resolveBuyerGeoApiParams,
  saveBuyerLocationPreference,
  setBuyerLocationNationwide,
} from './buyerLocation.ts';
import * as postalLookup from './postalCoordinateLookup.ts';

describe('buyer location preference', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    globalThis.sessionStorage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
      removeItem: (key: string) => { store.delete(key); },
      clear: () => { store.clear(); },
      key: (index: number) => [...store.keys()][index] ?? null,
      get length() { return store.size; },
    };
    clearBuyerLocationPreference();
  });

  it('persists preference in sessionStorage', () => {
    saveBuyerLocationPreference({
      postalCode: '78701',
      lat: 30.2672,
      lng: -97.7431,
      radiusMiles: 50,
      nationwide: false,
    });
    const raw = sessionStorage.getItem(BUYER_LOCATION_STORAGE_KEY);
    expect(raw).toContain('78701');
    expect(readBuyerLocationPreference()).toEqual({
      postalCode: '78701',
      lat: 30.2672,
      lng: -97.7431,
      radiusMiles: 50,
      nationwide: false,
    });
  });

  it('sends geo params only when coordinates are resolved', () => {
    expect(resolveBuyerGeoApiParams(null)).toEqual({});
    expect(resolveBuyerGeoApiParams({
      postalCode: '78701',
      radiusMiles: 50,
      nationwide: false,
    })).toEqual({});
    expect(resolveBuyerGeoApiParams({
      postalCode: '78701',
      lat: 30.2672,
      lng: -97.7431,
      radiusMiles: 100,
      nationwide: false,
    })).toEqual({
      buyerLat: 30.2672,
      buyerLng: -97.7431,
      radiusMiles: 100,
      nationwide: false,
    });
  });

  it('nationwide disables geo coordinate params', () => {
    expect(resolveBuyerGeoApiParams({
      postalCode: '78701',
      lat: 30.2672,
      lng: -97.7431,
      radiusMiles: 50,
      nationwide: true,
    })).toEqual({ nationwide: true });
  });

  it('clearing location removes sessionStorage entry', () => {
    saveBuyerLocationPreference({
      lat: 30.2672,
      lng: -97.7431,
      radiusMiles: 50,
      nationwide: false,
    });
    clearBuyerLocationPreference();
    expect(sessionStorage.getItem(BUYER_LOCATION_STORAGE_KEY)).toBeNull();
    expect(resolveBuyerGeoApiParams(readBuyerLocationPreference())).toEqual({});
  });

  it('does not invent coordinates when postal lookup is unavailable', () => {
    vi.spyOn(postalLookup, 'lookupPostalCoordinates').mockReturnValue(null);
    const saved = commitBuyerLocationDraft({
      postalCode: '78701',
      radiusMiles: 50,
      nationwide: false,
    });
    expect(saved.lat).toBeUndefined();
    expect(saved.lng).toBeUndefined();
    expect(resolveBuyerGeoApiParams(saved)).toEqual({});
  });

  it('stores resolved coordinates when lookup succeeds', () => {
    vi.spyOn(postalLookup, 'lookupPostalCoordinates').mockReturnValue({
      lat: 30.2672,
      lng: -97.7431,
    });
    const saved = commitBuyerLocationDraft({
      postalCode: '78701',
      radiusMiles: 25,
      nationwide: false,
    });
    expect(saved).toMatchObject({
      postalCode: '78701',
      lat: 30.2672,
      lng: -97.7431,
      radiusMiles: 25,
      nationwide: false,
    });
    expect(resolveBuyerGeoApiParams(saved)).toEqual({
      buyerLat: 30.2672,
      buyerLng: -97.7431,
      radiusMiles: 25,
      nationwide: false,
    });
  });

  it('resolves bundled ZIP centroids for Austin 78701 without mocks', () => {
    const saved = commitBuyerLocationDraft({
      postalCode: '78701',
      radiusMiles: 50,
      nationwide: false,
    });
    expect(saved.lat).toBeTypeOf('number');
    expect(saved.lng).toBeTypeOf('number');
    expect(resolveBuyerGeoApiParams(saved).buyerLat).toBe(saved.lat);
    expect(resolveBuyerGeoApiParams(saved).radiusMiles).toBe(50);
  });

  it('setBuyerLocationNationwide stores nationwide-only preference', () => {
    setBuyerLocationNationwide(true);
    expect(resolveBuyerGeoApiParams(readBuyerLocationPreference())).toEqual({
      nationwide: true,
    });
  });
});
