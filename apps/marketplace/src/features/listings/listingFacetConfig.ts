import {
  buildMarketplaceFacets,
  sanitizeMarketplaceFacets,
  type CategorySchema,
  type MarketplaceFacetDef,
} from '@auto-dealer/category-schemas';

export type ListingFacetConfig = {
  facets: MarketplaceFacetDef[];
};

export function buildListingFacetConfig(schema: CategorySchema): ListingFacetConfig {
  return { facets: buildMarketplaceFacets(schema) };
}

export function sanitizeListingFacets(
  schema: CategorySchema,
  facets: Record<string, string> | undefined,
): Record<string, string> | undefined {
  return sanitizeMarketplaceFacets(schema, facets);
}
