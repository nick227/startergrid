// Hash-based routing for the marketplace app.
// Routes:
//   #/              → vehicle browse feed (optional ?make=&model=&condition=&minPrice=&maxPrice=&maxMileage=&dealer=)
//   #/listing/:id   → vehicle detail
//   #/dealer/:id    → dealer storefront
//   #/favorites     → saved vehicles (authenticated)

export type MarketplaceRoute =
  | { page: 'list'; query: ListQuery }
  | { page: 'listing'; listingId: string }
  | { page: 'dealer';  dealerId: string }
  | { page: 'favorites' };

export type ListQuery = {
  make?:      string;
  model?:     string;
  condition?: 'NEW' | 'USED' | 'CPO';
  minPrice?:   number;
  maxPrice?:   number;
  maxMileage?: number;
  dealer?:     string;
  page?:      number;
};

function parseHashQuery(search: string): ListQuery {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const condition = params.get('condition');
  const pageRaw = params.get('page');
  const page = pageRaw ? Number(pageRaw) : undefined;
  const minPrice = parseNonNegative(params.get('minPrice'));
  const maxPrice = parseNonNegative(params.get('maxPrice'));
  const maxMileage = parseNonNegative(params.get('maxMileage'));

  return {
    make:      params.get('make') || undefined,
    model:     params.get('model') || undefined,
    condition: condition === 'NEW' || condition === 'USED' || condition === 'CPO' ? condition : undefined,
    minPrice,
    maxPrice,
    maxMileage,
    dealer:     params.get('dealer') || undefined,
    page:      page && page > 0 ? page : undefined,
  };
}

function parseNonNegative(value: string | null): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function parseRoute(): MarketplaceRoute {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, search = ''] = raw.split('?');

  if (path === 'favorites') return { page: 'favorites' };

  const listingMatch = path.match(/^listing\/([^/]+)$/);
  if (listingMatch) return { page: 'listing', listingId: listingMatch[1]! };

  const dealerMatch = path.match(/^dealer\/([^/]+)$/);
  if (dealerMatch) return { page: 'dealer', dealerId: dealerMatch[1]! };

  return { page: 'list', query: parseHashQuery(search ? `?${search}` : '') };
}

export function favoritesHref(): string {
  return '#/favorites';
}

export function listHref(query: ListQuery = {}): string {
  const params = new URLSearchParams();
  if (query.make) params.set('make', query.make);
  if (query.model) params.set('model', query.model);
  if (query.condition) params.set('condition', query.condition);
  if (query.minPrice != null) params.set('minPrice', String(query.minPrice));
  if (query.maxPrice != null) params.set('maxPrice', String(query.maxPrice));
  if (query.maxMileage != null) params.set('maxMileage', String(query.maxMileage));
  if (query.dealer) params.set('dealer', query.dealer);
  if (query.page && query.page > 1) params.set('page', String(query.page));

  const qs = params.toString();
  return qs ? `#/?${qs}` : '#/';
}

export function listingHref(listingId: string): string {
  return `#/listing/${encodeURIComponent(listingId)}`;
}

export function dealerHref(dealerId: string): string {
  return `#/dealer/${encodeURIComponent(dealerId)}`;
}
