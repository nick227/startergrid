import { describe, expect, it, beforeEach } from 'vitest';
import { MarketplaceCardMediaItem, MarketplaceVehicleCard } from '@dealer-marketplace/client';
import { feedFilterKey, getSavedFeedState, saveFeedState } from './feedState.ts';
import type { MarketplaceFeedItem } from './api.ts';

const vehicleItem: MarketplaceFeedItem = {
  type: 'vehicle',
  id: 'vehicle:v1',
  impressionKey: 'vehicle:v1',
  vehicle: {
    listingId: 'v1',
    stockNumber: 'S1',
    year: 2024,
    make: 'Toyota',
    model: 'Camry',
    trim: 'SE',
    condition: MarketplaceVehicleCard.condition.USED,
    priceCents: 2500000,
    mileage: 12000,
    exteriorColor: 'Black',
    mediaUrls: ['https://cdn.example.com/1.jpg'],
    mediaItems: [{
      kind: MarketplaceCardMediaItem.kind.IMAGE,
      url: 'https://cdn.example.com/1.jpg',
      width: 1200,
      height: 900,
      mimeType: 'image/jpeg',
      posterUrl: null,
    }],
    dealerId: 'dealer-1',
    dealerName: 'Prairie Ridge Motors',
    dealerCity: 'Springfield',
    dealerState: 'IL',
    listingUrl: '/marketplace/dealers/dealer-1/S1',
    listedAt: '2026-06-01T00:00:00.000Z',
  },
};

describe('feed state persistence', () => {
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
  });

  it('uses a stable filter key for active feed filters', () => {
    expect(feedFilterKey('automotive', {
      brand: 'Toyota',
      model: 'Camry',
      condition: 'USED',
      priceMin: 1000000,
      priceMax: 3000000,
      usageMax: 50000,
    })).toBe(feedFilterKey('automotive', {
      brand: 'Toyota',
      model: 'Camry',
      condition: 'USED',
      priceMin: 1000000,
      priceMax: 3000000,
      usageMax: 50000,
    }));
  });

  it('restores saved feed items, cursor, and scroll position for matching filters', () => {
    const filterKey = feedFilterKey('automotive', { brand: 'Toyota' });
    saveFeedState({
      filterKey,
      items: [vehicleItem],
      nextCursor: 'cursor-1',
      totalEstimate: 10,
      scrollY: 420,
    });

    expect(getSavedFeedState(filterKey)).toMatchObject({
      items: [vehicleItem],
      nextCursor: 'cursor-1',
      totalEstimate: 10,
      scrollY: 420,
    });
  });

  it('does not restore state for different filters', () => {
    saveFeedState({
      filterKey: feedFilterKey('automotive', { brand: 'Toyota' }),
      items: [vehicleItem],
      nextCursor: null,
      totalEstimate: 1,
      scrollY: 0,
    });

    expect(getSavedFeedState(feedFilterKey('automotive', { brand: 'Honda' }))).toBeNull();
  });
});
