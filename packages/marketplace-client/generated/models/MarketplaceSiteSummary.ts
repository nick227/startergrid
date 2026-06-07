/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MarketplaceSiteSummary = {
    category: string;
    slug: string;
    label: string;
    status: MarketplaceSiteSummary.status;
    listingCount: number;
    href: string;
    tagline: string;
};
export namespace MarketplaceSiteSummary {
    export enum status {
        ACTIVE = 'active',
        COMING_SOON = 'coming_soon',
        DISABLED = 'disabled',
    }
}

