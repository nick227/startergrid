// Hash-based routing for the marketplace app.
// Routes:
//   #/              → vehicle browse list (optional ?make=&model=&condition=&page=)
//   #/listing/:id   → vehicle detail
//   #/dealer/:id    → dealer storefront

export type MarketplaceRoute =
  | { page: 'list'; query: ListQuery }
  | { page: 'listing'; listingId: string }
  | { page: 'dealer';  dealerId: string };

export type ListQuery = {
  make?:      string;
  model?:     string;
  condition?: 'NEW' | 'USED' | 'CPO';
  page?:      number;
};

function parseHashQuery(search: string): ListQuery {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search);
  const condition = params.get('condition');
  const pageRaw = params.get('page');
  const page = pageRaw ? Number(pageRaw) : undefined;

  return {
    make:      params.get('make') || undefined,
    model:     params.get('model') || undefined,
    condition: condition === 'NEW' || condition === 'USED' || condition === 'CPO' ? condition : undefined,
    page:      page && page > 0 ? page : undefined,
  };
}

export function parseRoute(): MarketplaceRoute {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, search = ''] = raw.split('?');

  const listingMatch = path.match(/^listing\/([^/]+)$/);
  if (listingMatch) return { page: 'listing', listingId: listingMatch[1]! };

  const dealerMatch = path.match(/^dealer\/([^/]+)$/);
  if (dealerMatch) return { page: 'dealer', dealerId: dealerMatch[1]! };

  return { page: 'list', query: parseHashQuery(search ? `?${search}` : '') };
}

export function listHref(query: ListQuery = {}): string {
  const params = new URLSearchParams();
  if (query.make) params.set('make', query.make);
  if (query.model) params.set('model', query.model);
  if (query.condition) params.set('condition', query.condition);
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
