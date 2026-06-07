/** Typed categoryPayload shapes for non-automotive inventory categories. */

export type SongsCategoryPayload = {
  format?: string;
  genre?: string;
  trackCount?: number;
};

export type EbooksCategoryPayload = {
  format?: string;
  pageCount?: number;
  language?: string;
};

export type ApparelCategoryPayload = {
  material?: string;
  gender?: string;
};

export type DigitalArtCategoryPayload = {
  medium?: string;
  editionSize?: number;
};

export type VideoCategoryPayload = {
  durationSec?: number;
  resolution?: string;
};

export type PawnCategoryPayload = {
  itemCategory?: string;
};

export type NonVehicleCategoryPayload =
  | SongsCategoryPayload
  | EbooksCategoryPayload
  | ApparelCategoryPayload
  | DigitalArtCategoryPayload
  | VideoCategoryPayload
  | PawnCategoryPayload;

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function asOptionalNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function parseRecord(raw: unknown): Record<string, unknown> | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  return raw as Record<string, unknown>;
}

export function parseSongsCategoryPayload(raw: unknown): SongsCategoryPayload {
  const record = parseRecord(raw);
  if (!record) return {};
  return {
    format: asOptionalString(record['format']),
    genre: asOptionalString(record['genre']),
    trackCount: asOptionalNumber(record['trackCount']),
  };
}

export function parseEbooksCategoryPayload(raw: unknown): EbooksCategoryPayload {
  const record = parseRecord(raw);
  if (!record) return {};
  return {
    format: asOptionalString(record['format']),
    pageCount: asOptionalNumber(record['pageCount']),
    language: asOptionalString(record['language']),
  };
}

export function parseApparelCategoryPayload(raw: unknown): ApparelCategoryPayload {
  const record = parseRecord(raw);
  if (!record) return {};
  return {
    material: asOptionalString(record['material']),
    gender: asOptionalString(record['gender']),
  };
}

export function parseDigitalArtCategoryPayload(raw: unknown): DigitalArtCategoryPayload {
  const record = parseRecord(raw);
  if (!record) return {};
  return {
    medium: asOptionalString(record['medium']),
    editionSize: asOptionalNumber(record['editionSize']),
  };
}

export function parseVideoCategoryPayload(raw: unknown): VideoCategoryPayload {
  const record = parseRecord(raw);
  if (!record) return {};
  return {
    durationSec: asOptionalNumber(record['durationSec']),
    resolution: asOptionalString(record['resolution']),
  };
}

export function parsePawnCategoryPayload(raw: unknown): PawnCategoryPayload {
  const record = parseRecord(raw);
  if (!record) return {};
  return {
    itemCategory: asOptionalString(record['itemCategory']),
  };
}

/** Expected categoryPayload keys per non-vehicle category — used by contract tests. */
export const NON_VEHICLE_PAYLOAD_KEYS = {
  SONGS: ['format', 'genre', 'trackCount'],
  EBOOKS: ['format', 'pageCount', 'language'],
  APPAREL: ['material', 'gender'],
  DIGITAL_ART: ['medium', 'editionSize'],
  VIDEO_DISTRIBUTION: ['durationSec', 'resolution'],
  PAWN: ['itemCategory'],
} as const;
