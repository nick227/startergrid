/** Mirrors Prisma BusinessCategory enum — keep in sync with prisma/schema.prisma */
export const BUSINESS_CATEGORY_IDS = [
  'AUTOMOTIVE',
  'SONGS',
  'EBOOKS',
  'WATCHES',
  'SNEAKERS',
  'COLLECTIBLES',
  'APPAREL',
  'VACATION_RENTALS',
  'APARTMENTS',
  'HOMES',
  'COMMERCIAL_PROPERTY',
  'BOATS',
  'TRAILERS_POWERSPORTS_RV',
  'PAWN',
  'DIGITAL_ART',
  'HEAVY_EQUIPMENT',
  'FURNITURE',
  'VIDEO_DISTRIBUTION',
] as const;

export type BusinessCategoryId = (typeof BUSINESS_CATEGORY_IDS)[number];

export type CategoryStatus = 'active' | 'placeholder';

export type CategoryLifecycleMode = 'physical_inventory' | 'digital_distribution';

export type MarketplaceFilterRole =
  | 'brand'
  | 'model'
  | 'usage'
  | 'year'
  | 'condition'
  | 'seller'
  | 'price';

export type CategoryFieldDef = {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'currency' | 'identifier';
  /** Maps this inventory field to a generic marketplace filter or card label slot. */
  marketplaceFilter?: MarketplaceFilterRole;
};

export type CategoryCopyBundle = {
  inventoryTitle: string;
  inventorySubtitle: string;
  searchPlaceholder: string;
  refColumn: string;
  titleColumn: string;
  invalidIdentifierLabel: string;
};

export type CategoryAssetLabels = {
  singular: string;
  plural: string;
  refLabel: string;
  idLabel: string;
  titleLabel: string;
  /** Backend field path used for identifier-failure issue matching (e.g. 'vin'). Empty string = no identifier filter. */
  idFieldKey: string;
};

export type CategoryChannelLabels = {
  singular: string;
  plural: string;
};

export type CategoryLifecycleLabels = {
  active: string;
  sold: string;
  removed: string;
};

export type CategoryReadinessLabels = {
  ready: string;
  warning: string;
  blocked: string;
};

export type CategoryPerformanceLabels = {
  movementLabel: string;
  benchmarksLabel: string;
};

export type CategoryFormatters = {
  assetLead: (record: Record<string, unknown>) => string;
  assetMeta: (record: Record<string, unknown>) => string;
};

export type CategoryMarketplaceMeta = {
  slug: string;
  consumerEnabled: boolean;
  tagline: string;
};

export type CategorySchema = {
  id: BusinessCategoryId;
  status: CategoryStatus;
  label: string;
  lifecycleMode: CategoryLifecycleMode;
  copy: CategoryCopyBundle;
  asset: CategoryAssetLabels;
  channel: CategoryChannelLabels;
  fields: CategoryFieldDef[];
  lifecycle: CategoryLifecycleLabels;
  readiness: CategoryReadinessLabels;
  performance: CategoryPerformanceLabels;
  formatters: CategoryFormatters;
  marketplace: CategoryMarketplaceMeta;
};
