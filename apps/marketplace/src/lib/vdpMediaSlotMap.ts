import type { MarketplaceMediaItem } from '@dealer-marketplace/client';
import { MarketplaceMediaItem as MediaEnums } from '@dealer-marketplace/client';
import { angleLabel } from './vdpMediaLabels.ts';

export const VDP_MOSAIC_SLOT_ORDER: ReadonlyArray<{
  slot: MarketplaceMediaItem['slot'];
  angle: MarketplaceMediaItem['angle'];
}> = [
  { slot: MediaEnums.slot.HERO, angle: MediaEnums.angle.EXTERIOR_FRONT_34 },
  { slot: MediaEnums.slot.SLOT_2, angle: MediaEnums.angle.EXTERIOR_FRONT },
  { slot: MediaEnums.slot.SLOT_3, angle: MediaEnums.angle.EXTERIOR_REAR_34 },
  { slot: MediaEnums.slot.SLOT_4, angle: MediaEnums.angle.EXTERIOR_REAR },
  { slot: MediaEnums.slot.SLOT_5, angle: MediaEnums.angle.EXTERIOR_SIDE },
  { slot: MediaEnums.slot.SLOT_6, angle: MediaEnums.angle.EXTERIOR_DOORS_OPEN },
  { slot: MediaEnums.slot.SLOT_7, angle: MediaEnums.angle.INTERIOR_FRONT },
  { slot: MediaEnums.slot.SLOT_8, angle: MediaEnums.angle.INTERIOR_REAR },
  { slot: MediaEnums.slot.SLOT_9, angle: MediaEnums.angle.INTERIOR_DASH },
  { slot: MediaEnums.slot.SLOT_10, angle: MediaEnums.angle.INTERIOR_CARGO },
  { slot: MediaEnums.slot.SLOT_11, angle: MediaEnums.angle.DETAIL },
  { slot: MediaEnums.slot.SLOT_12, angle: MediaEnums.angle.DETAIL },
  { slot: MediaEnums.slot.SLOT_13, angle: MediaEnums.angle.DETAIL },
  { slot: MediaEnums.slot.SLOT_14, angle: MediaEnums.angle.DETAIL },
  { slot: MediaEnums.slot.SLOT_15, angle: MediaEnums.angle.DETAIL },
  { slot: MediaEnums.slot.SLOT_16, angle: MediaEnums.angle.DETAIL },
  { slot: MediaEnums.slot.SLOT_17, angle: MediaEnums.angle.DETAIL },
  { slot: MediaEnums.slot.SLOT_18, angle: MediaEnums.angle.DETAIL },
  { slot: MediaEnums.slot.SLOT_19, angle: MediaEnums.angle.DETAIL },
  { slot: MediaEnums.slot.SLOT_20, angle: MediaEnums.angle.DETAIL },
  { slot: MediaEnums.slot.SLOT_21, angle: MediaEnums.angle.DETAIL },
  { slot: MediaEnums.slot.SLOT_22, angle: MediaEnums.angle.DETAIL },
  { slot: MediaEnums.slot.SLOT_23, angle: MediaEnums.angle.DETAIL },
  { slot: MediaEnums.slot.SLOT_24, angle: MediaEnums.angle.DETAIL },
  { slot: MediaEnums.slot.SLOT_25, angle: MediaEnums.angle.DETAIL },
];

const MOSAIC_SLOT_SET = new Set<MarketplaceMediaItem['slot']>(
  VDP_MOSAIC_SLOT_ORDER.map(s => s.slot),
);

export type VdpSlotCell = {
  slot: MarketplaceMediaItem['slot'];
  angle: MarketplaceMediaItem['angle'];
  label: string;
  item: MarketplaceMediaItem | null;
};

export type VdpMediaSlotMap = {
  mosaic: VdpSlotCell[];
  overflow: MarketplaceMediaItem[];
};

function emptyMosaic(): VdpSlotCell[] {
  return VDP_MOSAIC_SLOT_ORDER.map(({ slot, angle }) => ({
    slot,
    angle,
    label: angleLabel(angle),
    item: null,
  }));
}

function assignToCell(cells: VdpSlotCell[], item: MarketplaceMediaItem, slot: MarketplaceMediaItem['slot']): boolean {
  const cell = cells.find(c => c.slot === slot);
  if (!cell || cell.item) return false;
  cell.item = item;
  return true;
}

export function buildVdpMediaSlotMap(items: MarketplaceMediaItem[]): VdpMediaSlotMap {
  const mosaic = emptyMosaic();
  const overflow: MarketplaceMediaItem[] = [];
  const sorted = [...items].sort((a, b) => a.sortOrder - b.sortOrder);

  for (const item of sorted) {
    // Explicit OVERFLOW marker always goes to overflow — check before angle fallback.
    if (item.slot === MediaEnums.slot.OVERFLOW) {
      overflow.push(item);
      continue;
    }
    if (item.slot && MOSAIC_SLOT_SET.has(item.slot) && assignToCell(mosaic, item, item.slot)) {
      continue;
    }
    if (item.angle) {
      const byAngle = mosaic.find(c => c.angle === item.angle && !c.item);
      if (byAngle) {
        byAngle.item = item;
        continue;
      }
    }
    overflow.push(item);
  }

  overflow.sort((a, b) => a.sortOrder - b.sortOrder);
  return { mosaic, overflow };
}

export function collectLightboxItems(map: VdpMediaSlotMap): MarketplaceMediaItem[] {
  const mosaicItems = map.mosaic.flatMap(cell => (cell.item ? [cell.item] : []));
  return [...mosaicItems, ...map.overflow];
}

export function lightboxIndexForItem(map: VdpMediaSlotMap, itemId: string): number {
  return collectLightboxItems(map).findIndex(item => item.id === itemId);
}
