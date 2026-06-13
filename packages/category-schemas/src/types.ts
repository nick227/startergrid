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

export type CategoryFieldOption = {
  value: string;
  label: string;
};

export type CategoryFieldFilterStorage =
  | { storage: 'column' }
  | { storage: 'categoryPayload'; payloadKey: string };

export type CategoryFieldDef = {
  key: string;
  label: string;
  kind: 'text' | 'number' | 'currency' | 'identifier' | 'enum' | 'boolean';
  /** Maps this inventory field to a generic marketplace filter or card label slot. */
  marketplaceFilter?: MarketplaceFilterRole;
  /** Known values for enum facets and boolean filters. Required for enum kind. */
  options?: readonly CategoryFieldOption[];
  /** Where the marketplace applies an exact-match facet filter. Defaults to column key. */
  filterStorage?: CategoryFieldFilterStorage;
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

export type FulfillmentMode =
  | 'digital'
  | 'pickup'
  | 'local_delivery'
  | 'seller_delivery'
  | 'platform_delivery'
  | 'third_party_shipping'
  | 'not_offered'
  | 'contact_seller';

export type FulfillmentPolicy = {
  allowedModes: FulfillmentMode[];
  defaultMode: FulfillmentMode;
  methodLabel?: string;
  timingLabel?: string;
  costLabel?: string;
  buyerMessage?: string;
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
  fulfillmentPolicy?: FulfillmentPolicy;
};

// ─── Inventory schema contract ────────────────────────────────────────────────

export type RequiredLevel = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL';
export type MediaRole = 'STRUCTURED_SHOT' | 'GALLERY_IMAGE';
export type InventoryReadinessSeverity = 'BLOCKER' | 'WARNING';

export type MediaSlot = {
  key: string;
  label: string;
  group: string;
  requiredLevel: RequiredLevel;
  sortOrder: number;
  aliases?: string[];
  helpText?: string;
  /** Placeholder mapping to platform-specific image slot names — not wired to export adapters yet. */
  platformMappings?: Record<string, string>;
};

export type MediaGuide = {
  categoryId: BusinessCategoryId;
  slots: MediaSlot[];
  /** Slot keys that must be filled before any platform publish is allowed. */
  minimumPublishSet: string[];
  /** Slot keys that contribute to quality score / recommended coverage. */
  recommendedSet: string[];
};

export type InventoryImportFieldDef = {
  fieldKey: string;
  label: string;
  kind: 'text' | 'number' | 'currency' | 'identifier' | 'enum' | 'boolean';
  requiredLevel: RequiredLevel;
  /** Higher = show first in import column priority. */
  displayPriority: number;
  /** Normalized lowercase aliases that map to this field in CSV/bulk imports. */
  importAliases: string[];
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    maxLength?: number;
  };
};

export type AttributeGroup = {
  key: string;
  label: string;
  fieldKeys: string[];
};

export type InventoryReadinessRule = {
  fieldKey: string;
  severity: InventoryReadinessSeverity;
  message: string;
};

/**
 * A platform- or distribution-specific identifier for an inventory item.
 * These are stored alongside the item (in data JSON) but are not the
 * primary internal reference. Platform requirement enforcement (e.g. "ISBN
 * required for IngramSpark print distribution") is handled by
 * PlatformRequirementRegistry, not by global readiness rules.
 */
export type ExternalIdentifierDef = {
  fieldKey: string;
  label: string;
  /** Regex pattern for format validation. */
  pattern?: string;
  /** Human-readable note on when this identifier is typically assigned or needed. */
  helpText?: string;
};

export type CategoryInventorySchema = {
  categoryId: BusinessCategoryId;
  /** Semver-style version string to detect schema drift in debug/readiness output. */
  schemaVersion: string;
  /**
   * Valid values for the condition field on this category's inventory items.
   * Single entry → UI auto-fills and hides the field.
   * Multiple entries → UI shows as a select.
   * Omitted → field is hidden and stored as null.
   */
  validConditionValues?: readonly string[];
  /** The universal internal identifier for items in this category (e.g. SKU, VIN). */
  primaryIdentifier: {
    fieldKey: string;
    label: string;
    /** Regex pattern used for format validation (server-side). */
    pattern?: string;
  };
  /**
   * Optional platform- or distribution-specific identifiers beyond the primary.
   * These are stored in data JSON and surfaced by the UI when relevant.
   * Platform requirement enforcement (e.g. ISBN required for IngramSpark)
   * is deferred to PlatformRequirementRegistry.
   */
  externalIdentifiers?: readonly ExternalIdentifierDef[];
  displayFields: {
    /** Ordered field keys shown on the browse row card. */
    browseRow: string[];
    /** Ordered field keys shown in the detail page header. */
    detailHeader: string[];
  };
  importFields: InventoryImportFieldDef[];
  attributeGroups: AttributeGroup[];
  readinessRules: InventoryReadinessRule[];
  mediaGuide?: MediaGuide;
};
