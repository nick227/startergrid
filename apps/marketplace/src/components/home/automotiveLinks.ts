import { DEFAULT_CATEGORY_SLUG, listHref, type ListQuery, type SortBy } from '../../lib/routes.ts';

export type AutomotiveListParams = {
  q?: string;
  make?: string;
  condition?: 'NEW' | 'USED' | 'CPO';
  bodyStyle?: string;
  powertrain?: 'Electric' | 'Hybrid' | 'Gasoline' | 'Diesel' | 'Plug-in Hybrid';
  maxPrice?: number;
  minPrice?: number;
  minYear?: number;
  sortBy?: SortBy;
};

export function buildAutomotiveListHref(params: AutomotiveListParams): string {
  const query: ListQuery = {};

  if (params.q) query.q = params.q;
  if (params.make) query.make = params.make;
  if (params.condition) query.condition = params.condition;
  if (params.maxPrice !== undefined) query.maxPrice = params.maxPrice;
  if (params.minPrice !== undefined) query.minPrice = params.minPrice;
  if (params.minYear !== undefined) query.minYear = params.minYear;
  if (params.sortBy) query.sortBy = params.sortBy;

  // Handle facets
  const facets: Record<string, string> = {};
  if (params.bodyStyle) facets['bodyStyle'] = params.bodyStyle;
  if (params.powertrain) facets['fuelType'] = params.powertrain;

  if (Object.keys(facets).length > 0) {
    query.facets = facets;
  }

  return listHref(DEFAULT_CATEGORY_SLUG, query);
}
