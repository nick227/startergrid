/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MarketplaceChannelEventRequest = {
    eventType: MarketplaceChannelEventRequest.eventType;
    /**
     * Required for vehicle_impression and vehicle_detail_view.
     */
    listingId?: string;
    /**
     * Required for dealer_page_view.
     */
    dealerId?: string;
};
export namespace MarketplaceChannelEventRequest {
    export enum eventType {
        VEHICLE_IMPRESSION = 'vehicle_impression',
        VEHICLE_DETAIL_VIEW = 'vehicle_detail_view',
        DEALER_PAGE_VIEW = 'dealer_page_view',
    }
}

