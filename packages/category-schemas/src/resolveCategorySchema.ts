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

/** Physical categories may use native category items (e.g. apparel). */
export function categoryInventorySource(id: import('./types.js').BusinessCategoryId): 'vehicle' | 'category_item' {
  const schema = resolveCategorySchema(id);
  return schema.inventorySource ?? (schema.lifecycleMode === 'physical_inventory' ? 'vehicle' : 'category_item');
}
