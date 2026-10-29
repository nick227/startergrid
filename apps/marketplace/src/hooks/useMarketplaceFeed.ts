import { useQuery, type QueryState } from './useQuery.ts';
import {
  fetchFeed,
  fetchCategoryItems,
  type FeedFilters,
  type MarketplaceFeedResponse,
  type MarketplaceVehicleCard,
  type MarketplaceFeedItem,
  type MarketplaceCategoryItemCard,
} from '../lib/api.ts';
import { useCategoryId, useCategorySchema } from '../contexts/CategoryContext.tsx';

export function useMarketplaceFeed(filters: Omit<FeedFilters, 'category'>): QueryState<MarketplaceFeedResponse> & {
  vehicles: MarketplaceVehicleCard[];
} {
  const categoryId = useCategoryId();
  const schema = useCategorySchema();
  
  const queryDeps = [
    categoryId,
    schema.lifecycleMode,
    filters.limit,
    filters.sortBy,
    filters.condition,
    filters.make,
    filters.model,
    filters.q,
    filters.minPrice,
    filters.maxPrice,
    filters.facets,
  ];

  const state = useQuery(
    async () => {
      if (schema.lifecycleMode === 'digital_distribution') {
        const res = await fetchCategoryItems({
          categoryId: schema.id,
          dealer: filters.dealer,
        });
        const feedItems: MarketplaceFeedItem[] = res.items.map((item: MarketplaceCategoryItemCard) => ({
          type: 'vehicle',
          id: item.listingId,
          impressionKey: `category_item:${item.listingId}`,
          vehicle: {
            listingId: item.listingId,
            stockNumber: item.stockNumber || '',
            year: 0,
            make: item.author || '',
            model: item.title || '',
            title: item.title || '',
            trim: item.format ? item.format.toUpperCase() : null,
            condition: 'NEW',
            priceCents: item.priceCents,
            originalPriceCents: null,
            mileage: 0,
            usageUnit: null,
            exteriorColor: null,
            mediaUrls: item.mediaUrls?.length ? item.mediaUrls : ['/demo-assets/multi-entity-books.svg'],
            mediaItems: [],
            dealerId: item.dealerId,
            dealerName: item.dealerName,
            dealerCity: item.dealerCity ?? null,
            dealerState: item.dealerState ?? null,
            listingUrl: item.listingUrl,
            listedAt: item.listedAt,
          } as any,
        }));
        return {
          items: feedItems,
          nextCursor: null,
          totalEstimate: res.total,
          appliedFilters: {} as any,
        };
      }
      return fetchFeed({ ...filters, category: categoryId });
    },
    queryDeps
  );

  // Helper to quickly extract just the vehicles, ignoring promos/notices
  const vehicles = state.data?.items
    .filter(item => item.type === 'vehicle')
    .map(item => item.vehicle) || [];

  return { ...state, vehicles };
}
