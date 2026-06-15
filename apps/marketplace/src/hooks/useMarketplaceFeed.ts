import { useQuery, type QueryState } from './useQuery.ts';
import { fetchFeed, type FeedFilters, type MarketplaceFeedResponse, type MarketplaceVehicleCard } from '../lib/api.ts';
import { useCategoryId } from '../contexts/CategoryContext.tsx';

export function useMarketplaceFeed(filters: Omit<FeedFilters, 'category'>): QueryState<MarketplaceFeedResponse> & {
  vehicles: MarketplaceVehicleCard[];
} {
  const categoryId = useCategoryId();
  
  const queryDeps = [
    categoryId,
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
    () => fetchFeed({ ...filters, category: categoryId }),
    queryDeps
  );

  // Helper to quickly extract just the vehicles, ignoring promos/notices
  const vehicles = state.data?.items
    .filter(item => item.type === 'vehicle')
    .map(item => item.vehicle) || [];

  return { ...state, vehicles };
}
