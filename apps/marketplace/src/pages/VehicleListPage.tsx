import { useEffect, useMemo, useRef, useState } from 'react';
import { queryErrorMessage } from '../hooks/useQuery.ts';
import { useInfiniteMarketplaceFeed } from '../hooks/useInfiniteMarketplaceFeed.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { formatResultCount } from '../lib/display.ts';
import { saveListReturn } from '../lib/listReturn.ts';
import { listHref, parseRoute, type ListQuery } from '../lib/routes.ts';
import { fromListQuery, toListQuery, type ListingQuery, type ListingSort } from '../features/listings/listingQuery.ts';
import { useCategorySchema, useCategorySlug } from '../contexts/CategoryContext.tsx';
import { buildListingFilterConfig } from '../features/listings/listingFilterConfig.ts';
import { isCompareEnabled } from '../features/listings/listingCompareFields.ts';
import { hasListingFilters } from '../features/listings/listingFilterChips.ts';
import { buildListingSortOptions } from '../features/listings/listingSortOptions.ts';
import { PageShell } from '../components/layout/PageShell.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { ListingFilterBar } from '../components/listings/ListingFilterBar.tsx';
import { ActiveListingFilterChips } from '../components/listings/ActiveListingFilterChips.tsx';
import { NoResultsRelaxation } from '../components/listings/NoResultsRelaxation.tsx';
import { SavedSearchesPanel } from '../components/listings/SavedSearchesPanel.tsx';
import { VehicleGrid } from '../components/ui/VehicleGrid.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { FeedItemCard } from '../components/feed/FeedCards.tsx';
import { EndOfFeedState, FeedCardSkeleton, LoadingMoreState } from '../components/feed/FeedStates.tsx';
import { RecentlyViewedRail } from '../components/listings/RecentlyViewedRail.tsx';
import { CompareBar } from '../components/listings/CompareBar.tsx';

type Props = { initialQuery?: ListQuery };

