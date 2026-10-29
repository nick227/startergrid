/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { ListingIdentity } from './ListingIdentity';
/**
 * Consumer-safe category item card. Apparel fields are nullable for categories that do not use them.
 */
export type MarketplaceCategoryItemCard = {
    condition?: string | null;
    brand?: string | null;
    size?: string | null;
    color?: string | null;
    material?: string | null;
    era?: string | null;
    identity?: ListingIdentity;
    /**
     * Opaque stable identifier for the detail route.
     */
    listingId: string;
    /**
     * Business category enum (e.g. EBOOKS).
     */
    categoryId: string;
    stockNumber: string | null;
    title: string | null;
    author?: string | null;
    format?: string | null;
    priceCents: number;
    mediaUrls: Array<string>;
    dealerId: string;
    dealerName: string;
    dealerCity?: string | null;
    dealerState?: string | null;
    listingUrl: string;
    listedAt: string;
};

