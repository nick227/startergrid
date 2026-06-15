const MARKETPLACE_URL = import.meta.env['VITE_MARKETPLACE_URL'] as string | undefined ?? 'http://localhost:5174';

function titleToSlug(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Consumer marketplace listing URL — path bridge + hash route used by the marketplace SPA. */
export function buildConsumerMarketplaceListingUrl(
  listingId: string,
  options?: { categorySlug?: string; title?: string },
): string {
  const categorySlug = options?.categorySlug ?? 'automotive';
  const base = `${MARKETPLACE_URL}/${categorySlug}/listings/${listingId}?demo=1`;

  const titleSlug = options?.title ? titleToSlug(options.title) : '';
  const hash = titleSlug
    ? `#/${categorySlug}/listing/${titleSlug}?id=${encodeURIComponent(listingId)}`
    : `#/${categorySlug}/listing/${encodeURIComponent(listingId)}`;

  return `${base}${hash}`;
}
