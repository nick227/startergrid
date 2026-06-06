/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type VehicleCommerce = {
    priceCents: number;
    originalPriceCents?: number | null;
    priceLastChangedAt?: string | null;
    estimatedMonthlyPaymentCents?: number | null;
    availabilityStatus: VehicleCommerce.availabilityStatus;
    shippingPriceCents?: number | null;
    estimatedArrival?: string | null;
    listedAt: string;
};
export namespace VehicleCommerce {
    export enum availabilityStatus {
        AVAILABLE = 'AVAILABLE',
        PENDING = 'PENDING',
        SOLD = 'SOLD',
    }
}

