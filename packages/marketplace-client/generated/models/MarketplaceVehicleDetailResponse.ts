/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MarketplaceVehicleCard } from './MarketplaceVehicleCard';
export type MarketplaceVehicleDetailResponse = {
    vehicle: MarketplaceVehicleCard;
    /**
     * Long-form vehicle description. Null until Vehicle gains a description field.
     */
    fullDescription: string | null;
    /**
     * Images beyond the first 8 from the card.
     */
    additionalMediaUrls: Array<string>;
};

