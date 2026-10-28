import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { queryErrorMessage } from '../hooks/useQuery.ts';
import { useInfiniteMarketplaceFeed } from '../hooks/useInfiniteMarketplaceFeed.ts';
import { useListingFilters } from '../hooks/useListingFilters.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { saveListReturn } from '../lib/listReturn.ts';
import { listHref, parseRoute, type ListQuery } from '../lib/routes.ts';
import { listRoutePageMeta } from '../lib/routePageMeta.ts';
import { fromListQuery, toListQuery } from '../features/listings/listingQuery.ts';
import type { ListingSort } from '../features/listings/listingQuery.ts';
import { isConsumerMarketplaceLive } from '@auto-dealer/category-schemas';
import { useCategorySchema, useCategorySlug } from '../contexts/CategoryContext.tsx';
import { buildListingFilterConfig, listingSearchAriaLabel } from '../features/listings/listingFilterConfig.ts';
import { buildListingSortOptions } from '../features/listings/listingSortOptions.ts';
import { PageShell } from '../components/layout/PageShell.tsx';
import { ListingFilterBar } from '../components/listings/ListingFilterBar.tsx';
import { ActiveListingFilterChips } from '../components/listings/ActiveListingFilterChips.tsx';
import { NoResultsRelaxation } from '../components/listings/NoResultsRelaxation.tsx';
import { FeedResultsToolbar } from '../components/listings/FeedResultsToolbar.tsx';
import { ListingGrid, type ViewMode } from '../components/ui/ListingGrid.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { FeedItemCard } from '../components/feed/FeedCards.tsx';
import { EndOfFeedState, FeedCardSkeleton, LoadingMoreState } from '../components/feed/FeedStates.tsx';
import { RecentlyViewedRail } from '../components/listings/RecentlyViewedRail.tsx';
import { NewArrivalsRail } from '../components/listings/NewArrivalsRail.tsx';
import { BuyerLocationControls } from '../components/listings/BuyerLocationControls.tsx';
import { GeoNoResultsRelaxation } from '../components/listings/GeoNoResultsRelaxation.tsx';
import { isGeoRadiusSearchActive } from '../features/location/listingGeoRelaxation.ts';
import { saveBuyerLocationRadius } from '../features/location/buyerLocation.ts';
import { useBuyerLocation } from '../features/location/useBuyerLocation.ts';
import { pickNewArrivalCards } from '../features/listings/listingNewArrivals.ts';

type Props = { initialQuery?: ListQuery };

