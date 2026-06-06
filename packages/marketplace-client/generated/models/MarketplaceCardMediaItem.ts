/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Lean media item for browse cards (IMAGE and VIDEO only).
 */
export type MarketplaceCardMediaItem = {
    kind: MarketplaceCardMediaItem.kind;
    url: string;
    width: number | null;
    height: number | null;
    mimeType: string | null;
    posterUrl: string | null;
};
export namespace MarketplaceCardMediaItem {
    export enum kind {
        IMAGE = 'IMAGE',
        VIDEO = 'VIDEO',
    }
}

