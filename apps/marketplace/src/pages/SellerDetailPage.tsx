import { useState } from 'react';
import { useQuery, queryErrorMessage } from '../hooks/useQuery.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { fetchSeller, isNotFoundError } from '../lib/api.ts';
import { formatResultCount } from '../lib/display.ts';
import { getListReturn, saveListReturn } from '../lib/listReturn.ts';
import { MarketplaceEventType } from '../lib/events.ts';
import { useTrackMarketplaceEvent } from '../hooks/useTrackMarketplaceEvent.ts';
import { listHref } from '../lib/routes.ts';
import { useCategoryId, useCategorySchema, useCategorySlug } from '../contexts/CategoryContext.tsx';
import { PageShell } from '../components/layout/PageShell.tsx';
import { ListingCard } from '../components/ListingCard.tsx';
import { DealerHero } from '../components/ui/DealerBlock.tsx';
import { ListingGrid } from '../components/ui/ListingGrid.tsx';
import { DealerHeaderSkeleton, SkeletonGrid } from '../components/ui/SkeletonGrid.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { NotFoundState } from '../components/ui/NotFoundState.tsx';
import { QuickDetailDrawer } from '../components/listings/QuickDetailDrawer.tsx';

type Props = { sellerId: string };

export default function SellerDetailPage({ sellerId }: Props) {
  const categoryId = useCategoryId();
  const slug = useCategorySlug();
  const schema = useCategorySchema();
  const [quickViewListingId, setQuickViewListingId] = useState<string | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const { data, loading, error, reload } = useQuery(
    () => fetchSeller(sellerId, categoryId),
    [sellerId, categoryId],
  );
  const backHref = getListReturn(slug);

  usePageMeta(
    data?.dealerName ?? 'Seller',
    data ? `${formatResultCount(data.vehicles.length)} on the marketplace` : undefined,
  );
  useTrackMarketplaceEvent(data ? {
    eventType: MarketplaceEventType.DEALER_PAGE_VIEW,
    dealerId: sellerId,
    category: categoryId,
  } : null);

  if (loading && !data) {
    return (
      <PageShell backHref={backHref} backLabel="Back to results">
        <DealerHeaderSkeleton />
        <div className="mt-8">
          <SkeletonGrid count={3} />
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell backHref={backHref} backLabel="Back to results">
        {isNotFoundError(error) ? (
          <NotFoundState
            title="Seller not found"
            description="This seller page is not available on this marketplace."
            backHref={backHref}
            backLabel="Back to results"
          />
        ) : (
          <ErrorState message={queryErrorMessage(error)} onRetry={reload} />
        )}
      </PageShell>
    );
  }

  if (!data) return null;

  const count = data.vehicles.length;

  return (
    <PageShell backHref={backHref} backLabel="Back to results">
      <DealerHero
        dealerName={data.dealerName}
        city={data.dealerCity}
        state={data.dealerState}
        websiteUrl={data.websiteUrl}
      />

      <section>
        <h2 className="mp-section-title mb-4 sm:mb-5">
          {count > 0
            ? `${formatResultCount(count)} on the ${schema.label.toLowerCase()} marketplace`
            : 'Marketplace inventory'}
        </h2>

        {count === 0 ? (
          <EmptyState
            title={`No ${schema.asset.plural} listed right now`}
            description="This seller has no marketplace-eligible inventory at the moment."
            actionLabel={`Browse all ${schema.asset.plural}`}
            onAction={() => {
              saveListReturn(slug, {});
              window.location.hash = listHref(slug).slice(1);
            }}
          />
        ) : (
          <ListingGrid>
            {data.vehicles.map(card => (
              <ListingCard
                key={card.listingId}
                card={card}
                onQuickView={(listingId) => {
                  setQuickViewListingId(listingId);
                  setQuickViewOpen(true);
                }}
              />
            ))}
          </ListingGrid>
        )}
      </section>
      <QuickDetailDrawer
        open={quickViewOpen}
        listingId={quickViewListingId}
        onClose={() => setQuickViewOpen(false)}
      />
    </PageShell>
  );
}
