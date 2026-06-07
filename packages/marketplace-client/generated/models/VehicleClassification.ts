/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type VehicleClassification = {
    mileage: number;
    usageUnit?: VehicleClassification.usageUnit | null;
    /**
     * Optional unit subtype label (RV, ATV, Trailer, etc.).
     */
    unitType?: string | null;
    bodyStyle: string | null;
    vehicleType: string | null;
    vehicleSize: string | null;
    doorCount: number | null;
    seatCount: number | null;
    priorUse: string | null;
};
export namespace VehicleClassification {
    export enum usageUnit {
        MILES = 'miles',
        HOURS = 'hours',
    }
}

