import type { CategoryInventorySchema } from '@auto-dealer/category-schemas';
import {
  categoryInventorySource,
  getCategoryInventorySchema,
  isDigitalSongRelease,
  isPhysicalRecordMerchandise,
  isRegisteredCategory,
  physicalRecordsInventorySchema,
  resolveCategorySchema,
} from '../../../packages/category-schemas/src/index.js';
import { buildInventoryReadiness, type InventoryReadinessResult } from './inventoryReadinessService.js';

export type ItemContractKind = 'category_item' | 'physical_record';

export type ItemPublicationContract = {
  kind: ItemContractKind;
  schema: CategoryInventorySchema;
};

type ItemFacts = {
  categoryId: string;
  condition: string | null;
  data: unknown;
  stockNumber: string | null;
  priceCents: number | null;
  primaryIdentifier: string | null;
  media: { mediaSlotKey?: string | null }[];
};

function recordData(data: unknown): Record<string, unknown> {
  return data && typeof data === 'object' && !Array.isArray(data) ? data as Record<string, unknown> : {};
}

/** Apparel, other consumer category items, physical records, and digital song releases. */
export function publicationContract(
  categoryId: string,
  condition: string | null,
  data: unknown,
): ItemPublicationContract | null {
  const payload = recordData(data);
  if (categoryId === 'SONGS') {
    if (isPhysicalRecordMerchandise(condition, payload)) {
      return { kind: 'physical_record', schema: physicalRecordsInventorySchema };
    }
    if (!isDigitalSongRelease(condition, payload)) return null;
    const schema = getCategoryInventorySchema('SONGS');
    return schema ? { kind: 'category_item', schema } : null;
  }
  if (!isRegisteredCategory(categoryId)) return null;
  const category = resolveCategorySchema(categoryId);
  const schema = getCategoryInventorySchema(categoryId);
  if (!category.marketplace.consumerEnabled || categoryInventorySource(categoryId) !== 'category_item' || !schema) return null;
  return { kind: 'category_item', schema };
}

export function categoryItemReadiness(item: ItemFacts): InventoryReadinessResult {
  const data = recordData(item.data);
  const schema = publicationContract(item.categoryId, item.condition, data)?.schema
    ?? (isRegisteredCategory(item.categoryId) ? getCategoryInventorySchema(item.categoryId) : undefined);
  const fields: Record<string, unknown> = {
    ...data,
    stockNumber: item.stockNumber,
    priceCents: item.priceCents,
    condition: item.condition,
  };
  if (schema) fields[schema.primaryIdentifier.fieldKey] = item.primaryIdentifier ?? item.stockNumber;
  return buildInventoryReadiness({
    category: isRegisteredCategory(item.categoryId) ? item.categoryId : 'APPAREL',
    ...(schema ? { schema } : {}),
    fields,
    assignedMediaSlotKeys: item.media.flatMap(media => media.mediaSlotKey ? [media.mediaSlotKey] : []),
    totalMediaCount: item.media.length,
  });
}

export function listingStatusForReadiness(status: InventoryReadinessResult['status']): 'READY' | 'DRAFT' {
  return status === 'BLOCKED' ? 'DRAFT' : 'READY';
}
