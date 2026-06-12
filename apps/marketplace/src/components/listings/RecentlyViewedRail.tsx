import { useMemo, useSyncExternalStore } from 'react';
import {
  type RecentListing,
  readRecentListings,
  subscribeRecentListings,
} from '../../features/listings/recentlyViewed.ts';
import { formatPrice } from '../../lib/display.ts';
import { listingHref } from '../../lib/routes.ts';
import { ListingImage } from '../ui/ListingImage.tsx';

type Props = {
  categorySlug: string;
  excludeListingId?: string;
  limit?: number;
};

function subscribe(onStoreChange: () => void) {
  const unsubscribe = subscribeRecentListings(onStoreChange);
  window.addEventListener('storage', onStoreChange);
  return () => {
    unsubscribe();
    window.removeEventListener('storage', onStoreChange);
  };
}

const EMPTY: RecentListing[] = [];

export function RecentlyViewedRail({ categorySlug, excludeListingId, limit = 8 }: Props) {
  const allRecent = useSyncExternalStore(subscribe, readRecentListings, () => EMPTY);

  const items = useMemo(
    () => allRecent
      .filter(item => item.categorySlug === categorySlug)
      .filter(item => item.listingId !== excludeListingId)
      .slice(0, limit),
    [allRecent, categorySlug, excludeListingId, limit],
  );

  if (items.length === 0) return null;

  return (
    <section className="mt-10 border-t border-silver-200 pt-8" aria-labelledby="recently-viewed-heading">
      <h2 id="recently-viewed-heading" className="mp-section-title mb-4 sm:mb-5">
        Recently viewed
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(item => (
          <a
            key={item.listingId}
            href={listingHref(item.categorySlug, item.listingId)}
            className="mp-card mp-focus flex gap-3 p-3 transition hover:border-navy-500/40 hover:shadow-elevation-2"
          >
            <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-surface-inset">
              <ListingImage src={item.imageUrl ?? undefined} alt={item.title} imgClassName="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-heading">{item.title}</p>
              <p className="mt-1 text-sm font-bold tabular-nums text-ink">{formatPrice(item.priceCents)}</p>
              <p className="mt-1 truncate text-xs text-ink-muted">{item.sellerName}</p>
              {item.location && <p className="truncate text-xs text-ink-faint">{item.location}</p>}
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
