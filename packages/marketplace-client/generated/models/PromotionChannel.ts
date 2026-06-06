/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type PromotionChannel = {
    slug: string;
    label: string;
    status: PromotionChannel.status;
    liveUrl: string | null;
};
export namespace PromotionChannel {
    export enum status {
        ACTIVE = 'ACTIVE',
        PENDING = 'PENDING',
        BLOCKED = 'BLOCKED',
        OFF = 'OFF',
    }
}

