/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
export type ListingIdentity = {
    source: ListingIdentity.source;
    inventoryId: string;
    dealershipId: string;
    categoryId: string;
    publicationId: string | null;
};
export namespace ListingIdentity {
    export enum source {
        VEHICLE = 'vehicle',
        CATEGORY_ITEM = 'category_item',
    }
}

