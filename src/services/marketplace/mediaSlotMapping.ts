import type { MarketplaceMediaItem } from './marketplaceDetailMapper.js';

/** Guide slot key for the storefront hero / card thumbnail — never a mosaic exterior cell. */
export const MAIN_PHOTO_SLOT_KEY = 'main-photo';

/** Caption marker so marketplace gallery can separate main photo from overflow. */
export const MAIN_PHOTO_CAPTION = 'Main Photo';

type MosaicSpec = {
  slot: NonNullable<MarketplaceMediaItem['slot']>;
  angle: NonNullable<MarketplaceMediaItem['angle']>;
};

/** Canonical mosaic layout — must stay aligned with apps/marketplace vdpMediaSlotMap.ts */
export const MOSAIC_SLOT_SPECS: ReadonlyArray<MosaicSpec> = [
  { slot: 'HERO', angle: 'EXTERIOR_FRONT_34' },
  { slot: 'SLOT_2', angle: 'EXTERIOR_FRONT' },
  { slot: 'SLOT_3', angle: 'EXTERIOR_REAR_34' },
  { slot: 'SLOT_4', angle: 'EXTERIOR_REAR' },
  { slot: 'SLOT_5', angle: 'EXTERIOR_SIDE' },
  { slot: 'SLOT_6', angle: 'EXTERIOR_DOORS_OPEN' },
  { slot: 'SLOT_7', angle: 'EXTERIOR_SIDE' },
  { slot: 'SLOT_8', angle: 'EXTERIOR_SIDE' },
  { slot: 'SLOT_9', angle: 'INTERIOR_FRONT' },
  { slot: 'SLOT_10', angle: 'INTERIOR_REAR' },
  { slot: 'SLOT_11', angle: 'INTERIOR_DASH' },
  { slot: 'SLOT_12', angle: 'INTERIOR_CARGO' },
  { slot: 'SLOT_13', angle: 'INTERIOR_CARGO' },
  { slot: 'SLOT_14', angle: 'INTERIOR_CARGO' },
  { slot: 'SLOT_15', angle: 'INTERIOR_CARGO' },
  { slot: 'SLOT_16', angle: 'INTERIOR_CARGO' },
  { slot: 'SLOT_17', angle: 'DETAIL' },
  { slot: 'SLOT_18', angle: 'DETAIL' },
  { slot: 'SLOT_19', angle: 'DETAIL' },
  { slot: 'SLOT_20', angle: 'DETAIL' },
  { slot: 'SLOT_21', angle: 'DETAIL' },
  { slot: 'SLOT_22', angle: 'DETAIL' },
  { slot: 'SLOT_23', angle: 'DETAIL' },
  { slot: 'SLOT_24', angle: 'DETAIL' },
];

/** Automotive media-guide keys → fixed mosaic cells (main-photo is handled separately). */
export const GUIDE_KEY_TO_MOSAIC: Readonly<Record<string, MosaicSpec>> = {
  'front-quarter-driver': { slot: 'HERO', angle: 'EXTERIOR_FRONT_34' },
  'front': { slot: 'SLOT_2', angle: 'EXTERIOR_FRONT' },
  'rear-quarter-driver': { slot: 'SLOT_3', angle: 'EXTERIOR_REAR_34' },
  'front-quarter-passenger': { slot: 'SLOT_3', angle: 'EXTERIOR_REAR_34' },
  'rear': { slot: 'SLOT_4', angle: 'EXTERIOR_REAR' },
  'driver-side': { slot: 'SLOT_5', angle: 'EXTERIOR_SIDE' },
  'passenger-side': { slot: 'SLOT_7', angle: 'EXTERIOR_SIDE' },
  'rear-quarter-passenger': { slot: 'SLOT_8', angle: 'EXTERIOR_SIDE' },
  'driver-interior': { slot: 'SLOT_9', angle: 'INTERIOR_FRONT' },
  'front-seats': { slot: 'SLOT_9', angle: 'INTERIOR_FRONT' },
  'passenger-interior': { slot: 'SLOT_10', angle: 'INTERIOR_REAR' },
  'back-seats': { slot: 'SLOT_10', angle: 'INTERIOR_REAR' },
  'dashboard': { slot: 'SLOT_11', angle: 'INTERIOR_DASH' },
  'trunk-cargo': { slot: 'SLOT_12', angle: 'INTERIOR_CARGO' },
  'center-console': { slot: 'SLOT_13', angle: 'INTERIOR_CARGO' },
  'odometer': { slot: 'SLOT_14', angle: 'DETAIL' },
  'engine': { slot: 'SLOT_17', angle: 'DETAIL' },
  'vin-plate': { slot: 'SLOT_18', angle: 'DETAIL' },
  'window-sticker': { slot: 'SLOT_19', angle: 'DETAIL' },
  'keys': { slot: 'SLOT_20', angle: 'DETAIL' },
  'wheels': { slot: 'SLOT_21', angle: 'DETAIL' },
  'tires': { slot: 'SLOT_22', angle: 'DETAIL' },
  'damage-detail': { slot: 'SLOT_23', angle: 'CONDITION' },
};

type CardMedia = {
  url: string;
  sortOrder: number;
  kind?: string;
  mediaSlotKey?: string | null;
};

const CARD_THUMBNAIL_SLOT_PRIORITY = [
  MAIN_PHOTO_SLOT_KEY,
  'front',
  'front-quarter-driver',
  'front-quarter-passenger',
] as const;

/** Puts main-photo first for listing cards and carousels; preserves relative order otherwise. */
export function orderMediaForCardDisplay<T extends CardMedia>(media: T[]): T[] {
  const sorted = [...media].sort((a, b) => a.sortOrder - b.sortOrder);
  const images = sorted.filter(m => m.url && (m.kind?.toUpperCase() ?? 'IMAGE') !== 'VIDEO');

  for (const slotKey of CARD_THUMBNAIL_SLOT_PRIORITY) {
    const matches = sorted.filter(m => m.mediaSlotKey === slotKey);
    const pick = matches[matches.length - 1];
    if (!pick) continue;
    return [pick, ...sorted.filter(m => m !== pick)];
  }

  if (images[0]) {
    return [images[0], ...sorted.filter(m => m !== images[0])];
  }

  return sorted;
}

export function isMainPhotoMarketplaceItem(item: Pick<MarketplaceMediaItem, 'caption'>): boolean {
  return item.caption === MAIN_PHOTO_CAPTION;
}
