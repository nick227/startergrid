/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MarketplaceCategoryItemCard } from './MarketplaceCategoryItemCard';
import type { MarketplaceVehicleCard } from './MarketplaceVehicleCard';
export type MarketplaceDealerIndexResponse = {
    categoryItems?: Array<MarketplaceCategoryItemCard>;
    categoryItemTotal?: number;
    city?: string | null;
    state?: string | null;
    dealerId: string;
    dealerName: string;
    dealerCity: string | null;
    dealerState: string | null;
    websiteUrl: string | null;
    /**
     * All marketplace-eligible vehicles for this dealer.
     */
    vehicles: Array<MarketplaceVehicleCard>;
};

