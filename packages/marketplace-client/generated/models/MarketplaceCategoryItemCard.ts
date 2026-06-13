/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Consumer-safe category item card for browse lists (e-books, digital items).
 */
export type MarketplaceCategoryItemCard = {
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

