/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MarketplaceListingPromotion } from './MarketplaceListingPromotion';
import type { MarketplaceVehicleCtas } from './MarketplaceVehicleCtas';
import type { MarketplaceVehicleDetail } from './MarketplaceVehicleDetail';
/**
 * Nested vehicle detail for the consumer VDP. promotion is required for
 * platform/operator context; the default UI does not surface syndication
 * channels to shoppers unless explicitly productized.
 *
 */
export type MarketplaceVehicleDetailResponse = {
    vehicle: MarketplaceVehicleDetail;
    promotion: MarketplaceListingPromotion;
    ctas: MarketplaceVehicleCtas;
};

