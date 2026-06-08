import {
  parseMarketplaceFacetsParam,
  serializeMarketplaceFacetsParam,
} from '@auto-dealer/category-schemas';
import type { ListQuery, SortBy } from '../../lib/routes.ts';

export type ListingSort = SortBy;

export type ListingQuery = {
  brand?: string;
  model?: string;
  condition?: ListQuery['condition'];
  priceMin?: number;
  priceMax?: number;
  usageMax?: number;
  yearMin?: number;
  yearMax?: number;
  sortBy?: ListingSort;
  seller?: string;
  sellerName?: string;
  q?: string;
  page?: number;
  facets?: Record<string, string>;
};

export type ListingQueryKey = keyof ListingQuery;

export function toListQuery(query: ListingQuery): ListQuery {
  return {
    make: query.brand,
    sellerName: query.sellerName,
    model: query.model,
    condition: query.condition,
    minPrice: query.priceMin,
    maxPrice: query.priceMax,
    maxMileage: query.usageMax,
    minYear: query.yearMin,
    maxYear: query.yearMax,
    sortBy: query.sortBy,
    dealer: query.seller,
    q: query.q,
    page: query.page,
    facets: query.facets,
    facetsParam: serializeMarketplaceFacetsParam(query.facets),
  };
}

export function fromListQuery(query: ListQuery): ListingQuery {
  return {
    // When sellerName is present in the URL, make belongs to the seller name —
    // don't also populate brand from make to avoid ambiguity.
    brand: query.sellerName ? undefined : query.make,
    sellerName: query.sellerName,
    model: query.model,
    condition: query.condition,
    priceMin: query.minPrice,
    priceMax: query.maxPrice,
    usageMax: query.maxMileage,
    yearMin: query.minYear,
    yearMax: query.maxYear,
    sortBy: query.sortBy,
    seller: query.dealer,
    q: query.q,
    page: query.page,
    facets: query.facets ?? parseMarketplaceFacetsParam(query.facetsParam),
  };
}

export function listingQuerySignature(query: ListingQuery): string {
  const facetEntries = query.facets
    ? Object.entries(query.facets).sort(([a], [b]) => a.localeCompare(b))
    : [];

  return JSON.stringify({
    brand: query.brand ?? null,
    sellerName: query.sellerName ?? null,
    model: query.model ?? null,
    condition: query.condition ?? null,
    priceMin: query.priceMin ?? null,
    priceMax: query.priceMax ?? null,
    usageMax: query.usageMax ?? null,
    yearMin: query.yearMin ?? null,
    yearMax: query.yearMax ?? null,
    sortBy: query.sortBy ?? null,
    seller: query.seller ?? null,
    q: query.q ?? null,
    facets: facetEntries.length > 0 ? Object.fromEntries(facetEntries) : null,
  });
}

export function hasListingQueryFilters(query: ListingQuery): boolean {
  return Boolean(
    query.brand ||
    query.sellerName ||
    query.model ||
    query.condition ||
    query.priceMin != null ||
    query.priceMax != null ||
    query.usageMax != null ||
    query.yearMin != null ||
    query.yearMax != null ||
    query.seller ||
    query.q ||
    (query.facets && Object.keys(query.facets).length > 0),
  );
}
