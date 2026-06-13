import { describe, expect, it } from 'vitest';
import { MarketplaceMediaItem as MediaEnums } from '@dealer-marketplace/client';
import {
  buildVdpMediaSlotMap,
  collectLightboxItems,
  lightboxIndexForItem,
  VDP_MOSAIC_SLOT_ORDER,
} from './vdpMediaSlotMap.ts';
import { GALLERY_FIXTURES } from './vdpGalleryFixtures.ts';

describe('buildVdpMediaSlotMap', () => {
  it('always returns fixed mosaic cells in canonical slot order', () => {
    const map = buildVdpMediaSlotMap(GALLERY_FIXTURES.sparseMosaic);
    expect(map.mosaic).toHaveLength(VDP_MOSAIC_SLOT_ORDER.length);
    expect(map.mosaic.map(cell => cell.slot)).toEqual(VDP_MOSAIC_SLOT_ORDER.map(s => s.slot));
  });

  it('does not shift slots when intermediate angles are missing', () => {
    const map = buildVdpMediaSlotMap(GALLERY_FIXTURES.sparseMosaic);
    expect(map.mosaic[0]!.item?.id).toBe('hero');
    expect(map.mosaic[1]!.item).toBeNull();
    expect(map.mosaic[2]!.item).toBeNull();
    expect(map.mosaic[4]!.item?.id).toBe('side');
    expect(map.mosaic[5]!.item).toBeNull();
  });

  it('keeps doors-open media in slot six when provided', () => {
    const map = buildVdpMediaSlotMap(GALLERY_FIXTURES.mixedKinds);
    expect(map.mosaic[5]!.slot).toBe(MediaEnums.slot.SLOT_6);
    expect(map.mosaic[5]!.item?.kind).toBe(MediaEnums.kind.DOORS_OPEN);
  });

  it('routes unmatched media to overflow without collapsing mosaic cells', () => {
    const map = buildVdpMediaSlotMap(GALLERY_FIXTURES.mixedKinds);
    expect(map.overflow.some(item => item.id === 'spin')).toBe(true);
    expect(map.mosaic.filter(cell => cell.item === null).length).toBeGreaterThan(0);
  });

  it('collectLightboxItems preserves mosaic order then overflow', () => {
    const map = buildVdpMediaSlotMap(GALLERY_FIXTURES.mixedKinds);
    const items = collectLightboxItems(map);
    expect(items[0]!.id).toBe('hero');
    expect(items[items.length - 1]?.id).toBe('spin');
    expect(lightboxIndexForItem(map, 'doors')).toBe(items.findIndex(item => item.id === 'doors'));
  });
});
