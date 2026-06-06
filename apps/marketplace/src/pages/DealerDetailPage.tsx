import { useQuery, queryErrorMessage } from '../hooks/useQuery.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { fetchDealer, isNotFoundError } from '../lib/api.ts';
import { formatResultCount } from '../lib/display.ts';
import { getListReturn, saveListReturn } from '../lib/listReturn.ts';
import { MarketplaceEventType } from '../lib/events.ts';
import { useTrackMarketplaceEvent } from '../hooks/useTrackMarketplaceEvent.ts';
import { listHref } from '../lib/routes.ts';
import { PageShell } from '../components/layout/PageShell.tsx';
import { VehicleCard } from '../components/VehicleCard.tsx';
import { DealerHero } from '../components/ui/DealerBlock.tsx';
import { VehicleGrid } from '../components/ui/VehicleGrid.tsx';
import { DealerHeaderSkeleton, SkeletonGrid } from '../components/ui/SkeletonGrid.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { NotFoundState } from '../components/ui/NotFoundState.tsx';

type Props = { dealerId: string };

export default function DealerDetailPage({ dealerId }: Props) {
  const { data, loading, error, reload } = useQuery(
    () => fetchDealer(dealerId),
    [dealerId]
  );
  const backHref = getListReturn();

  usePageMeta(
    data?.dealerName ?? 'Dealer',
    data ? `${formatResultCount(data.vehicles.length)} on the marketplace` : undefined,
  );
  useTrackMarketplaceEvent(data ? { eventType: MarketplaceEventType.DEALER_PAGE_VIEW, dealerId } : null);

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
            title="Dealer not found"
            description="This dealer page is not available on the marketplace."
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
            ? `${formatResultCount(count)} on the marketplace`
            : 'Marketplace inventory'}
        </h2>

        {count === 0 ? (
          <EmptyState
            title="No vehicles listed right now"
            description="This dealer has no marketplace-eligible inventory at the moment."
            actionLabel="Browse all vehicles"
            onAction={() => {
              saveListReturn({});
              window.location.hash = listHref().slice(1);
            }}
          />
        ) : (
          <VehicleGrid>
            {data.vehicles.map(card => (
              <VehicleCard key={card.listingId} card={card} />
            ))}
          </VehicleGrid>
        )}
      </section>
    </PageShell>
  );
}
