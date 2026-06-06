/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type VehicleCore = {
    listingId: string;
    stockNumber: string;
    /**
     * Full VIN — public on detail by policy.
     */
    vin: string;
    year: number;
    make: string;
    model: string;
    trim: string | null;
    condition: VehicleCore.condition;
    /**
     * Platform-computed display title.
     */
    title: string;
};
export namespace VehicleCore {
    export enum condition {
        NEW = 'NEW',
        USED = 'USED',
        CPO = 'CPO',
    }
}

