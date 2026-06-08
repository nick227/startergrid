/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MarketplaceUnavailableFavorite } from './MarketplaceUnavailableFavorite';
import type { MarketplaceVehicleCard } from './MarketplaceVehicleCard';
export type MarketplaceFavoritesResponse = {
    /**
     * Marketplace-safe vehicle cards for currently-eligible favorited listings.
     * Sold, removed, or unpriced vehicles are omitted. Their favorite record is
     * preserved and will reappear if the vehicle becomes eligible again.
     *
     */
    favorites: Array<MarketplaceVehicleCard>;
    /**
     * Count of eligible favorited vehicles in this response.
     */
    total: number;
    /**
     * Stale favorites — saved listings that are no longer available.
     */
    unavailableFavorites: Array<MarketplaceUnavailableFavorite>;
};