export default function VehicleListPage({ initialQuery = {} }: Props) {
  const slug = useCategorySlug();
  const schema = useCategorySchema();
  const filterConfig = useMemo(() => buildListingFilterConfig(slug, schema), [slug, schema]);
  const sortOptions = useMemo(() => buildListingSortOptions(filterConfig), [filterConfig]);
  const consumerActive = schema.status === 'active';
  const initial = useMemo(() => fromListQuery(initialQuery), [initialQuery]);

  const [brand, setBrand] = useState(initial.brand ?? '');
  const [model, setModel] = useState(initial.model ?? '');
  const [condition, setCondition] = useState<ListingQuery['condition']>(initial.condition);
  const [minPrice, setMinPrice] = useState(formatMoneyInput(initial.priceMin));
  const [maxPrice, setMaxPrice] = useState(formatMoneyInput(initial.priceMax));
  const [maxUsage, setMaxUsage] = useState(formatNumberInput(initial.usageMax));
  const [minYear, setMinYear] = useState(formatNumberInput(initial.yearMin));
  const [maxYear, setMaxYear] = useState(formatNumberInput(initial.yearMax));
  const [sortBy, setSortBy] = useState<ListingSort | undefined>(initial.sortBy);
  const [focusToken, setFocusToken] = useState(0);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  usePageMeta(
    `Browse ${schema.asset.plural}`,
    schema.marketplace.tagline,
  );

  const listingQuery = useMemo<ListingQuery>(() => ({
    brand: brand.trim() || undefined,
    model: model.trim() || undefined,
    condition,
    priceMin: dollarsToCents(minPrice),
    priceMax: dollarsToCents(maxPrice),
    usageMax: parseNonNegative(maxUsage),
    yearMin: parseNonNegative(minYear),
    yearMax: parseNonNegative(maxYear),
    sortBy,
  }), [brand, condition, maxPrice, maxUsage, maxYear, minPrice, minYear, model, sortBy]);

  const feed = useInfiniteMarketplaceFeed(listingQuery);

  useEffect(() => {
    saveListReturn(slug, listingQuery);
    const target = listHref(slug, toListQuery(listingQuery));
    if (window.location.hash !== target) {
      window.location.hash = target.slice(1);
    }
  }, [listingQuery, slug]);

  useEffect(() => {
    function syncFromHash() {
      const route = parseRoute();
      if (route.page !== 'list') return;
      applyListingQuery(fromListQuery(route.query));
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
    setBrand('');
    setModel('');
    setCondition(undefined);
    setMinPrice('');
    setMaxPrice('');
    setMaxUsage('');
    setMinYear('');
    setMaxYear('');
    setFocusToken(t => t + 1);
  }

  function applyListingQuery(query: ListingQuery) {
    setBrand(query.brand ?? '');
    setModel(query.model ?? '');
    setCondition(query.condition);
    setMinPrice(formatMoneyInput(query.priceMin));
    setMaxPrice(formatMoneyInput(query.priceMax));
    setMaxUsage(formatNumberInput(query.usageMax));
    setMinYear(formatNumberInput(query.yearMin));
    setMaxYear(formatNumberInput(query.yearMax));
    setSortBy(query.sortBy);
  }

  const hasActiveFilters = hasListingFilters(listingQuery);
  const hasItems = feed.items.length > 0;
  const initialError = feed.error && !hasItems;
  const appendError = feed.error && hasItems;
  const resolvedSort = sortOptions.some(option => option.value === sortBy)
    ? (sortBy ?? 'newest')
    : 'newest';

  return (
    <PageShell>
      <PageHeader
        title={`Browse ${schema.asset.plural}`}
        subtitle={schema.marketplace.tagline}
      />

      {consumerActive && (
      <div className="mb-6 sm:mb-8">
        <ListingFilterBar
          config={filterConfig}
          brand={brand}
          model={model}
          condition={condition}
          minPrice={minPrice}
          maxPrice={maxPrice}
          maxUsage={maxUsage}
          minYear={minYear}
          maxYear={maxYear}
          onBrandChange={setBrand}
          onModelChange={setModel}
          onConditionChange={setCondition}
          onMinPriceChange={setMinPrice}
          onMaxPriceChange={setMaxPrice}
          onMaxUsageChange={setMaxUsage}
          onMinYearChange={setMinYear}
          onMaxYearChange={setMaxYear}
          onSubmit={feed.reload}
          onClear={resetFilters}
          hasActiveFilters={hasActiveFilters}
          focusToken={focusToken}
        />
      </div>
      )}

      {consumerActive && (
      <ActiveListingFilterChips
        query={listingQuery}
        config={filterConfig}
        onChange={applyListingQuery}
        onClearAll={resetFilters}
      />
      )}

      {consumerActive && (
      <SavedSearchesPanel
        categorySlug={slug}
        config={filterConfig}
        currentQuery={listingQuery}
        onApply={applyListingQuery}
      />
      )}

      {feed.loadingInitial ? (
        <FeedCardSkeleton />
      ) : initialError ? (
        <ErrorState message={queryErrorMessage(feed.error)} onRetry={feed.retry} />
      ) : !hasItems ? (
        consumerActive && hasActiveFilters ? (
          <NoResultsRelaxation
            query={listingQuery}
            config={filterConfig}
            onApplyQuery={applyListingQuery}
            onClearAll={resetFilters}
          />
        ) : (
        <EmptyState
          title={consumerActive
            ? 'No listings match your search'
            : `${schema.label} marketplace coming soon`}
          description={consumerActive
            ? 'Try different brand or model keywords, or reset filters to browse everything available.'
            : `Listings for ${schema.label.toLowerCase()} will appear here when sellers join this marketplace.`}
          actionLabel={hasActiveFilters ? 'Reset filters' : undefined}
          onAction={hasActiveFilters ? resetFilters : undefined}
        />
        )
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 sm:mb-5">
            <p className="text-sm font-medium text-slate-600">
              {formatResultCount(feed.totalEstimate, schema.asset.singular)}
            </p>
            <label className="flex items-center gap-2 text-sm">
              <span className="mp-label">Sort</span>
              <select
                value={resolvedSort}
                onChange={e => setSortBy((e.target.value as ListingSort) || undefined)}
                className="mp-input py-1"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>

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

          <RecentlyViewedRail categorySlug={slug} />
        </>
      )}
      {consumerActive && isCompareEnabled(filterConfig) && (
        <CompareBar categorySlug={slug} config={filterConfig} />
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
