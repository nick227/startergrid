import type { MarketplaceMediaItem } from './marketplaceDetailMapper.js';
import {
  GUIDE_KEY_TO_MOSAIC,
  MAIN_PHOTO_CAPTION,
  MAIN_PHOTO_SLOT_KEY,
  MOSAIC_SLOT_SPECS,
} from './mediaSlotMapping.js';

export { MOSAIC_SLOT_SPECS } from './mediaSlotMapping.js';

type DbMedia = {
  id:            string;
  url:           string;
  sortOrder:     number;
  kind?:         string;
  mediaSlotKey?: string | null;
  width?:        number | null;
  height?:       number | null;
  mimeType?:     string | null;
};

type MediaTour = {
  enabled: boolean;
  title:   string | null;
  steps:   Array<{
    mediaId:   string;
    label:     string;
    stepType:  'HIGHLIGHT' | 'ISSUE' | 'NEUTRAL';
    note:      string | null;
    sortOrder: number;
  }>;
};

function detailMediaKind(kind: string | undefined): MarketplaceMediaItem['kind'] {
  const upper = kind?.toUpperCase();
  if (upper === 'VIDEO') return 'VIDEO';
  if (upper === 'SPIN_360') return 'SPIN_360';
  if (upper === 'DOORS_OPEN') return 'DOORS_OPEN';
  return 'IMAGE';
}

function shapeItem(
  m: DbMedia,
  slot: MarketplaceMediaItem['slot'],
  angle: MarketplaceMediaItem['angle'],
  kind: MarketplaceMediaItem['kind'],
  embedUrl: string | null = null,
  caption: string | null = null,
): MarketplaceMediaItem {
  return {
    id:          m.id,
    kind,
    url:         m.url,
    sortOrder:   m.sortOrder,
    slot,
    angle,
    caption,
    posterUrl:   null,
    mimeType:    m.mimeType ?? null,
    width:       m.width ?? null,
    height:      m.height ?? null,
    durationSec: null,
    embedUrl,
  };
}

export function assignDetailMediaSlots(media: DbMedia[]): MarketplaceMediaItem[] {
  const sorted = [...media].sort((a, b) => a.sortOrder - b.sortOrder);
  const items: MarketplaceMediaItem[] = [];
  const usedSlots = new Set<string>();
  const deferred: DbMedia[] = [];
  let overflowOrder = 1000;

  const takeSlot = (
    m: DbMedia,
    spec: (typeof MOSAIC_SLOT_SPECS)[number],
    kind: MarketplaceMediaItem['kind'],
    embedUrl?: string | null,
  ) => {
    if (usedSlots.has(spec.slot)) return false;
    usedSlots.add(spec.slot);
    items.push(shapeItem(m, spec.slot, spec.angle, kind, embedUrl ?? null));
    return true;
  };

  const pushOverflow = (
    m: DbMedia,
    kind: MarketplaceMediaItem['kind'],
    angle: MarketplaceMediaItem['angle'] = 'DETAIL',
    embedUrl?: string | null,
    caption?: string | null,
  ) => {
    const shaped = shapeItem(m, 'OVERFLOW', angle, kind, embedUrl ?? null, caption ?? null);
    shaped.sortOrder = caption === MAIN_PHOTO_CAPTION ? m.sortOrder : overflowOrder++;
    items.push(shaped);
  };

  for (const m of sorted) {
    const kind = detailMediaKind(m.kind);
    const slotKey = m.mediaSlotKey?.trim() || null;

    if (slotKey === MAIN_PHOTO_SLOT_KEY) {
      pushOverflow(m, kind, null, null, MAIN_PHOTO_CAPTION);
      continue;
    }

    if (kind === 'SPIN_360') {
      pushOverflow(m, kind, 'DETAIL', m.url);
      continue;
    }

    if (kind === 'DOORS_OPEN') {
      if (takeSlot(m, MOSAIC_SLOT_SPECS[5]!, kind)) continue;
      pushOverflow(m, kind, 'EXTERIOR_DOORS_OPEN');
      continue;
    }

    if (slotKey && GUIDE_KEY_TO_MOSAIC[slotKey]) {
      if (takeSlot(m, GUIDE_KEY_TO_MOSAIC[slotKey]!, kind)) continue;
      deferred.push(m);
      continue;
    }

    deferred.push(m);
  }

  for (const m of deferred) {
    const kind = detailMediaKind(m.kind);
    const nextSpec = MOSAIC_SLOT_SPECS.find(spec => !usedSlots.has(spec.slot));
    if (nextSpec && takeSlot(m, nextSpec, kind)) continue;
    pushOverflow(m, kind);
  }

  return items.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function buildDefaultMediaTour(items: MarketplaceMediaItem[]): MediaTour | null {
  if (items.length < 2) return null;

  const bySlot = new Map(items.filter(i => i.slot).map(i => [i.slot!, i]));
  const hero = bySlot.get('HERO') ?? items.find(i => i.caption !== MAIN_PHOTO_CAPTION) ?? items[0]!;
  const doors = bySlot.get('SLOT_6') ?? items.find(i => i.kind === 'DOORS_OPEN');
  const condition = items.find(i => i.angle === 'CONDITION') ?? items.find(i => i.slot === 'OVERFLOW' && i.caption !== MAIN_PHOTO_CAPTION);

  const steps: MediaTour['steps'] = [
    { mediaId: hero.id, label: 'Exterior overview', stepType: 'NEUTRAL', note: null, sortOrder: 0 },
  ];

  if (doors && doors.id !== hero.id) {
    steps.push({ mediaId: doors.id, label: 'Doors open', stepType: 'HIGHLIGHT', note: null, sortOrder: 1 });
  } else {
    const secondary = bySlot.get('SLOT_2') ?? items.find(i => i.id !== hero.id && i.caption !== MAIN_PHOTO_CAPTION);
    if (secondary) {
      steps.push({
        mediaId:   secondary.id,
        label:     secondary.kind === 'VIDEO' ? 'Walkaround video' : 'Additional view',
        stepType:  'NEUTRAL',
        note:      null,
        sortOrder: steps.length,
      });
    }
  }

  if (condition && !steps.some(s => s.mediaId === condition.id)) {
    steps.push({
      mediaId:   condition.id,
      label:     'Condition disclosure',
      stepType:  'ISSUE',
      note:      'Review noted wear before purchase.',
      sortOrder: steps.length,
    });
  }

  if (steps.length < 2) return null;
  return { enabled: true, title: 'Walkthrough', steps };
}

export function mapDbMediaToDetailMedia(media: DbMedia[]): { items: MarketplaceMediaItem[]; tour: MediaTour | null } {
  const items = assignDetailMediaSlots(media);
  return { items, tour: null };
}
