import type { BusinessCategoryId } from '../../packages/category-schemas/src/types.js';

/** Non-automotive categories with platform stubs and readiness fixtures. */
export const NON_VEHICLE_PLATFORM_CATEGORIES = [
  'SONGS',
  'EBOOKS',
  'APPAREL',
  'DIGITAL_ART',
  'VIDEO_DISTRIBUTION',
  'PAWN',
  'WATCHES',
  'SNEAKERS',
  'COLLECTIBLES',
  'FURNITURE',
  'VACATION_RENTALS',
] as const satisfies readonly BusinessCategoryId[];

export type NonVehiclePlatformCategory = (typeof NON_VEHICLE_PLATFORM_CATEGORIES)[number];

export type NonVehicleStubInput = {
  slug: string;
  name: string;
  category: NonVehiclePlatformCategory;
  outputFormat: string;
  partnerPortalUrl: string;
  developerDocsUrl: string;
  notes: string;
  requiredVehicleFields: string[];
  sourceUrls?: string[];
  integrationClass?: 'ASSISTED' | 'FEEDABLE';
};
