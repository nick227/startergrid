import type { MarketplaceMediaItem } from './marketplaceDetailMapper.js';

type DbMedia = {
  id:         string;
  url:        string;
  sortOrder:  number;
  kind?:      string;
  width?:     number | null;
  height?:    number | null;
  mimeType?:  string | null;
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

export const MOSAIC_SLOT_SPECS: ReadonlyArray<{
  slot:  NonNullable<MarketplaceMediaItem['slot']>;
  angle: NonNullable<MarketplaceMediaItem['angle']>;
}> = [
  { slot: 'HERO', angle: 'EXTERIOR_FRONT_34' },
  { slot: 'SLOT_2', angle: 'EXTERIOR_FRONT' },
  { slot: 'SLOT_3', angle: 'EXTERIOR_REAR_34' },
  { slot: 'SLOT_4', angle: 'EXTERIOR_REAR' },
  { slot: 'SLOT_5', angle: 'EXTERIOR_SIDE' },
  { slot: 'SLOT_6', angle: 'EXTERIOR_DOORS_OPEN' },
  { slot: 'SLOT_7', angle: 'INTERIOR_FRONT' },
  { slot: 'SLOT_8', angle: 'INTERIOR_REAR' },
  { slot: 'SLOT_9', angle: 'INTERIOR_DASH' },
  { slot: 'SLOT_10', angle: 'INTERIOR_CARGO' },
  { slot: 'SLOT_11', angle: 'DETAIL' },
  { slot: 'SLOT_12', angle: 'DETAIL' },
  { slot: 'SLOT_13', angle: 'DETAIL' },
  { slot: 'SLOT_14', angle: 'DETAIL' },
  { slot: 'SLOT_15', angle: 'DETAIL' },
  { slot: 'SLOT_16', angle: 'DETAIL' },
  { slot: 'SLOT_17', angle: 'DETAIL' },
  { slot: 'SLOT_18', angle: 'DETAIL' },
  { slot: 'SLOT_19', angle: 'DETAIL' },
  { slot: 'SLOT_20', angle: 'DETAIL' },
  { slot: 'SLOT_21', angle: 'DETAIL' },
  { slot: 'SLOT_22', angle: 'DETAIL' },
  { slot: 'SLOT_23', angle: 'DETAIL' },
  { slot: 'SLOT_24', angle: 'DETAIL' },
  { slot: 'SLOT_25', angle: 'DETAIL' },
];

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
): MarketplaceMediaItem {
  return {
    id:          m.id,
    kind,
    url:         m.url,
    sortOrder:   m.sortOrder,
    slot,
    angle,
    caption:     null,
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
  let overflowOrder = 1000;

  const takeSlot = (m: DbMedia, spec: (typeof MOSAIC_SLOT_SPECS)[number], kind: MarketplaceMediaItem['kind'], embedUrl?: string | null) => {
    if (usedSlots.has(spec.slot)) return false;
    usedSlots.add(spec.slot);
    items.push(shapeItem(m, spec.slot, spec.angle, kind, embedUrl ?? null));
    return true;
  };

  const pushOverflow = (m: DbMedia, kind: MarketplaceMediaItem['kind'], angle: MarketplaceMediaItem['angle'] = 'DETAIL', embedUrl?: string | null) => {
    items.push(shapeItem(m, 'OVERFLOW', angle, kind, embedUrl ?? null));
    items[items.length - 1]!.sortOrder = overflowOrder++;
  };

  for (const m of sorted) {
    const kind = detailMediaKind(m.kind);
    if (kind === 'DOORS_OPEN') {
      takeSlot(m, MOSAIC_SLOT_SPECS[5]!, kind) || pushOverflow(m, kind, 'EXTERIOR_DOORS_OPEN');
      continue;
    }
    if (kind === 'SPIN_360') {
      pushOverflow(m, kind, 'DETAIL', m.url);
      continue;
    }
    const nextSpec = MOSAIC_SLOT_SPECS.find(spec => !usedSlots.has(spec.slot));
    if (nextSpec && takeSlot(m, nextSpec, kind)) continue;
    pushOverflow(m, kind);
  }

  return items.sort((a, b) => a.sortOrder - b.sortOrder);
}

export function buildDefaultMediaTour(items: MarketplaceMediaItem[]): MediaTour | null {
  if (items.length < 2) return null;

  const bySlot = new Map(items.filter(i => i.slot).map(i => [i.slot!, i]));
  const hero = bySlot.get('HERO') ?? items[0]!;
  const doors = bySlot.get('SLOT_6') ?? items.find(i => i.kind === 'DOORS_OPEN');
  const condition = items.find(i => i.angle === 'CONDITION') ?? items.find(i => i.slot === 'OVERFLOW');

  const steps: MediaTour['steps'] = [
    { mediaId: hero.id, label: 'Exterior overview', stepType: 'NEUTRAL', note: null, sortOrder: 0 },
  ];

  if (doors && doors.id !== hero.id) {
    steps.push({ mediaId: doors.id, label: 'Doors open', stepType: 'HIGHLIGHT', note: null, sortOrder: 1 });
  } else {
    const secondary = bySlot.get('SLOT_2') ?? items.find(i => i.id !== hero.id);
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
  return { items, tour: buildDefaultMediaTour(items) };
}
