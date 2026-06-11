import type { MarketplaceMediaItem } from '@dealer-marketplace/client';
import { MarketplaceMediaItem as MediaEnums } from '@dealer-marketplace/client';

function fixtureMedia(
  id: string,
  overrides: Partial<MarketplaceMediaItem> & Pick<MarketplaceMediaItem, 'url' | 'sortOrder'>,
): MarketplaceMediaItem {
  return {
    id,
    kind: MediaEnums.kind.IMAGE,
    slot: null,
    angle: null,
    caption: null,
    posterUrl: null,
    mimeType: 'image/jpeg',
    width: 1200,
    height: 900,
    durationSec: null,
    embedUrl: null,
    ...overrides,
  };
}

export const GALLERY_FIXTURES = {
  heroOnly: [
    fixtureMedia('hero', { sortOrder: 0, slot: MediaEnums.slot.HERO, angle: MediaEnums.angle.EXTERIOR_FRONT_34, url: 'https://cdn.example.com/hero.jpg' }),
  ],
  sparseMosaic: [
    fixtureMedia('hero', { sortOrder: 0, slot: MediaEnums.slot.HERO, angle: MediaEnums.angle.EXTERIOR_FRONT_34, url: 'https://cdn.example.com/hero.jpg' }),
    fixtureMedia('side', { sortOrder: 4, slot: MediaEnums.slot.SLOT_5, angle: MediaEnums.angle.EXTERIOR_SIDE, url: 'https://cdn.example.com/side.jpg' }),
  ],
  mixedKinds: [
    fixtureMedia('hero', { sortOrder: 0, slot: MediaEnums.slot.HERO, angle: MediaEnums.angle.EXTERIOR_FRONT_34, url: 'https://cdn.example.com/hero.jpg' }),
    fixtureMedia('video', { sortOrder: 1, kind: MediaEnums.kind.VIDEO, slot: MediaEnums.slot.SLOT_2, angle: MediaEnums.angle.EXTERIOR_FRONT, url: 'https://cdn.example.com/walk.mp4', mimeType: 'video/mp4' }),
    fixtureMedia('spin', { sortOrder: 2, kind: MediaEnums.kind.SPIN_360, slot: MediaEnums.slot.OVERFLOW, angle: MediaEnums.angle.DETAIL, url: 'https://cdn.example.com/spin', embedUrl: 'https://embed.example.com/spin' }),
    fixtureMedia('doors', { sortOrder: 3, kind: MediaEnums.kind.DOORS_OPEN, slot: MediaEnums.slot.SLOT_6, angle: MediaEnums.angle.EXTERIOR_DOORS_OPEN, url: 'https://cdn.example.com/doors.jpg' }),
  ],
};
