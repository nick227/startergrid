/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Aggregated first-party engagement counts for one dealer's consumer-marketplace channel.
 * All values are totals; no individual visitor data is included.
 *
 */
export type MarketplaceDealerStatsResponse = {
    dealerId: string;
    /**
     * Total vehicle detail page views.
     */
    vehicleDetailViews: number;
    /**
     * Total dealer storefront page views.
     */
    dealerPageViews: number;
    /**
     * Total inquiry form submissions.
     */
    inquirySubmissions: number;
};

