import { useEffect, useRef, useState } from 'react';
import { useInfiniteMarketplaceFeed } from '../../hooks/useInfiniteMarketplaceFeed.ts';
import { useBuyerLocation } from '../../features/location/useBuyerLocation.ts';
import { fromListQuery } from '../../features/listings/listingQuery.ts';
import { ListingGrid, type ViewMode } from '../ui/ListingGrid.tsx';
import { FeedItemCard } from '../feed/FeedCards.tsx';
import { EndOfFeedState, FeedCardSkeleton, LoadingMoreState } from '../feed/FeedStates.tsx';
import { ErrorState } from '../ui/ErrorState.tsx';
import { queryErrorMessage } from '../../hooks/useQuery.ts';
import type { ListQuery } from '../../lib/routes.ts';
import { QuickDetailDrawer } from '../listings/QuickDetailDrawer.tsx';

type Props = {
  viewMode?: ViewMode;
  initialQuery?: ListQuery;
};

export function HomeInfiniteFeed({ viewMode = 'grid', initialQuery = {} }: Props) {
  const buyerLocation = useBuyerLocation();
  const listingQuery = fromListQuery(initialQuery);
  const feed = useInfiniteMarketplaceFeed(listingQuery, buyerLocation.geoApiParams);

  const [quickViewListingId, setQuickViewListingId] = useState<string | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);

  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !feed.hasMore || feed.loadingInitial || feed.loadingMore) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries.some(e => e.isIntersecting)) {
          feed.loadMore();
        }
      },
      { rootMargin: '900px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [feed]);

  const hasItems = feed.items.length > 0;
  const initialError = feed.error && !hasItems;
  const appendError = feed.error && hasItems;

  if (feed.loadingInitial) {
    return (
      <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <FeedCardSkeleton />
      </div>
    );
  }

  if (initialError) {
    return (
      <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <ErrorState message={queryErrorMessage(feed.error)} onRetry={feed.retry} />
      </div>
    );
  }

  if (!hasItems) {
    return null; // hide the feed section if empty on home page
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <ListingGrid viewMode={viewMode}>
        {feed.items.map((item, index) => (
          <FeedItemCard
            key={item.id}
            item={item}
            index={index}
            compact={viewMode === 'list'}
            onQuickView={listingId => {
              setQuickViewListingId(listingId);
              setQuickViewOpen(true);
            }}
          />
        ))}
      </ListingGrid>

      <div ref={sentinelRef} aria-hidden="true" className="h-1" />

      {feed.loadingMore && <LoadingMoreState />}

      {appendError && (
        <div className="mt-8">
          <ErrorState
            message={queryErrorMessage(feed.error)}
            onRetry={feed.retry}
            title="Could not load more items"
          />
        </div>
      )}

      {!feed.hasMore && !feed.loadingMore && (
        <EndOfFeedState
          canClear={false}
          onClear={() => {}}
          onTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        />
      )}

      <QuickDetailDrawer
        open={quickViewOpen}
        listingId={quickViewListingId}
        onClose={() => setQuickViewOpen(false)}
      />
    </div>
  );
}
