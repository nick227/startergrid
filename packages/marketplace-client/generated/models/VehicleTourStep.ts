/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type VehicleTourStep = {
    mediaId: string;
    label: string;
    stepType: VehicleTourStep.stepType;
    note: string | null;
    sortOrder: number;
};
export namespace VehicleTourStep {
    export enum stepType {
        HIGHLIGHT = 'HIGHLIGHT',
        ISSUE = 'ISSUE',
        NEUTRAL = 'NEUTRAL',
    }
}

