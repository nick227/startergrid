import { useMemo } from 'react';
import { fetchVehicles, type MarketplaceVehicleCard } from '../lib/api.ts';
import { useQuery } from './useQuery.ts';
import type { BusinessCategoryId } from '@auto-dealer/category-schemas';

type Options = {
  listingId: string;
  categoryId: BusinessCategoryId;
  /** When provided, scopes results to the same brand/make. Omit for non-automotive categories. */
  make?: string;
  limit?: number;
};

const FETCH_SIZE = 9;

export function useSimilarListings({ listingId, categoryId, make, limit = 8 }: Options): {
  items: MarketplaceVehicleCard[];
  loading: boolean;
} {
  const { data, loading } = useQuery(
    () => fetchVehicles({ category: categoryId, make, page: 1, pageSize: FETCH_SIZE }),
    [categoryId, make],
  );

  const items = useMemo<MarketplaceVehicleCard[]>(() => {
    if (!data) return [];
    return data.vehicles
      .filter(v => v.listingId !== listingId)
      .slice(0, limit);
  }, [data, listingId, limit]);

  return { items, loading };
}
