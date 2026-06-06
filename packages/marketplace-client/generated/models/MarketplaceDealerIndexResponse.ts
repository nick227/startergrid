/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MarketplaceVehicleCard } from './MarketplaceVehicleCard';
export type MarketplaceDealerIndexResponse = {
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

