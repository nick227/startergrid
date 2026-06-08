/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MarketplaceListingReportRequest = {
    reason: MarketplaceListingReportRequest.reason;
    /**
     * Optional additional context from the reporter.
     */
    details?: string;
};
export namespace MarketplaceListingReportRequest {
    export enum reason {
        PRICE_MISMATCH = 'PRICE_MISMATCH',
        SOLD_OR_UNAVAILABLE = 'SOLD_OR_UNAVAILABLE',
        SUSPECTED_FRAUD = 'SUSPECTED_FRAUD',
        INACCURATE_DESCRIPTION = 'INACCURATE_DESCRIPTION',
        INAPPROPRIATE_CONTENT = 'INAPPROPRIATE_CONTENT',
        OTHER = 'OTHER',
    }
}

