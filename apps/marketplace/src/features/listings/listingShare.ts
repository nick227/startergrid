export type ShareListingResult = 'shared' | 'copied' | 'failed';

export function buildListingShareUrl(
  categorySlug: string,
  listingId: string,
  pageOrigin = defaultPageOrigin(),
): string {
  const hash = `#/${categorySlug}/listing/${encodeURIComponent(listingId)}`;
  return `${pageOrigin}${hash}`;
}

function defaultPageOrigin(): string {
  if (typeof window === 'undefined') return '';
  return `${window.location.origin}${window.location.pathname}`;
}

export async function shareListing(options: {
  title: string;
  url: string;
  text?: string;
}): Promise<ShareListingResult> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: options.title,
        url: options.url,
        text: options.text,
      });
      return 'shared';
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return 'failed';
    }
  }

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(options.url);
      return 'copied';
    } catch {
      return 'failed';
    }
  }

  return 'failed';
}
