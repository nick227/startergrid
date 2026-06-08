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

export type WatchesCategoryPayload = {
  movement?: string;
  caseMaterial?: string;
  caseSizeMm?: number;
};

export type SneakersCategoryPayload = {
  size?: string;
  colorway?: string;
};

export type CollectiblesCategoryPayload = {
  grade?: string;
  category?: string;
};

export type FurnitureCategoryPayload = {
  material?: string;
  dimensions?: string;
};

export type VacationRentalsCategoryPayload = {
  bedrooms?: number;
  sleeps?: number;
  nightlyRateCents?: number;
};

export type ApartmentsCategoryPayload = {
  beds?: number;
  baths?: number;
  sqft?: number;
};

export type HomesCategoryPayload = {
  beds?: number;
  baths?: number;
  sqft?: number;
  lotAcres?: number;
};

export type CommercialPropertyCategoryPayload = {
  propertyType?: string;
  sqft?: number;
  capRate?: number;
};

export type HeavyEquipmentCategoryPayload = {
  usageUnit?: string;
  equipmentType?: string;
};

export type NonVehicleCategoryPayload =
  | SongsCategoryPayload
  | EbooksCategoryPayload
  | ApparelCategoryPayload
  | DigitalArtCategoryPayload
  | VideoCategoryPayload
  | PawnCategoryPayload
  | WatchesCategoryPayload
  | SneakersCategoryPayload
  | CollectiblesCategoryPayload
  | FurnitureCategoryPayload
  | VacationRentalsCategoryPayload
  | ApartmentsCategoryPayload
  | HomesCategoryPayload
  | CommercialPropertyCategoryPayload
  | HeavyEquipmentCategoryPayload;

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

export function parseWatchesCategoryPayload(raw: unknown): WatchesCategoryPayload {
  const record = parseRecord(raw);
  if (!record) return {};
  return {
    movement: asOptionalString(record['movement']),
    caseMaterial: asOptionalString(record['caseMaterial']),
    caseSizeMm: asOptionalNumber(record['caseSizeMm']),
  };
}

export function parseSneakersCategoryPayload(raw: unknown): SneakersCategoryPayload {
  const record = parseRecord(raw);
  if (!record) return {};
  return {
    size: asOptionalString(record['size']),
    colorway: asOptionalString(record['colorway']),
  };
}

export function parseCollectiblesCategoryPayload(raw: unknown): CollectiblesCategoryPayload {
  const record = parseRecord(raw);
  if (!record) return {};
  return {
    grade: asOptionalString(record['grade']),
    category: asOptionalString(record['category']),
  };
}

export function parseFurnitureCategoryPayload(raw: unknown): FurnitureCategoryPayload {
  const record = parseRecord(raw);
  if (!record) return {};
  return {
    material: asOptionalString(record['material']),
    dimensions: asOptionalString(record['dimensions']),
  };
}

export function parseVacationRentalsCategoryPayload(raw: unknown): VacationRentalsCategoryPayload {
  const record = parseRecord(raw);
  if (!record) return {};
  return {
    bedrooms: asOptionalNumber(record['bedrooms']),
    sleeps: asOptionalNumber(record['sleeps']),
    nightlyRateCents: asOptionalNumber(record['nightlyRateCents']),
  };
}

export function parseApartmentsCategoryPayload(raw: unknown): ApartmentsCategoryPayload {
  const record = parseRecord(raw);
  if (!record) return {};
  return {
    beds: asOptionalNumber(record['beds']),
    baths: asOptionalNumber(record['baths']),
    sqft: asOptionalNumber(record['sqft']),
  };
}

export function parseHomesCategoryPayload(raw: unknown): HomesCategoryPayload {
  const record = parseRecord(raw);
  if (!record) return {};
  return {
    beds: asOptionalNumber(record['beds']),
    baths: asOptionalNumber(record['baths']),
    sqft: asOptionalNumber(record['sqft']),
    lotAcres: asOptionalNumber(record['lotAcres']),
  };
}

export function parseCommercialPropertyCategoryPayload(raw: unknown): CommercialPropertyCategoryPayload {
  const record = parseRecord(raw);
  if (!record) return {};
  return {
    propertyType: asOptionalString(record['propertyType']),
    sqft: asOptionalNumber(record['sqft']),
    capRate: asOptionalNumber(record['capRate']),
  };
}

export function parseHeavyEquipmentCategoryPayload(raw: unknown): HeavyEquipmentCategoryPayload {
  const record = parseRecord(raw);
  if (!record) return {};
  return {
    usageUnit: asOptionalString(record['usageUnit']),
    equipmentType: asOptionalString(record['equipmentType']),
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
  WATCHES: ['movement', 'caseMaterial', 'caseSizeMm'],
  SNEAKERS: ['size', 'colorway'],
  COLLECTIBLES: ['grade', 'category'],
  FURNITURE: ['material', 'dimensions'],
  VACATION_RENTALS: ['bedrooms', 'sleeps', 'nightlyRateCents'],
  APARTMENTS: ['beds', 'baths', 'sqft'],
  HOMES: ['beds', 'baths', 'sqft', 'lotAcres'],
  COMMERCIAL_PROPERTY: ['propertyType', 'sqft', 'capRate'],
  HEAVY_EQUIPMENT: ['usageUnit', 'equipmentType'],
} as const;
