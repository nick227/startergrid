/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MarketplaceFacetOption } from './MarketplaceFacetOption';
import type { MarketplaceFacetRange } from './MarketplaceFacetRange';
export type MarketplaceFacetsResponse = {
    brandFacets?: Array<MarketplaceFacetOption>;
    modelFacets?: Array<MarketplaceFacetOption>;
    customFacets?: Record<string, Array<MarketplaceFacetOption>>;
    priceRanges: Array<MarketplaceFacetRange>;
    yearRanges: Array<MarketplaceFacetRange>;
    mileageRanges: Array<MarketplaceFacetRange>;
};

