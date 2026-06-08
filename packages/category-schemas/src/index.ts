export type {
  BusinessCategoryId,
  CategoryAssetLabels,
  CategoryChannelLabels,
  CategoryCopyBundle,
  CategoryFieldDef,
  MarketplaceFilterRole,
  CategoryFormatters,
  CategoryLifecycleLabels,
  CategoryMarketplaceMeta,
  CategoryPerformanceLabels,
  CategoryReadinessLabels,
  CategorySchema,
  CategoryStatus,
  FulfillmentMode,
  FulfillmentPolicy,
} from './types.js';

export { BUSINESS_CATEGORY_IDS } from './types.js';
export { CATEGORY_REGISTRY, isRegisteredCategory, listCategorySchemas } from './registry.js';
export {
  resolveCategorySchema,
  resolveCategorySchemaStrict,
} from './resolveCategorySchema.js';
export {
  buildMarketplaceMeta,
  categoryIdToSlug,
  categorySlugToId,
  listMarketplaceCategories,
} from './marketplace/helpers.js';
export { automotiveSchema } from './automotive/schema.js';
export { createPlaceholderSchema, createUnknownFallbackSchema, genericOperatorFallback } from './generic/schema.js';
export {
  getFulfillmentPolicy,
  getFulfillmentSummary,
} from './fulfillment/helpers.js';
export type { FulfillmentSummary } from './fulfillment/helpers.js';
