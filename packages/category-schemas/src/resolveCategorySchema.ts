import type { BusinessCategoryId, CategorySchema } from './types.js';
import { BUSINESS_CATEGORY_IDS } from './types.js';
import { CATEGORY_REGISTRY, isRegisteredCategory } from './registry.js';
import { createUnknownFallbackSchema } from './generic/schema.js';

export function resolveCategorySchema(category: BusinessCategoryId | string): CategorySchema {
  if (isRegisteredCategory(category)) {
    return CATEGORY_REGISTRY[category];
  }
  return createUnknownFallbackSchema(category);
}

export function resolveCategorySchemaStrict(category: BusinessCategoryId): CategorySchema {
  return CATEGORY_REGISTRY[category];
}

export { BUSINESS_CATEGORY_IDS };
