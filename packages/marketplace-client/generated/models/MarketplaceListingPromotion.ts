/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
import type { PromotionChannel } from './PromotionChannel';
/**
 * Platform syndication context — required on every detail response.
 * Operator/context data first; not default consumer-visible VDP content.
 *
 */
export type MarketplaceListingPromotion = {
    platformListingId: string;
    channels: Array<PromotionChannel>;
    syndicationStatus: MarketplaceListingPromotion.syndicationStatus;
    lastSyncedAt: string | null;
    primaryChannelSlug: string | null;
};
export namespace MarketplaceListingPromotion {
    export enum syndicationStatus {
        DRAFT = 'DRAFT',
        LIVE = 'LIVE',
        PAUSED = 'PAUSED',
        ERROR = 'ERROR',
    }
}

