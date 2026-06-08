// Hash-based routing for the multi-site marketplace app.
//
// Routes:
//   #/                          → sites index
//   #/{slug}/                   → category feed
//   #/{slug}/listing/{id}       → item detail (automotive VDP in Phase 2)
//   #/{slug}/seller/{id}        → seller storefront
//   #/{slug}/favorites          → saved listings (category-scoped)
//
// Legacy redirects:
//   #/listing/:id               → #/automotive/listing/:id
//   #/dealer/:id                → #/automotive/seller/:id
//   #/favorites                 → #/automotive/favorites
//   #/?filters                  → #/automotive/?filters

import { categorySlugToId } from '@auto-dealer/category-schemas';

export const DEFAULT_CATEGORY_SLUG = 'automotive';

export type MarketplaceRoute =
  | { page: 'sites' }
  | { page: 'list'; slug: string; query: ListQuery }
  | { page: 'listing'; slug: string; listingId: string }
  | { page: 'seller'; slug: string; sellerId: string }
  | { page: 'favorites'; slug: string }
  | { page: 'redirect'; href: string };

export type SortBy = 'newest' | 'price-asc' | 'price-desc' | 'mileage-asc' | 'year-asc' | 'year-desc';

export type ListQuery = {
  make?:      string;
  model?:     string;
  condition?: 'NEW' | 'USED' | 'CPO';
  minPrice?:   number;
  maxPrice?:   number;
  maxMileage?: number;
  minYear?:    number;
  maxYear?:    number;
  sortBy?:     SortBy;
  dealer?:     string;
  page?:      number;
};

const SORT_VALUES: SortBy[] = ['newest', 'price-asc', 'price-desc', 'mileage-asc', 'year-asc', 'year-desc'];

function parseHashQuery(search: string): ListQuery {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const condition = params.get('condition');
  const sortRaw = params.get('sortBy');
  const pageRaw = params.get('page');
  const page = pageRaw ? Number(pageRaw) : undefined;
  const minPrice = parseNonNegative(params.get('minPrice'));
  const maxPrice = parseNonNegative(params.get('maxPrice'));
  const maxMileage = parseNonNegative(params.get('maxMileage'));
  const minYear = parseNonNegative(params.get('minYear'));
  const maxYear = parseNonNegative(params.get('maxYear'));

  return {
    make:      params.get('make') || undefined,
    model:     params.get('model') || undefined,
    condition: condition === 'NEW' || condition === 'USED' || condition === 'CPO' ? condition : undefined,
    minPrice,
    maxPrice,
    maxMileage,
    minYear,
    maxYear,
    sortBy:    SORT_VALUES.includes(sortRaw as SortBy) ? (sortRaw as SortBy) : undefined,
    dealer:    params.get('dealer') || undefined,
    page:      page && page > 0 ? page : undefined,
  };
}

function parseNonNegative(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function legacyRedirect(path: string, search: string): MarketplaceRoute | null {
  const listingMatch = path.match(/^listing\/([^/]+)$/);
  if (listingMatch) {
    return { page: 'redirect', href: listingHref(DEFAULT_CATEGORY_SLUG, listingMatch[1]!) };
  }

  const dealerMatch = path.match(/^dealer\/([^/]+)$/);
  if (dealerMatch) {
    return { page: 'redirect', href: sellerHref(DEFAULT_CATEGORY_SLUG, dealerMatch[1]!) };
  }

  if (path === 'favorites') {
    return { page: 'redirect', href: favoritesHref(DEFAULT_CATEGORY_SLUG) };
  }

  if (path === '' && search) {
    return { page: 'redirect', href: listHref(DEFAULT_CATEGORY_SLUG, parseHashQuery(search)) };
  }

  return null;
}

function parseCategoryPath(path: string, search: string): MarketplaceRoute | null {
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 0) {
    return { page: 'list', slug: DEFAULT_CATEGORY_SLUG, query: parseHashQuery(search) };
  }

  const slug = segments[0]!;
  if (!categorySlugToId(slug)) return null;

  if (segments.length === 1) {
    return { page: 'list', slug, query: parseHashQuery(search) };
  }

  if (segments[1] === 'listing' && segments[2]) {
    return { page: 'listing', slug, listingId: segments[2]! };
  }

  if (segments[1] === 'seller' && segments[2]) {
    return { page: 'seller', slug, sellerId: segments[2]! };
  }

  if (segments[1] === 'favorites' && segments.length === 2) {
    return { page: 'favorites', slug };
  }

  return null;
}

export function parseRoute(): MarketplaceRoute {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, search = ''] = raw.split('?');

  if (path === '' && !search) return { page: 'sites' };

  const legacy = legacyRedirect(path, search ? `?${search}` : '');
  if (legacy) return legacy;

  const categoryRoute = parseCategoryPath(path, search ? `?${search}` : '');
  if (categoryRoute) return categoryRoute;

  return { page: 'sites' };
}

export function sitesHref(): string {
  return '#/';
}

export function listHref(slug: string, query: ListQuery = {}): string {
  const params = new URLSearchParams();
  if (query.make) params.set('make', query.make);
  if (query.model) params.set('model', query.model);
  if (query.condition) params.set('condition', query.condition);
  if (query.minPrice != null) params.set('minPrice', String(query.minPrice));
  if (query.maxPrice != null) params.set('maxPrice', String(query.maxPrice));
  if (query.maxMileage != null) params.set('maxMileage', String(query.maxMileage));
  if (query.minYear != null) params.set('minYear', String(query.minYear));
  if (query.maxYear != null) params.set('maxYear', String(query.maxYear));
  if (query.sortBy && query.sortBy !== 'newest') params.set('sortBy', query.sortBy);
  if (query.dealer) params.set('dealer', query.dealer);
  if (query.page && query.page > 1) params.set('page', String(query.page));

  const qs = params.toString();
  return qs ? `#/${slug}/?${qs}` : `#/${slug}/`;
}

export function listingHref(slug: string, listingId: string): string {
  return `#/${slug}/listing/${encodeURIComponent(listingId)}`;
}

export function sellerHref(slug: string, sellerId: string): string {
  return `#/${slug}/seller/${encodeURIComponent(sellerId)}`;
}

export function favoritesHref(slug: string): string {
  return `#/${slug}/favorites`;
}

/** @deprecated Use sellerHref */
export function dealerHref(slug: string, dealerId: string): string {
  return sellerHref(slug, dealerId);
}

export function categorySiteHref(apiHref: string): string {
  const normalized = apiHref.startsWith('/') ? apiHref.slice(1) : apiHref;
  return `#/${normalized}`;
}

export function isAutomotiveSlug(slug: string): boolean {
  return slug === DEFAULT_CATEGORY_SLUG;
}