export default function ListingListPage({ initialQuery = {} }: Props) {
  const slug = useCategorySlug();
  const schema = useCategorySchema();
  const filterConfig = useMemo(() => buildListingFilterConfig(slug, schema), [slug, schema]);
  const consumerLive = isConsumerMarketplaceLive(schema);
  const initial = useMemo(() => fromListQuery(initialQuery), [initialQuery]);

  const filters = useListingFilters(initial, filterConfig, schema);
  const { listingQuery, hasActiveFilters, resetFilters, applyListingQuery } = filters;

  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    try { return (sessionStorage.getItem('mp:viewMode') as ViewMode) || 'grid'; } catch { return 'grid'; }
  });
  const [filtersOpen, setFiltersOpen] = useState(() => hasActiveFilters);
  const [locationOpen, setLocationOpen] = useState(false);

  const sortOptions = useMemo(
    () => buildListingSortOptions(filterConfig, Boolean(filters.q.trim())),
    [filterConfig, filters.q],
  );
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  const pageMeta = useMemo(
    () => listRoutePageMeta(slug, toListQuery(listingQuery)),
    [listingQuery, slug],
  );
  usePageMeta(pageMeta.title, pageMeta.description);

  const buyerLocation = useBuyerLocation();
  const feed = useInfiniteMarketplaceFeed(listingQuery, buyerLocation.geoApiParams);

  useEffect(() => {
    saveListReturn(slug, listingQuery);
    const target = listHref(slug, toListQuery(listingQuery));
    if (window.location.hash !== target) window.location.hash = target.slice(1);
  }, [listingQuery, slug]);

  useEffect(() => {
    function syncFromHash() {
      const route = parseRoute();
      if (route.page !== 'list') return;
      applyListingQuery(fromListQuery(route.query));
    }
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, [applyListingQuery]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !feed.hasMore) return;
    const observer = new IntersectionObserver(
      entries => { if (entries.some(e => e.isIntersecting)) feed.loadMore(); },
      { rootMargin: '900px 0px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [feed]);

  const toggleViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    try { sessionStorage.setItem('mp:viewMode', mode); } catch { /* ignore */ }
  }, []);

  const locationSummary = buyerLocation.preference?.nationwide
    ? 'Nationwide'
    : buyerLocation.preference?.postalCode
      ? `${buyerLocation.preference.postalCode} · ${buyerLocation.preference.radiusMiles} mi`
      : 'Set location';

  const hasItems = feed.items.length > 0;
  const initialError = feed.error && !hasItems;
  const appendError = feed.error && hasItems;

  const newArrivalCards = useMemo(() => {
    if (hasActiveFilters) return [];
    const cards = feed.items
      .filter((item): item is Extract<typeof feed.items[number], { type: 'vehicle' }> => item.type === 'vehicle')
      .map(item => item.vehicle);
    return pickNewArrivalCards(cards);
  }, [feed.items, hasActiveFilters]);

  const resolvedSort: ListingSort = sortOptions.some(o => o.value === filters.sortBy)
    ? (filters.sortBy ?? 'newest')
    : 'newest';

  return (
    <PageShell>
      <div className="mp-page">
      <header className="mb-3 mt-4">
        <h1 className="text-xl font-semibold tracking-tight text-ink-heading sm:text-2xl">
          Browse {schema.asset.plural}
        </h1>
        <p className="mt-0.5 text-sm text-ink-muted">{schema.marketplace.tagline}</p>
      </header>

      {consumerLive && (
        <div className="mb-4 overflow-hidden rounded-xl border border-silver-200 bg-white">
          <form
            onSubmit={e => { e.preventDefault(); feed.reload(); }}
            className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center"
            aria-label={listingSearchAriaLabel()}
          >
            <label className="sr-only" htmlFor="listing-search">Search</label>
            <input
              id="listing-search"
              type="search"
              value={filters.q}
              onChange={e => filters.setQ(e.target.value)}
              placeholder={`Search ${schema.asset.plural.toLowerCase()}...`}
              className="mp-input h-12 min-w-0 flex-1 py-0"
              autoComplete="off"
            />
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="mp-btn-primary h-12 px-4">Search</button>
              <button
                type="button"
                className={filtersOpen ? 'mp-btn-secondary h-12 bg-surface-inset px-4' : 'mp-btn-secondary h-12 px-4'}
                onClick={() => setFiltersOpen(open => !open)}
                aria-expanded={filtersOpen}
              >
                {filtersOpen ? 'Hide filters' : hasActiveFilters ? 'Edit filters' : 'Filters'}
              </button>
              <button
                type="button"
                className={locationOpen ? 'mp-btn-secondary h-12 bg-surface-inset px-4' : 'mp-btn-secondary h-12 px-4'}
                onClick={() => setLocationOpen(open => !open)}
                aria-expanded={locationOpen}
              >
                {locationSummary}
              </button>
            </div>
          </form>

          {locationOpen && (
            <div className="border-t border-silver-200 px-3 py-3">
              <BuyerLocationControls
                bare
                preference={buyerLocation.preference}
                onApply={async draft => { await buyerLocation.applyDraft({ ...draft, nationwide: false }); }}
                onNationwideChange={buyerLocation.setNationwide}
                onClear={buyerLocation.clear}
              />
            </div>
          )}

          {filtersOpen && (
            <div className="border-t border-silver-200 px-3 py-3">
              <ListingFilterBar
                embedded
                config={filterConfig}
                category={schema.id}
                facets={filterConfig.facets}
                facetValues={filters.facetValues}
                onFacetChange={filters.handleFacetChange}
                q={filters.q}
                brand={filters.brand}
                model={filters.model}
                condition={filters.condition}
                minPrice={filters.minPrice}
                maxPrice={filters.maxPrice}
                maxUsage={filters.maxUsage}
                minYear={filters.minYear}
                maxYear={filters.maxYear}
                sellerName={filters.sellerName}
                onQChange={filters.setQ}
                onBrandChange={filters.setBrand}
                onSellerNameChange={filters.setSellerName}
                onModelChange={filters.setModel}
                onConditionChange={filters.setCondition}
                onMinPriceChange={filters.setMinPrice}
                onMaxPriceChange={filters.setMaxPrice}
                onMaxUsageChange={filters.setMaxUsage}
                onMinYearChange={filters.setMinYear}
                onMaxYearChange={filters.setMaxYear}
                onSubmit={feed.reload}
                onClear={resetFilters}
                hasActiveFilters={hasActiveFilters}
                focusToken={filters.focusToken}
                query={listingQuery}
                showSearch={false}
              />
            </div>
          )}
        </div>
      )}

      {consumerLive && (
        <ActiveListingFilterChips
          query={listingQuery}
          config={filterConfig}
          facets={filterConfig.facets}
          onChange={applyListingQuery}
          onClearAll={resetFilters}
        />
      )}

      {feed.loadingInitial ? (
        <FeedCardSkeleton />
      ) : initialError ? (
        <ErrorState message={queryErrorMessage(feed.error)} onRetry={feed.retry} />
      ) : !hasItems ? (
        consumerLive && isGeoRadiusSearchActive(buyerLocation.preference) && buyerLocation.preference ? (
          <GeoNoResultsRelaxation
            preference={buyerLocation.preference}
            onExpandRadius={action => { saveBuyerLocationRadius(action.radiusMiles); }}
            onNationwide={() => { buyerLocation.setNationwide(true); }}
          />
        ) : consumerLive && hasActiveFilters ? (
          <NoResultsRelaxation
            query={listingQuery}
            config={filterConfig}
            onApplyQuery={applyListingQuery}
            onClearAll={resetFilters}
          />
        ) : (
          <EmptyState
            title={consumerLive
              ? 'No listings match your search'
              : `${schema.label} marketplace coming soon`}
            description={consumerLive
              ? 'Try different brand or model keywords, or reset filters to browse everything available.'
              : `Listings for ${schema.label.toLowerCase()} will appear here when sellers join this marketplace.`}
            actionLabel={hasActiveFilters ? 'Reset filters' : undefined}
            onAction={hasActiveFilters ? resetFilters : undefined}
          />
        )
      ) : (
        <>
          <NewArrivalsRail slug={slug} cards={newArrivalCards} />

          <FeedResultsToolbar
            totalEstimate={feed.totalEstimate}
            singular={schema.asset.singular}
            sortOptions={sortOptions}
            resolvedSort={resolvedSort}
            onSortChange={filters.setSortBy}
            viewMode={viewMode}
            onViewModeChange={toggleViewMode}
          />

          <ListingGrid viewMode={viewMode}>
            {feed.items.map((item, index) => (
              <FeedItemCard
                key={item.id}
                item={item}
                index={index}
                compact={viewMode === 'list'}
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
                title={`Could not load more ${schema.asset.plural}`}
              />
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
      </div>
    </PageShell>
  );
}
