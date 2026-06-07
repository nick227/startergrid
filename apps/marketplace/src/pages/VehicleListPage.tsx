import { useEffect, useMemo, useRef, useState } from 'react';
import { queryErrorMessage } from '../hooks/useQuery.ts';
import { useInfiniteMarketplaceFeed } from '../hooks/useInfiniteMarketplaceFeed.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { formatResultCount } from '../lib/display.ts';
import { saveListReturn } from '../lib/listReturn.ts';
import { isAutomotiveSlug, listHref, parseRoute, type ListQuery } from '../lib/routes.ts';
import { useCategorySchema, useCategorySlug } from '../contexts/CategoryContext.tsx';
import { PageShell } from '../components/layout/PageShell.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { FilterBar } from '../components/ui/FilterBar.tsx';
import { VehicleGrid } from '../components/ui/VehicleGrid.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { FeedItemCard } from '../components/feed/FeedCards.tsx';
import { ActiveFilterChips, hasFeedFilters } from '../components/feed/ActiveFilterChips.tsx';
import { EndOfFeedState, FeedCardSkeleton, LoadingMoreState } from '../components/feed/FeedStates.tsx';

type Props = { initialQuery?: ListQuery };

export default function VehicleListPage({ initialQuery = {} }: Props) {
  const slug = useCategorySlug();
  const schema = useCategorySchema();
  const automotive = isAutomotiveSlug(slug);
  const consumerActive = schema.status === 'active';
  const [make,      setMake]      = useState(initialQuery.make ?? '');
  const [model,     setModel]     = useState(initialQuery.model ?? '');
  const [condition, setCondition] = useState<ListQuery['condition']>(initialQuery.condition);
  const [minPrice, setMinPrice] = useState(formatMoneyInput(initialQuery.minPrice));
  const [maxPrice, setMaxPrice] = useState(formatMoneyInput(initialQuery.maxPrice));
  const [maxMileage, setMaxMileage] = useState(formatNumberInput(initialQuery.maxMileage));
  const [focusToken, setFocusToken] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  usePageMeta(
    `Browse ${schema.asset.plural}`,
    schema.marketplace.tagline,
  );

  const listQuery = useMemo<ListQuery>(() => ({
    make:      make.trim()  || undefined,
    model:     model.trim() || undefined,
    condition,
    minPrice:   dollarsToCents(minPrice),
    maxPrice:   dollarsToCents(maxPrice),
    maxMileage: parseNonNegative(maxMileage),
  }), [condition, make, maxMileage, maxPrice, minPrice, model]);

  const feed = useInfiniteMarketplaceFeed(listQuery);

  useEffect(() => {
    saveListReturn(slug, listQuery);
    const target = listHref(slug, listQuery);
    if (window.location.hash !== target) {
      window.location.hash = target.slice(1);
    }
  }, [listQuery, slug]);

  useEffect(() => {
    function syncFromHash() {
      const route = parseRoute();
      if (route.page !== 'list') return;
      const q = route.query;
      setMake(q.make ?? '');
      setModel(q.model ?? '');
      setCondition(q.condition);
      setMinPrice(formatMoneyInput(q.minPrice));
      setMaxPrice(formatMoneyInput(q.maxPrice));
      setMaxMileage(formatNumberInput(q.maxMileage));
    }
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !feed.hasMore) return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) feed.loadMore();
    }, { rootMargin: '900px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [feed]);

  function resetFilters() {
    setMake('');
    setModel('');
    setCondition(undefined);
    setMinPrice('');
    setMaxPrice('');
    setMaxMileage('');
    setFocusToken(t => t + 1);
  }

  function applyChipQuery(query: ListQuery) {
    setMake(query.make ?? '');
    setModel(query.model ?? '');
    setCondition(query.condition);
    setMinPrice(formatMoneyInput(query.minPrice));
    setMaxPrice(formatMoneyInput(query.maxPrice));
    setMaxMileage(formatNumberInput(query.maxMileage));
  }

  const hasActiveFilters = hasFeedFilters(listQuery);
  const hasItems = feed.items.length > 0;
  const initialError = feed.error && !hasItems;
  const appendError = feed.error && hasItems;

  return (
    <PageShell>
      <PageHeader
        title={`Browse ${schema.asset.plural}`}
        subtitle={schema.marketplace.tagline}
      />

      {automotive && (
      <div className="mb-6 sm:mb-8">
        <FilterBar
          make={make}
          model={model}
          condition={condition}
          minPrice={minPrice}
          maxPrice={maxPrice}
          maxMileage={maxMileage}
          onMakeChange={setMake}
          onModelChange={setModel}
          onConditionChange={setCondition}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          onMaxMileageChange={setMaxMileage}
          onSubmit={feed.reload}
          onClear={resetFilters}
          hasActiveFilters={hasActiveFilters}
          focusToken={focusToken}
        />
      </div>
      )}

      {automotive && (
      <ActiveFilterChips query={listQuery} onChange={applyChipQuery} onClearAll={resetFilters} />
      )}

      {feed.loadingInitial ? (
        <FeedCardSkeleton />
      ) : initialError ? (
        <ErrorState message={queryErrorMessage(feed.error)} onRetry={feed.retry} />
      ) : !hasItems ? (
        <EmptyState
          title={consumerActive
            ? `No ${schema.asset.plural} match your search`
            : `${schema.label} marketplace coming soon`}
          description={consumerActive
            ? automotive
              ? 'Try different make or model keywords, or reset filters to browse everything available.'
              : `Try adjusting your search or check back soon for new ${schema.asset.plural}.`
            : `Listings for ${schema.label.toLowerCase()} will appear here when sellers join this marketplace.`}
          actionLabel={hasActiveFilters ? 'Reset filters' : undefined}
          onAction={hasActiveFilters ? resetFilters : undefined}
        />
      ) : (
        <>
          <p className="mb-4 text-sm font-medium text-slate-600 sm:mb-5">
            {formatResultCount(feed.totalEstimate, schema.asset.singular)}
          </p>

          <VehicleGrid>
            {feed.items.map((item, index) => (
              <FeedItemCard key={item.id} item={item} index={index} />
            ))}
          </VehicleGrid>

          <div ref={sentinelRef} aria-hidden="true" className="h-1" />

          {feed.loadingMore && <LoadingMoreState />}

          {appendError && (
            <div className="mt-8">
              <ErrorState message={queryErrorMessage(feed.error)} onRetry={feed.retry} title={`Could not load more ${schema.asset.plural}`} />
            </div>
          )}

          {!feed.hasMore && !feed.loadingMore && (
            <EndOfFeedState
              canClear={hasActiveFilters}
              onClear={resetFilters}
              onTop={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            />
          )}
        </>
      )}
    </PageShell>
  );
}

function parseNonNegative(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function dollarsToCents(value: string): number | undefined {
  const dollars = parseNonNegative(value);
  return dollars == null ? undefined : Math.round(dollars * 100);
}

function formatMoneyInput(cents: number | undefined): string {
  return cents == null ? '' : String(Math.round(cents / 100));
}

function formatNumberInput(value: number | undefined): string {
  return value == null ? '' : String(value);
}
