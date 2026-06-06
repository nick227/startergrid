/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Consumer-safe vehicle card. Contains no VIN, no operator-internal IDs,
 * no sync state, no performance analytics, no account data.
 *
 */
export type MarketplaceVehicleCard = {
    /**
     * Opaque stable identifier for the detail route. Not the vehicle VIN.
     */
    listingId: string;
    stockNumber: string;
    year: number;
    make: string;
    model: string;
    trim: string | null;
    condition: MarketplaceVehicleCard.condition;
    priceCents: number;
    mileage: number;
    exteriorColor: string | null;
    /**
     * First 8 images ordered by sort sequence. Additional images available in the detail endpoint.
     *
     */
    mediaUrls: Array<string>;
    dealerId: string;
    /**
     * dbaName when available, otherwise legalName.
     */
    dealerName: string;
    dealerCity: string | null;
    dealerState: string | null;
    /**
     * Relative URL to the consumer listing page.
     */
    listingUrl: string;
    /**
     * When the vehicle was first listed.
     */
    listedAt: string;
};
export namespace MarketplaceVehicleCard {
    export enum condition {
        NEW = 'NEW',
        USED = 'USED',
        CPO = 'CPO',
    }
}

