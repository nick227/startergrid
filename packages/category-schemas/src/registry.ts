import type { BusinessCategoryId, CategorySchema } from './types.js';
import { automotiveSchema } from './automotive/schema.js';
import { schema as songsSchema } from './songs/schema.js';
import { schema as ebooksSchema } from './ebooks/schema.js';
import { schema as watchesSchema } from './watches/schema.js';
import { schema as sneakersSchema } from './sneakers/schema.js';
import { schema as collectiblesSchema } from './collectibles/schema.js';
import { schema as apparelSchema } from './apparel/schema.js';
import { schema as vacationRentalsSchema } from './vacation_rentals/schema.js';
import { schema as apartmentsSchema } from './apartments/schema.js';
import { schema as homesSchema } from './homes/schema.js';
import { schema as commercialPropertySchema } from './commercial_property/schema.js';
import { schema as boatsSchema } from './boats/schema.js';
import { schema as trailersPowersportsRvSchema } from './trailers_powersports_rv/schema.js';
import { schema as pawnSchema } from './pawn/schema.js';
import { schema as digitalArtSchema } from './digital_art/schema.js';
import { schema as heavyEquipmentSchema } from './heavy_equipment/schema.js';
import { schema as furnitureSchema } from './furniture/schema.js';
import { schema as videoDistributionSchema } from './video_distribution/schema.js';

export const CATEGORY_REGISTRY: Record<BusinessCategoryId, CategorySchema> = {
  AUTOMOTIVE: automotiveSchema,
  SONGS: songsSchema,
  EBOOKS: ebooksSchema,
  WATCHES: watchesSchema,
  SNEAKERS: sneakersSchema,
  COLLECTIBLES: collectiblesSchema,
  APPAREL: apparelSchema,
  VACATION_RENTALS: vacationRentalsSchema,
  APARTMENTS: apartmentsSchema,
  HOMES: homesSchema,
  COMMERCIAL_PROPERTY: commercialPropertySchema,
  BOATS: boatsSchema,
  TRAILERS_POWERSPORTS_RV: trailersPowersportsRvSchema,
  PAWN: pawnSchema,
  DIGITAL_ART: digitalArtSchema,
  HEAVY_EQUIPMENT: heavyEquipmentSchema,
  FURNITURE: furnitureSchema,
  VIDEO_DISTRIBUTION: videoDistributionSchema,
};

export function isRegisteredCategory(value: string): value is BusinessCategoryId {
  return Object.prototype.hasOwnProperty.call(CATEGORY_REGISTRY, value);
}

export function listCategorySchemas(): CategorySchema[] {
  return Object.values(CATEGORY_REGISTRY);
}
