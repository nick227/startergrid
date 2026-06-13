/* generated using openapi-typescript-codegen -- do not edit */
/* istanbul ignore file */
/* tslint:disable */
/* eslint-disable */
/**
 * Full media item for detail gallery (extended kinds, slots, tour refs).
 */
export type MarketplaceMediaItem = {
    id: string;
    kind: MarketplaceMediaItem.kind;
    url: string;
    sortOrder: number;
    slot: MarketplaceMediaItem.slot | null;
    angle: MarketplaceMediaItem.angle | null;
    caption: string | null;
    posterUrl: string | null;
    mimeType: string | null;
    width: number | null;
    height: number | null;
    durationSec: number | null;
    embedUrl: string | null;
};
export namespace MarketplaceMediaItem {
    export enum kind {
        IMAGE = 'IMAGE',
        VIDEO = 'VIDEO',
        SPIN_360 = 'SPIN_360',
        DOORS_OPEN = 'DOORS_OPEN',
    }
    export enum slot {
        HERO = 'HERO',
        SLOT_2 = 'SLOT_2',
        SLOT_3 = 'SLOT_3',
        SLOT_4 = 'SLOT_4',
        SLOT_5 = 'SLOT_5',
        SLOT_6 = 'SLOT_6',
        SLOT_7 = 'SLOT_7',
        SLOT_8 = 'SLOT_8',
        SLOT_9 = 'SLOT_9',
        SLOT_10 = 'SLOT_10',
        SLOT_11 = 'SLOT_11',
        SLOT_12 = 'SLOT_12',
        SLOT_13 = 'SLOT_13',
        SLOT_14 = 'SLOT_14',
        SLOT_15 = 'SLOT_15',
        SLOT_16 = 'SLOT_16',
        SLOT_17 = 'SLOT_17',
        SLOT_18 = 'SLOT_18',
        SLOT_19 = 'SLOT_19',
        SLOT_20 = 'SLOT_20',
        SLOT_21 = 'SLOT_21',
        SLOT_22 = 'SLOT_22',
        SLOT_23 = 'SLOT_23',
        SLOT_24 = 'SLOT_24',
        SLOT_25 = 'SLOT_25',
        OVERFLOW = 'OVERFLOW',
    }
    export enum angle {
        EXTERIOR_FRONT_34 = 'EXTERIOR_FRONT_34',
        EXTERIOR_FRONT = 'EXTERIOR_FRONT',
        EXTERIOR_REAR_34 = 'EXTERIOR_REAR_34',
        EXTERIOR_REAR = 'EXTERIOR_REAR',
        EXTERIOR_SIDE = 'EXTERIOR_SIDE',
        EXTERIOR_DOORS_OPEN = 'EXTERIOR_DOORS_OPEN',
        INTERIOR_FRONT = 'INTERIOR_FRONT',
        INTERIOR_REAR = 'INTERIOR_REAR',
        INTERIOR_DASH = 'INTERIOR_DASH',
        INTERIOR_CARGO = 'INTERIOR_CARGO',
        DETAIL = 'DETAIL',
        CONDITION = 'CONDITION',
    }
}

