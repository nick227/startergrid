/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MarketplaceDealerIndexResponse } from '../models/MarketplaceDealerIndexResponse';
import type { MarketplaceVehicleDetailResponse } from '../models/MarketplaceVehicleDetailResponse';
import type { MarketplaceVehicleListResponse } from '../models/MarketplaceVehicleListResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MarketplaceService {
    /**
     * Browse marketplace-eligible vehicles
     * Returns paginated, cross-dealer vehicle cards for marketplace-eligible inventory.
     * Eligible = active (not sold/removed) + price set.
     * Supports make/model/condition/price/dealer filters.
     *
     * @returns MarketplaceVehicleListResponse Vehicle listing page
     * @throws ApiError
     */
    public static listMarketplaceVehicles({
        make,
        model,
        condition,
        minPrice,
        maxPrice,
        dealer,
        page = 1,
        pageSize = 24,
    }: {
        make?: string,
        model?: string,
        condition?: 'NEW' | 'USED' | 'CPO',
        /**
         * Minimum priceCents (inclusive)
         */
        minPrice?: number,
        /**
         * Maximum priceCents (inclusive)
         */
        maxPrice?: number,
        /**
         * Filter by dealer ID
         */
        dealer?: string,
        page?: number,
        pageSize?: number,
    }): CancelablePromise<MarketplaceVehicleListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/marketplace/vehicles',
            query: {
                'make': make,
                'model': model,
                'condition': condition,
                'minPrice': minPrice,
                'maxPrice': maxPrice,
                'dealer': dealer,
                'page': page,
                'pageSize': pageSize,
            },
        });
    }
    /**
     * Single vehicle detail
     * Returns detail for one marketplace-eligible vehicle by opaque listing ID.
     * Returns 404 for sold, removed, or non-existent vehicles.
     *
     * @returns MarketplaceVehicleDetailResponse Vehicle detail
     * @throws ApiError
     */
    public static getMarketplaceVehicle({
        listingId,
    }: {
        /**
         * Opaque vehicle identifier from MarketplaceVehicleCard.listingId
         */
        listingId: string,
    }): CancelablePromise<MarketplaceVehicleDetailResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/marketplace/vehicles/{listingId}',
            path: {
                'listingId': listingId,
            },
            errors: {
                404: `Not found`,
            },
        });
    }
    /**
     * Dealer storefront index
     * Returns dealer info and all marketplace-eligible vehicles for that dealer.
     * Returns 404 when the dealer does not exist.
     *
     * @returns MarketplaceDealerIndexResponse Dealer index
     * @throws ApiError
     */
    public static getMarketplaceDealerIndex({
        dealerId,
    }: {
        dealerId: string,
    }): CancelablePromise<MarketplaceDealerIndexResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/marketplace/dealers/{dealerId}',
            path: {
                'dealerId': dealerId,
            },
            errors: {
                404: `Not found`,
            },
        });
    }
}
