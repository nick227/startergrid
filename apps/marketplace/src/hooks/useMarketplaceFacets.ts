import { useMemo } from 'react';
import type { MarketplaceFacetsResponse } from '@dealer-marketplace/client';
import { fetchFacets, type ListFilters } from '../lib/api.ts';
import { useQuery } from './useQuery.ts';

export function useMarketplaceFacets(filters: ListFilters): {
  data: MarketplaceFacetsResponse | null;
  loading: boolean;
} {
  // Omit pagination and sorting from dependencies for facets
  const queryDeps = [
    filters.category,
    filters.make,
    filters.model,
    filters.condition,
    filters.minPrice,
    filters.maxPrice,
    filters.maxMileage,
    filters.minYear,
    filters.maxYear,
    filters.dealer,
    filters.q,
    filters.sellerName,
    filters.facets,
  ];

  const { data, loading } = useQuery(
    () => fetchFacets(filters),
    queryDeps
  );

  return { data, loading };
}
