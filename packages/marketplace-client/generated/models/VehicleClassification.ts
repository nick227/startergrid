/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type VehicleClassification = {
    mileage: number;
    usageUnit?: VehicleClassification.usageUnit | null;
    /**
     * Optional unit subtype label (RV, ATV, vessel type, etc.).
     */
    unitType?: string | null;
    /**
     * Vessel length in feet when provided in categoryPayload.
     */
    lengthFt?: number | null;
    /**
     * Engine hours when distinct from listing usage hours.
     */
    engineHours?: number | null;
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

