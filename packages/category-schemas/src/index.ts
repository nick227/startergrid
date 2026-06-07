export type {
  BusinessCategoryId,
  CategoryAssetLabels,
  CategoryChannelLabels,
  CategoryCopyBundle,
  CategoryFieldDef,
  CategoryFormatters,
  CategoryLifecycleLabels,
  CategoryPerformanceLabels,
  CategoryReadinessLabels,
  CategorySchema,
  CategoryStatus,
} from './types.js';

export { BUSINESS_CATEGORY_IDS } from './types.js';
export { CATEGORY_REGISTRY, isRegisteredCategory, listCategorySchemas } from './registry.js';
export {
  resolveCategorySchema,
  resolveCategorySchemaStrict,
} from './resolveCategorySchema.js';
export { automotiveSchema } from './automotive/schema.js';
export { createPlaceholderSchema, createUnknownFallbackSchema } from './generic/schema.js';
