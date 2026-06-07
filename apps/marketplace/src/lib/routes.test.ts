import { describe, expect, it } from 'vitest';
import {
  categoryIdToSlug,
  categorySlugToId,
  listMarketplaceCategories,
} from '@auto-dealer/category-schemas';
import {
  DEFAULT_CATEGORY_SLUG,
  favoritesHref,
  listingHref,
  listHref,
  parseRoute,
  sellerHref,
} from './routes.ts';

describe('category slug helpers', () => {
  it('maps enum ids to kebab-case slugs', () => {
    expect(categoryIdToSlug('AUTOMOTIVE')).toBe('automotive');
    expect(categoryIdToSlug('VACATION_RENTALS')).toBe('vacation-rentals');
  });

  it('resolves slugs back to enum ids', () => {
    expect(categorySlugToId('automotive')).toBe('AUTOMOTIVE');
    expect(categorySlugToId('vacation-rentals')).toBe('VACATION_RENTALS');
    expect(categorySlugToId('unknown')).toBeNull();
  });

  it('lists consumer-enabled marketplace categories', () => {
    const categories = listMarketplaceCategories();
    expect(categories).toHaveLength(2);
    expect(categories.every(c => c.marketplace.consumerEnabled)).toBe(true);
    expect(categories.some(c => c.id === 'AUTOMOTIVE')).toBe(true);
    expect(categories.some(c => c.id === 'TRAILERS_POWERSPORTS_RV')).toBe(true);
  });
});

describe('parseRoute', () => {
  function withHash(hash: string) {
    return parseRouteFromHash(hash);
  }

  it('returns sites index for empty hash', () => {
    expect(withHash('#/')).toEqual({ page: 'sites' });
    expect(withHash('#')).toEqual({ page: 'sites' });
  });

  it('parses category feed routes', () => {
    expect(withHash('#/automotive/')).toEqual({
      page: 'list',
      slug: 'automotive',
      query: {},
    });
    expect(withHash('#/watches/?make=Rolex')).toEqual({
      page: 'list',
      slug: 'watches',
      query: { make: 'Rolex' },
    });
  });

  it('parses listing and seller routes', () => {
    expect(withHash('#/automotive/listing/abc123')).toEqual({
      page: 'listing',
      slug: 'automotive',
      listingId: 'abc123',
    });
    expect(withHash('#/automotive/seller/dealer-1')).toEqual({
      page: 'seller',
      slug: 'automotive',
      sellerId: 'dealer-1',
    });
    expect(withHash('#/automotive/favorites')).toEqual({
      page: 'favorites',
      slug: 'automotive',
    });
  });

  it('redirects legacy routes to automotive equivalents', () => {
    expect(withHash('#/listing/abc123')).toEqual({
      page: 'redirect',
      href: listingHref(DEFAULT_CATEGORY_SLUG, 'abc123'),
    });
    expect(withHash('#/dealer/dealer-1')).toEqual({
      page: 'redirect',
      href: sellerHref(DEFAULT_CATEGORY_SLUG, 'dealer-1'),
    });
    expect(withHash('#/favorites')).toEqual({
      page: 'redirect',
      href: favoritesHref(DEFAULT_CATEGORY_SLUG),
    });
    expect(withHash('#/?make=Toyota')).toEqual({
      page: 'redirect',
      href: listHref(DEFAULT_CATEGORY_SLUG, { make: 'Toyota' }),
    });
  });
});

describe('href builders', () => {
  it('builds category-scoped hrefs', () => {
    expect(listHref('automotive', { make: 'Honda' })).toBe('#/automotive/?make=Honda');
    expect(listingHref('watches', 'x1')).toBe('#/watches/listing/x1');
    expect(sellerHref('ebooks', 'seller-9')).toBe('#/ebooks/seller/seller-9');
    expect(favoritesHref('automotive')).toBe('#/automotive/favorites');
  });
});

function parseRouteFromHash(hash: string) {
  const prior = globalThis.window;
  globalThis.window = { location: { hash } } as Window & typeof globalThis;
  try {
    return parseRoute();
  } finally {
    globalThis.window = prior;
  }
}
