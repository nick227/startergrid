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
import { isCompareEnabled } from '../features/listings/listingCompareFields.ts';
import { buildListingSortOptions } from '../features/listings/listingSortOptions.ts';
import { PageShell } from '../components/layout/PageShell.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { ListingFilterBar } from '../components/listings/ListingFilterBar.tsx';
import { ActiveListingFilterChips } from '../components/listings/ActiveListingFilterChips.tsx';
import { NoResultsRelaxation } from '../components/listings/NoResultsRelaxation.tsx';
import { SavedSearchesPanel } from '../components/listings/SavedSearchesPanel.tsx';
import { FeedResultsToolbar } from '../components/listings/FeedResultsToolbar.tsx';
import { ListingGrid, type ViewMode } from '../components/ui/ListingGrid.tsx';
import { SectionCard } from '../components/ui/SectionCard.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { FeedItemCard } from '../components/feed/FeedCards.tsx';
import { EndOfFeedState, FeedCardSkeleton, LoadingMoreState } from '../components/feed/FeedStates.tsx';
import { RecentlyViewedRail } from '../components/listings/RecentlyViewedRail.tsx';
import { CompareBar } from '../components/listings/CompareBar.tsx';
import { QuickDetailDrawer } from '../components/listings/QuickDetailDrawer.tsx';
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
  const [quickViewListingId, setQuickViewListingId] = useState<string | null>(null);
  const [quickViewOpen, setQuickViewOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(() => hasActiveFilters);
  const [locationOpen, setLocationOpen] = useState(false);
  const [savedSearchesOpen, setSavedSearchesOpen] = useState(false);

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
      <PageHeader title={`Browse ${schema.asset.plural}`} subtitle={schema.marketplace.tagline} />

      {consumerLive && (
        <div className="mb-6 space-y-3 sm:mb-8">
          <SectionCard padded={false} className="p-4">
            <form
              onSubmit={e => { e.preventDefault(); feed.reload(); }}
              className="flex flex-col gap-3 md:flex-row md:items-end"
              aria-label={listingSearchAriaLabel()}
            >
              <label className="flex min-w-0 flex-1 flex-col gap-1.5">
                <span className="mp-label">Search</span>
                <input
                  type="search"
                  value={filters.q}
                  onChange={e => filters.setQ(e.target.value)}
                  placeholder={`Search ${schema.asset.plural.toLowerCase()}...`}
                  className="mp-input"
                  autoComplete="off"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="submit" className="mp-btn-primary">Search</button>
                <button
                  type="button"
                  className={filtersOpen ? 'mp-btn-secondary' : 'mp-btn-ghost border border-silver-200 bg-white'}
                  onClick={() => setFiltersOpen(open => !open)}
                  aria-expanded={filtersOpen}
                >
                  {filtersOpen ? 'Hide filters' : hasActiveFilters ? 'Edit filters' : 'Filters'}
                </button>
                <button
                  type="button"
                  className={locationOpen ? 'mp-btn-secondary' : 'mp-btn-ghost border border-silver-200 bg-white'}
                  onClick={() => setLocationOpen(open => !open)}
                  aria-expanded={locationOpen}
                >
                  {locationSummary}
                </button>
                <button
                  type="button"
                  className={savedSearchesOpen ? 'mp-btn-secondary' : 'mp-btn-ghost border border-silver-200 bg-white'}
                  onClick={() => setSavedSearchesOpen(open => !open)}
                  aria-expanded={savedSearchesOpen}
                >
                  Saved searches
                </button>
              </div>
            </form>
          </SectionCard>

          {locationOpen && (
            <BuyerLocationControls
              preference={buyerLocation.preference}
              onApply={async draft => { await buyerLocation.applyDraft({ ...draft, nationwide: false }); }}
              onNationwideChange={buyerLocation.setNationwide}
              onClear={buyerLocation.clear}
            />
          )}

          {filtersOpen && (
            <ListingFilterBar
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

      {consumerLive && savedSearchesOpen && (
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
                onQuickView={listingId => { setQuickViewListingId(listingId); setQuickViewOpen(true); }}
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

      {consumerLive && isCompareEnabled(filterConfig) && (
        <CompareBar categorySlug={slug} config={filterConfig} />
      )}

      <QuickDetailDrawer
        open={quickViewOpen}
        listingId={quickViewListingId}
        onClose={() => setQuickViewOpen(false)}
      />
    </PageShell>
  );
}
