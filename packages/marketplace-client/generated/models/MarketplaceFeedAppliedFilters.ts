/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type MarketplaceFeedAppliedFilters = {
    make: string | null;
    model: string | null;
    condition: MarketplaceFeedAppliedFilters.condition | null;
    minPrice: number | null;
    maxPrice: number | null;
    maxMileage: number | null;
    dealer: string | null;
    'q'?: string | null;
    availability: MarketplaceFeedAppliedFilters.availability;
};
export namespace MarketplaceFeedAppliedFilters {
    export enum condition {
        NEW = 'NEW',
        USED = 'USED',
        CPO = 'CPO',
    }
    export enum availability {
        AVAILABLE = 'available',
    }
}

