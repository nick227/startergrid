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
  q?: string;
  page?: number;
};

export type ListingQueryKey = keyof ListingQuery;

export function toListQuery(query: ListingQuery): ListQuery {
  return {
    make: query.brand,
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
  };
}

export function fromListQuery(query: ListQuery): ListingQuery {
  return {
    brand: query.make,
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
  };
}

export function listingQuerySignature(query: ListingQuery): string {
  return JSON.stringify({
    brand: query.brand ?? null,
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
  });
}

export function hasListingQueryFilters(query: ListingQuery): boolean {
  return Boolean(
    query.brand ||
    query.model ||
    query.condition ||
    query.priceMin != null ||
    query.priceMax != null ||
    query.usageMax != null ||
    query.yearMin != null ||
    query.yearMax != null ||
    query.seller ||
    query.q,
  );
}
