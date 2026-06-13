import type { BusinessCategoryId } from '@auto-dealer/category-schemas';
import { useSimilarListings } from '../../hooks/useSimilarListings.ts';
import { formatPrice } from '../../lib/display.ts';
import { listingHref } from '../../lib/routes.ts';
import { ListingImage } from '../ui/ListingImage.tsx';
import { PriceDropBadge } from './PriceDropBadge.tsx';

type Props = {
  listingId: string;
  categoryId: BusinessCategoryId;
  categorySlug: string;
  /** Scope results to this make/brand. Omit for non-automotive categories to use category-only similarity. */
  make?: string;
};

export function SimilarListingsRail({ listingId, categoryId, categorySlug, make }: Props) {
  const { items, loading } = useSimilarListings({ listingId, categoryId, make });

  if (loading || items.length === 0) return null;

  return (
    <section className="mt-10 border-t border-silver-200 pt-8" aria-labelledby="similar-listings-heading">
      <h2 id="similar-listings-heading" className="mp-section-title mb-4 sm:mb-5">
        Similar listings
      </h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map(item => (
          <a
            key={item.listingId}
            href={listingHref(categorySlug, item.listingId, `${item.year} ${item.make} ${item.model}`)}
            className="mp-card mp-focus flex gap-3 p-3 transition hover:border-navy-500/40 hover:shadow-elevation-2"
          >
            <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-surface-inset">
              <ListingImage src={item.mediaUrls[0]} alt={`${item.year} ${item.make} ${item.model}`} imgClassName="h-full w-full object-cover" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink-heading">
                {item.year} {item.make} {item.model}
              </p>
              <p className="mt-1 text-sm font-bold tabular-nums text-ink">{formatPrice(item.priceCents)}</p>
              {item.originalPriceCents != null && item.originalPriceCents > item.priceCents && (
                <PriceDropBadge
                  originalPriceCents={item.originalPriceCents}
                  priceCents={item.priceCents}
                  className="mt-1"
                />
              )}
              <p className="mt-1 truncate text-xs text-ink-muted">{item.dealerName}</p>
            </div>
          </a>
        ))}
      </div>
    </section>
  );
}
