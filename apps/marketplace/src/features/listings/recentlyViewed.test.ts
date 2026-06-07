import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_RECENT_LISTINGS_MAX,
  readRecentListings,
  recentListingsForCategory,
  trackRecentListing,
  type RecentListingSnapshot,
} from './recentlyViewed.ts';

function snapshot(id: string, slug = 'automotive'): RecentListingSnapshot {
  return {
    listingId: id,
    categorySlug: slug,
    title: `Listing ${id}`,
    imageUrl: `https://cdn.example.com/${id}.jpg`,
    priceCents: 100000,
    sellerName: 'Sample Seller',
    location: 'Springfield, IL',
  };
}

describe('recently viewed listings', () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = new Map<string, string>();
  });

  function storage() {
    return {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => { store.set(key, value); },
    };
  }

  it('stores snapshots with viewedAt and dedupes by listing ID', () => {
    trackRecentListing(snapshot('a'), { storage: storage(), viewedAt: '2026-06-07T10:00:00.000Z' });
    trackRecentListing(snapshot('b'), { storage: storage(), viewedAt: '2026-06-07T11:00:00.000Z' });
    trackRecentListing(snapshot('a', 'watches'), { storage: storage(), viewedAt: '2026-06-07T12:00:00.000Z' });

    expect(readRecentListings(storage())).toEqual([
      {
        ...snapshot('a', 'watches'),
        viewedAt: '2026-06-07T12:00:00.000Z',
      },
      {
        ...snapshot('b'),
        viewedAt: '2026-06-07T11:00:00.000Z',
      },
    ]);
  });

  it('caps stored items at the configured max', () => {
    for (let i = 0; i < DEFAULT_RECENT_LISTINGS_MAX + 4; i += 1) {
      trackRecentListing(snapshot(`listing-${i}`), { storage: storage(), maxItems: 12 });
    }

    expect(readRecentListings(storage())).toHaveLength(12);
    expect(readRecentListings(storage())[0]?.listingId).toBe(`listing-${DEFAULT_RECENT_LISTINGS_MAX + 3}`);
  });

  it('filters by category and excludes the active listing', () => {
    trackRecentListing(snapshot('a', 'automotive'), { storage: storage() });
    trackRecentListing(snapshot('b', 'automotive'), { storage: storage() });
    trackRecentListing(snapshot('c', 'watches'), { storage: storage() });

    expect(recentListingsForCategory('automotive', {
      storage: storage(),
      excludeListingId: 'b',
      limit: 4,
    })).toEqual([
      expect.objectContaining({ listingId: 'a', categorySlug: 'automotive' }),
    ]);
  });

  it('returns an empty list when storage is unavailable', () => {
    trackRecentListing(snapshot('a'), { storage: null });
    expect(readRecentListings(null)).toEqual([]);
  });
});
