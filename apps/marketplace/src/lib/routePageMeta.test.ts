import { describe, expect, it } from 'vitest';
import { listRoutePageMeta, routePageMeta } from './routePageMeta.ts';

describe('routePageMeta', () => {
  it('sets a title for the marketplace sites index', () => {
    expect(routePageMeta({ page: 'sites' })).toMatchObject({
      title: 'Marketplaces',
    });
  });

  it('sets category-scoped titles for account pages', () => {
    expect(routePageMeta({ page: 'favorites', slug: 'boats' })).toMatchObject({
      title: 'Saved boats',
    });
    expect(routePageMeta({ page: 'profile', slug: 'automotive' })).toMatchObject({
      title: 'Your profile',
    });
  });

  it('sets fallback titles for detail and seller routes before data loads', () => {
    expect(routePageMeta({ page: 'listing', slug: 'automotive', listingId: 'abc' })).toMatchObject({
      title: 'vehicle details',
    });
    expect(routePageMeta({ page: 'seller', slug: 'ebooks', sellerId: 'seller-1' })).toMatchObject({
      title: 'E-books seller',
    });
  });
});

describe('listRoutePageMeta', () => {
  it('uses the category asset plural for a plain feed route', () => {
    expect(listRoutePageMeta('automotive')).toMatchObject({
      title: 'Browse vehicles',
    });
    expect(listRoutePageMeta('boats')).toMatchObject({
      title: 'Browse boats',
    });
  });

  it('includes search, condition, make, model, and price from the route query', () => {
    expect(listRoutePageMeta('automotive', {
      q: 'hybrid',
      condition: 'USED',
      make: 'Toyota',
      model: 'Camry',
      maxPrice: 2500000,
    })).toMatchObject({
      title: '"hybrid" Used Toyota Camry under $25,000 vehicles',
    });
  });

  it('includes seller and facet location from the route query', () => {
    expect(listRoutePageMeta('automotive', {
      sellerName: 'Prairie Ridge Motors',
      facets: { bodyStyle: 'SUV', drivetrain: 'AWD' },
    })).toMatchObject({
      title: 'Prairie Ridge Motors SUV AWD vehicles',
    });
  });
});
