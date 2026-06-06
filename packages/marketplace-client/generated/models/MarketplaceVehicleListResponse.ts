/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MarketplaceVehicleCard } from './MarketplaceVehicleCard';
export type MarketplaceVehicleListResponse = {
    vehicles: Array<MarketplaceVehicleCard>;
    /**
     * Total eligible vehicles matching the filter (across all pages).
     */
    total: number;
    page: number;
    pageSize: number;
    /**
     * Relative URL for the next page, or null on the last page.
     */
    nextPage: string | null;
};

