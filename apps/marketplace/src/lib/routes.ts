// Hash-based routing for the marketplace app.
// Routes:
//   #/              → vehicle browse list
//   #/listing/:id   → vehicle detail
//   #/dealer/:id    → dealer storefront

export type MarketplaceRoute =
  | { page: 'list' }
  | { page: 'listing'; listingId: string }
  | { page: 'dealer';  dealerId: string };

export function parseRoute(): MarketplaceRoute {
  const hash = window.location.hash.replace(/^#\/?/, '');

  const listingMatch = hash.match(/^listing\/([^/]+)$/);
  if (listingMatch) return { page: 'listing', listingId: listingMatch[1]! };

  const dealerMatch = hash.match(/^dealer\/([^/]+)$/);
  if (dealerMatch) return { page: 'dealer', dealerId: dealerMatch[1]! };

  return { page: 'list' };
}

export function listingHref(listingId: string): string {
  return `#/listing/${encodeURIComponent(listingId)}`;
}

export function dealerHref(dealerId: string): string {
  return `#/dealer/${encodeURIComponent(dealerId)}`;
}

export function listHref(): string {
  return '#/';
}
