/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { MarketplaceCardMediaItem } from './MarketplaceCardMediaItem';
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
    /**
     * Previous price before a price drop. Null when no drop has occurred.
     */
    originalPriceCents?: number | null;
    mileage: number;
    /**
     * Optional usage suffix for non-automotive inventory (defaults to miles when omitted).
     */
    usageUnit?: MarketplaceVehicleCard.usageUnit | null;
    /**
     * Vessel or unit type from categoryPayload (boats vesselType, trailers unitType).
     */
    unitType?: string | null;
    /**
     * Length in feet when stored on categoryPayload.
     */
    lengthFt?: number | null;
    exteriorColor: string | null;
    /**
     * First 8 images ordered by sort sequence. Additional images available in the detail endpoint.
     *
     */
    mediaUrls: Array<string>;
    /**
     * First 8 media items ordered by sort sequence.
     */
    mediaItems: Array<MarketplaceCardMediaItem>;
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
    /**
     * Optional usage suffix for non-automotive inventory (defaults to miles when omitted).
     */
    export enum usageUnit {
        MILES = 'miles',
        HOURS = 'hours',
    }
}

