/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MarketplaceBusinessCategory } from '../models/MarketplaceBusinessCategory';
import type { MarketplaceFavoriteAddResponse } from '../models/MarketplaceFavoriteAddResponse';
import type { MarketplaceFavoriteRemoveResponse } from '../models/MarketplaceFavoriteRemoveResponse';
import type { MarketplaceFavoritesResponse } from '../models/MarketplaceFavoritesResponse';
import type { MarketplaceLoginRequest } from '../models/MarketplaceLoginRequest';
import type { MarketplaceLogoutResponse } from '../models/MarketplaceLogoutResponse';
import type { MarketplaceRegisterRequest } from '../models/MarketplaceRegisterRequest';
import type { MarketplaceUserIdentity } from '../models/MarketplaceUserIdentity';
import type { CancelablePromise } from '../core/CancelablePromise';
import { OpenAPI } from '../core/OpenAPI';
import { request as __request } from '../core/request';
export class MarketplaceAuthService {
    /**
     * Consumer registration
     * Creates a new consumer account, returns a safe consumer identity, and sets an
     * `mp_session` HttpOnly cookie (30 days). Duplicate email returns 409.
     *
     * @returns MarketplaceUserIdentity Registration successful
     * @throws ApiError
     */
    public static marketplaceRegister({
        requestBody,
    }: {
        requestBody: MarketplaceRegisterRequest,
    }): CancelablePromise<MarketplaceUserIdentity> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/marketplace/auth/register',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request — invalid query parameter value`,
                409: `Email already registered`,
            },
        });
    }
    /**
     * Consumer login
     * Accepts email + password. Returns a safe consumer identity and sets an
     * `mp_session` HttpOnly cookie (30 days). Unknown email and wrong password
     * return the same 401 to prevent email enumeration.
     *
     * @returns MarketplaceUserIdentity Login successful
     * @throws ApiError
     */
    public static marketplaceLogin({
        requestBody,
    }: {
        requestBody: MarketplaceLoginRequest,
    }): CancelablePromise<MarketplaceUserIdentity> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/marketplace/auth/login',
            body: requestBody,
            mediaType: 'application/json',
            errors: {
                400: `Bad request — invalid query parameter value`,
                401: `Authentication required or session invalid`,
            },
        });
    }
    /**
     * Consumer logout
     * Revokes the current mp_session if present and clears the cookie.
     * Always returns 200 — safe to call unconditionally.
     *
     * @returns MarketplaceLogoutResponse Logged out
     * @throws ApiError
     */
    public static marketplaceLogout(): CancelablePromise<MarketplaceLogoutResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/marketplace/auth/logout',
            errors: {
                400: `Bad request — invalid query parameter value`,
            },
        });
    }
    /**
     * Get current consumer identity
     * Returns the authenticated consumer's identity from a valid mp_session cookie.
     * Returns 401 when the cookie is missing, invalid, revoked, expired, or the
     * account is inactive.
     *
     * @returns MarketplaceUserIdentity Authenticated consumer identity
     * @throws ApiError
     */
    public static getMarketplaceMe(): CancelablePromise<MarketplaceUserIdentity> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/marketplace/auth/me',
            errors: {
                401: `Authentication required or session invalid`,
            },
        });
    }
    /**
     * List saved favorites
     * Returns marketplace-safe vehicle cards for all currently-eligible favorited listings
     * in the requested business category.
     * Sold, removed, or unpriced vehicles are silently omitted from this response.
     * The underlying favorite record is preserved — cards reappear if the vehicle is re-listed.
     *
     * @returns MarketplaceFavoritesResponse Favorites list
     * @throws ApiError
     */
    public static getMarketplaceFavorites({
        category,
    }: {
        /**
         * Business category slug or enum. Defaults to AUTOMOTIVE.
         */
        category?: MarketplaceBusinessCategory,
    }): CancelablePromise<MarketplaceFavoritesResponse> {
        return __request(OpenAPI, {
            method: 'GET',
            url: '/api/marketplace/me/favorites',
            query: {
                'category': category,
            },
            errors: {
                401: `Authentication required or session invalid`,
            },
        });
    }
    /**
     * Save a listing to favorites
     * Idempotent add. Saving an already-saved listing is a no-op.
     * Returns 404 when the listing does not exist or is not marketplace-eligible
     * (sold, removed, or unpriced).
     *
     * @returns MarketplaceFavoriteAddResponse Favorite saved (or already saved)
     * @throws ApiError
     */
    public static addMarketplaceFavorite({
        listingId,
        category,
    }: {
        listingId: string,
        /**
         * Business category slug or enum. Defaults to AUTOMOTIVE.
         */
        category?: MarketplaceBusinessCategory,
    }): CancelablePromise<MarketplaceFavoriteAddResponse> {
        return __request(OpenAPI, {
            method: 'POST',
            url: '/api/marketplace/me/favorites/{listingId}',
            path: {
                'listingId': listingId,
            },
            query: {
                'category': category,
            },
            errors: {
                401: `Authentication required or session invalid`,
                404: `Not found`,
            },
        });
    }
    /**
     * Remove a listing from favorites
     * Idempotent remove. Always returns 200 — safe to call even when the listing
     * was never favorited.
     *
     * @returns MarketplaceFavoriteRemoveResponse Favorite removed (or was not present)
     * @throws ApiError
     */
    public static removeMarketplaceFavorite({
        listingId,
    }: {
        listingId: string,
    }): CancelablePromise<MarketplaceFavoriteRemoveResponse> {
        return __request(OpenAPI, {
            method: 'DELETE',
            url: '/api/marketplace/me/favorites/{listingId}',
            path: {
                'listingId': listingId,
            },
            errors: {
                401: `Authentication required or session invalid`,
            },
        });
    }
}
