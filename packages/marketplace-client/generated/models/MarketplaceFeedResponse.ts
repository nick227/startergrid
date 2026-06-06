/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MarketplaceFeedAppliedFilters } from './MarketplaceFeedAppliedFilters';
import type { MarketplaceFeedItem } from './MarketplaceFeedItem';
export type MarketplaceFeedResponse = {
    items: Array<MarketplaceFeedItem>;
    nextCursor: string | null;
    totalEstimate: number;
    appliedFilters: MarketplaceFeedAppliedFilters;
};

