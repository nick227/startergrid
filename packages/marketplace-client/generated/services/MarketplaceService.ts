/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MarketplaceBusinessCategory } from '../models/MarketplaceBusinessCategory';
import type { MarketplaceChannelEventRequest } from '../models/MarketplaceChannelEventRequest';
import type { MarketplaceChannelEventResponse } from '../models/MarketplaceChannelEventResponse';
import type { MarketplaceDealerIndexResponse } from '../models/MarketplaceDealerIndexResponse';
import type { MarketplaceDealerStatsResponse } from '../models/MarketplaceDealerStatsResponse';
import type { MarketplaceFeedResponse } from '../models/MarketplaceFeedResponse';
import type { MarketplaceLeadCaptureRequest } from '../models/MarketplaceLeadCaptureRequest';
import type { MarketplaceLeadCaptureResponse } from '../models/MarketplaceLeadCaptureResponse';
import type { MarketplaceListingReportRequest } from '../models/MarketplaceListingReportRequest';
import type { MarketplaceListingReportResponse } from '../models/MarketplaceListingReportResponse';
import type { MarketplaceSitesResponse } from '../models/MarketplaceSitesResponse';
import type { MarketplaceVehicleDetailResponse } from '../models/MarketplaceVehicleDetailResponse';
import type { MarketplaceVehicleListResponse } from '../models/MarketplaceVehicleListResponse';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MarketplaceService {
    /**
     * List consumer marketplace sites
     * Returns every business-category marketplace surface exposed to shoppers,
     * with listing counts and site status (active, coming_soon, disabled).
     *
     * @returns MarketplaceSitesResponse Marketplace site index
     * @throws ApiError
     */
    public static listMarketplaceSites(): CancelablePromise<MarketplaceSitesResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/marketplace/sites',
        });
    }
    /**
     * Browse the mixed marketplace feed
     * Returns a cursor-based mixed feed for the consumer marketplace.
     * Vehicle items use marketplace eligibility rules. Promo and notice items
     * are inserted server-side and do not affect cursor semantics.
     *
     * @returns MarketplaceFeedResponse Mixed marketplace feed page
     * @throws ApiError
     */
    public static getMarketplaceFeed({
        category,
        cursor,
        limit = 24,
        make,
        model,
        condition,
        minPrice,
        maxPrice,
        maxMileage,
        minYear,
        maxYear,
        sortBy,
        dealer,
        q,
    }: {
        /**
         * Business category slug or enum. Defaults to AUTOMOTIVE.
         */
        category?: MarketplaceBusinessCategory,
        cursor?: string,
        limit?: number,
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
         * Maximum mileage (inclusive). Omit to include all mileages.
         */
        maxMileage?: number,
        /**
         * Minimum model year (inclusive).
         */
        minYear?: number,
        /**
         * Maximum model year (inclusive).
         */
        maxYear?: number,
        /**
         * Sort order for results. Defaults to newest. Use relevance when q is set for best-match ordering.
         */
        sortBy?: 'newest' | 'price-asc' | 'price-desc' | 'mileage-asc' | 'year-asc' | 'year-desc' | 'relevance',
        /**
         * Filter by dealer ID
         */
        dealer?: string,
        /**
         * Keyword search across make, model, and trim.
         */
        q?: string,
    }): CancelablePromise<MarketplaceFeedResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/marketplace/feed',
            query: {
                'category': category,
                'cursor': cursor,
                'limit': limit,
                'make': make,
                'model': model,
                'condition': condition,
                'minPrice': minPrice,
                'maxPrice': maxPrice,
                'maxMileage': maxMileage,
                'minYear': minYear,
                'maxYear': maxYear,
                'sortBy': sortBy,
                'dealer': dealer,
                'q': q,
            },
            errors: {
                400: `Bad request — invalid query parameter value`,
            },
        });
    }
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
        category,
        make,
        model,
        condition,
        minPrice,
        maxPrice,
        maxMileage,
        minYear,
        maxYear,
        sortBy,
        dealer,
        q,
        page = 1,
        pageSize = 24,
    }: {
        /**
         * Business category slug or enum. Defaults to AUTOMOTIVE.
         */
        category?: MarketplaceBusinessCategory,
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
         * Maximum mileage (inclusive). Omit to include all mileages.
         */
        maxMileage?: number,
        /**
         * Minimum model year (inclusive).
         */
        minYear?: number,
        /**
         * Maximum model year (inclusive).
         */
        maxYear?: number,
        /**
         * Sort order for results. Defaults to newest. Use relevance when q is set for best-match ordering.
         */
        sortBy?: 'newest' | 'price-asc' | 'price-desc' | 'mileage-asc' | 'year-asc' | 'year-desc' | 'relevance',
        /**
         * Filter by dealer ID
         */
        dealer?: string,
        /**
         * Keyword search across make, model, and trim.
         */
        q?: string,
        page?: number,
        pageSize?: number,
    }): CancelablePromise<MarketplaceVehicleListResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/marketplace/vehicles',
            query: {
                'category': category,
                'make': make,
                'model': model,
                'condition': condition,
                'minPrice': minPrice,
                'maxPrice': maxPrice,
                'maxMileage': maxMileage,
                'minYear': minYear,
                'maxYear': maxYear,
                'sortBy': sortBy,
                'dealer': dealer,
                'q': q,
                'page': page,
                'pageSize': pageSize,
            },
            errors: {
                400: `Bad request — invalid query parameter value`,
            },
        });
    }
    /**
     * Single vehicle detail
     * Returns detail for one marketplace-eligible vehicle by opaque listing ID.
     * Returns 404 for sold, removed, non-existent, or wrong-category vehicles.
     *
     * @returns MarketplaceVehicleDetailResponse Vehicle detail
     * @throws ApiError
     */
    public static getMarketplaceVehicle({
        listingId,
        category,
    }: {
        /**
         * Opaque vehicle identifier from MarketplaceVehicleCard.listingId
         */
        listingId: string,
        /**
         * Business category slug or enum. Defaults to AUTOMOTIVE.
         */
        category?: MarketplaceBusinessCategory,
    }): CancelablePromise<MarketplaceVehicleDetailResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/marketplace/vehicles/{listingId}',
            path: {
                'listingId': listingId,
            },
            query: {
                'category': category,
            },
            errors: {
                404: `Not found`,
            },
        });
    }
    /**
     * Submit a vehicle inquiry
     * Public lead capture for one marketplace-eligible vehicle.
     * Accepts basic contact fields only — no buyer accounts required.
     * Returns 404 when the listing is sold, removed, or not found.
     * Does not expose raw lead data on any GET endpoint.
     *
     * @returns MarketplaceLeadCaptureResponse Inquiry accepted
     * @throws ApiError
     */
    public static captureMarketplaceLead({
        listingId,
        requestBody,
    }: {
        /**
         * Opaque vehicle identifier from MarketplaceVehicleCard.listingId
         */
        listingId: string,
        requestBody: MarketplaceLeadCaptureRequest,
    }): CancelablePromise<MarketplaceLeadCaptureResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/marketplace/vehicles/{listingId}/leads',
            path: {
                'listingId': listingId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request — invalid query parameter value`,
                404: `Not found`,
                429: `Too many requests`,
            },
        });
    }
    /**
     * Report a marketplace listing
     * Public trust signal — allows shoppers to flag a listing for review.
     * Rate-limited to 5 reports per IP per 5 minutes per listing.
     * Returns 404 when the listing is sold, removed, or not found.
     *
     * @returns MarketplaceListingReportResponse Report accepted
     * @throws ApiError
     */
    public static reportMarketplaceListing({
        listingId,
        requestBody,
    }: {
        /**
         * Opaque vehicle identifier from MarketplaceVehicleCard.listingId
         */
        listingId: string,
        requestBody: MarketplaceListingReportRequest,
    }): CancelablePromise<MarketplaceListingReportResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/marketplace/vehicles/{listingId}/report',
            path: {
                'listingId': listingId,
            },
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request — invalid query parameter value`,
                404: `Not found`,
                429: `Too many requests`,
            },
        });
    }
    /**
     * Record a first-party marketplace engagement event
     * Captures observed_first_party channel events for consumer-marketplace.
     * Does not return analytics. GET marketplace endpoints remain analytics-free.
     * Rate-limited public write.
     *
     * @returns MarketplaceChannelEventResponse Event accepted
     * @throws ApiError
     */
    public static captureMarketplaceChannelEvent({
        requestBody,
    }: {
        requestBody: MarketplaceChannelEventRequest,
    }): CancelablePromise<MarketplaceChannelEventResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/marketplace/events',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request — invalid query parameter value`,
                404: `Not found`,
                429: `Too many requests`,
            },
        });
    }
    /**
     * Seller storefront index
     * Returns seller info and all marketplace-eligible listings for that seller
     * within the requested business category.
     * Returns 404 when the seller does not exist or belongs to another category.
     *
     * @returns MarketplaceDealerIndexResponse Seller storefront
     * @throws ApiError
     */
    public static getMarketplaceSellerIndex({
        sellerId,
        category,
    }: {
        sellerId: string,
        /**
         * Business category slug or enum. Defaults to AUTOMOTIVE.
         */
        category?: MarketplaceBusinessCategory,
    }): CancelablePromise<MarketplaceDealerIndexResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/marketplace/sellers/{sellerId}',
            path: {
                'sellerId': sellerId,
            },
            query: {
                'category': category,
            },
            errors: {
                400: `Bad request — invalid query parameter value`,
                404: `Not found`,
            },
        });
    }
    /**
     * Dealer storefront index (legacy alias)
     * Legacy alias for GET /api/marketplace/sellers/{sellerId}.
     * Returns dealer info and all marketplace-eligible vehicles for that dealer.
     * Returns 404 when the dealer does not exist or belongs to another category.
     *
     * @returns MarketplaceDealerIndexResponse Dealer index
     * @throws ApiError
     */
    public static getMarketplaceDealerIndex({
        dealerId,
        category,
    }: {
        dealerId: string,
        /**
         * Business category slug or enum. Defaults to AUTOMOTIVE.
         */
        category?: MarketplaceBusinessCategory,
    }): CancelablePromise<MarketplaceDealerIndexResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/marketplace/dealers/{dealerId}',
            path: {
                'dealerId': dealerId,
            },
            query: {
                'category': category,
            },
            errors: {
                404: `Not found`,
            },
        });
    }
    /**
     * First-party channel engagement stats for a dealer
     * Returns aggregated consumer-marketplace engagement counts for one dealer.
     * All values are totals — no individual visitor data is exposed.
     * Returns 404 when the dealer does not exist.
     *
     * @returns MarketplaceDealerStatsResponse Dealer engagement stats
     * @throws ApiError
     */
    public static getMarketplaceDealerStats({
        dealerId,
    }: {
        dealerId: string,
    }): CancelablePromise<MarketplaceDealerStatsResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/marketplace/dealers/{dealerId}/stats',
            path: {
                'dealerId': dealerId,
            },
            errors: {
                404: `Not found`,
            },
        });
    }
}
