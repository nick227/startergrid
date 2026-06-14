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
  profileHref,
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
    expect(categories).toHaveLength(4);
    expect(categories.every(c => c.marketplace.consumerEnabled)).toBe(true);
    expect(categories.some(c => c.id === 'AUTOMOTIVE')).toBe(true);
    expect(categories.some(c => c.id === 'TRAILERS_POWERSPORTS_RV')).toBe(true);
    expect(categories.some(c => c.id === 'BOATS')).toBe(true);
    expect(categories.some(c => c.id === 'EBOOKS')).toBe(true);
    expect(categoryIdToSlug('BOATS')).toBe('boats');
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
    expect(withHash('#/boats/?make=Boston+Whaler')).toEqual({
      page: 'list',
      slug: 'boats',
      query: { make: 'Boston Whaler' },
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
    expect(withHash('#/automotive/listing/2022-chevrolet-silverado-1500?id=veh_0069')).toEqual({
      page: 'listing',
      slug: 'automotive',
      listingId: 'veh_0069',
    });
    expect(withHash('#/automotive/listing/2022-chevrolet-silverado-1500-veh_0069')).toEqual({
      page: 'listing',
      slug: 'automotive',
      listingId: 'veh_0069',
    });
    expect(withHash('#/automotive/listing/2021-bmw-330i-cmqapsgk8008outrc5cs89w45')).toEqual({
      page: 'listing',
      slug: 'automotive',
      listingId: 'cmqapsgk8008outrc5cs89w45',
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
    expect(withHash('#/automotive/profile')).toEqual({
      page: 'profile',
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
    expect(withHash('#/profile')).toEqual({
      page: 'redirect',
      href: profileHref(DEFAULT_CATEGORY_SLUG),
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
    expect(listingHref('automotive', 'veh_0069', '2022 Chevrolet Silverado 1500')).toBe('#/automotive/listing/2022-chevrolet-silverado-1500?id=veh_0069');
    expect(sellerHref('ebooks', 'seller-9')).toBe('#/ebooks/seller/seller-9');
    expect(favoritesHref('automotive')).toBe('#/automotive/favorites');
    expect(profileHref('automotive')).toBe('#/automotive/profile');
  });

  it('round-trips facet params in list hrefs', () => {
    const href = listHref('automotive', {
      make: 'Toyota',
      facets: { bodyStyle: 'Sedan', drivetrain: 'AWD' },
    });
    expect(href).toBe('#/automotive/?make=Toyota&facet.bodyStyle=Sedan&facet.drivetrain=AWD');
    expect(parseRouteFromHash(href)).toEqual({
      page: 'list',
      slug: 'automotive',
      query: {
        make: 'Toyota',
        facets: { bodyStyle: 'Sedan', drivetrain: 'AWD' },
      },
    });
  });

  it('serializes sellerName as a distinct URL param, not make', () => {
    const href = listHref('apartments', { sellerName: 'Coldwell Banker' });
    expect(href).toBe('#/apartments/?sellerName=Coldwell+Banker');
    expect(href).not.toContain('make=');
  });

  it('round-trips sellerName through URL serialization', () => {
    const href = listHref('apartments', { sellerName: 'Coldwell Banker' });
    expect(parseRouteFromHash(href)).toEqual({
      page: 'list',
      slug: 'apartments',
      query: { sellerName: 'Coldwell Banker' },
    });
  });

  it('make and sellerName are independent URL params', () => {
    const hrefWithMake = listHref('automotive', { make: 'Toyota' });
    const routeWithMake = parseRouteFromHash(hrefWithMake);
    expect(routeWithMake).toMatchObject({ query: { make: 'Toyota' } });
    if (routeWithMake.page === 'list') expect(routeWithMake.query.sellerName).toBeUndefined();

    const hrefWithSeller = listHref('apartments', { sellerName: 'Coldwell' });
    const routeWithSeller = parseRouteFromHash(hrefWithSeller);
    if (routeWithSeller.page === 'list') {
      expect(routeWithSeller.query.sellerName).toBe('Coldwell');
      expect(routeWithSeller.query.make).toBeUndefined();
    }
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
