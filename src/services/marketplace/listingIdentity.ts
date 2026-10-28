import type { Prisma, PrismaClient, CategoryInventoryItem } from '@prisma/client';
import { categoryInventorySource, isRegisteredCategory, listCategorySchemas, PHYSICAL_RECORD_FORMATS, resolveCategorySchema, type BusinessCategoryId } from '../../../packages/category-schemas/src/index.js';
import { publicationContract } from '../inventory/publicationContract.js';
import { buildInventoryReadiness } from '../inventory/inventoryReadinessService.js';

export type ListingIdentity = {
  source: 'vehicle' | 'category_item';
  inventoryId: string;
  dealershipId: string;
  categoryId: string;
  publicationId: string | null;
};
export const CONSUMER_PLATFORM = 'consumer-marketplace';
export const enabledCategories = () => listCategorySchemas().filter(c => c.marketplace.consumerEnabled).map(c => c.id);
/** Consumer sites plus physical records and apparel. Digital SONGS distribution stays disabled. */
export const categoryItemCatalogCategories = (): BusinessCategoryId[] => [...new Set<BusinessCategoryId>([...enabledCategories(), 'SONGS', 'APPAREL'])];
export const vehiclePublicationGate: Prisma.VehicleWhereInput = {
  listingStatus: 'READY',
  marketplaceListings: { some: { platformSlug: CONSUMER_PLATFORM, status: 'ACTIVE' } },
  channelSelections: { none: { channelKey: CONSUMER_PLATFORM, selected: false } },
};
export const categoryPublicationGate: Prisma.CategoryInventoryItemWhereInput = {
  listingStatus: 'READY', soldAt: null, removedAt: null, priceCents: { gt: 0 },
  marketplaceListings: { some: { platformSlug: CONSUMER_PLATFORM, status: 'ACTIVE' } },
};

export function categoryItemEligible(item: Pick<CategoryInventoryItem, 'categoryId' | 'condition' | 'data' | 'priceCents' | 'stockNumber' | 'primaryIdentifier' | 'listingStatus' | 'soldAt' | 'removedAt'> & {
  dealership: { businessCategory: string }; media: { mediaSlotKey?: string | null }[];
}): boolean {
  if (!isRegisteredCategory(item.categoryId) || item.categoryId !== item.dealership.businessCategory) return false;
  const data = item.data && typeof item.data === 'object' && !Array.isArray(item.data) ? item.data as Record<string, unknown> : {};
  const contract = publicationContract(item.categoryId, item.condition, data);
  if (!contract) return false;
  if (item.listingStatus !== 'READY' || item.soldAt || item.removedAt || (item.priceCents ?? 0) <= 0) return false;
  if (contract.schema.validConditionValues?.length && !contract.schema.validConditionValues.includes(item.condition ?? '')) return false;
  if (contract.kind === 'physical_record') {
    if (!(PHYSICAL_RECORD_FORMATS as readonly string[]).includes(String(data.format ?? ''))) return false;
  } else {
    const category = resolveCategorySchema(item.categoryId);
    for (const field of category.fields) {
      if (field.options?.length && data[field.key] != null && !field.options.some(o => o.value === data[field.key])) return false;
    }
  }
  const fields = { ...data, stockNumber: item.stockNumber, priceCents: item.priceCents, condition: item.condition,
    [contract.schema.primaryIdentifier.fieldKey]: item.primaryIdentifier };
  return buildInventoryReadiness({ category: item.categoryId, schema: contract.schema, fields,
    assignedMediaSlotKeys: item.media.flatMap(m => m.mediaSlotKey ? [m.mediaSlotKey] : []), totalMediaCount: item.media.length }).status !== 'BLOCKED';
}

/** Resolves a typed identity without introducing another inventory store. No ID guessing across tables. */
export async function resolveListingIdentity(prisma: PrismaClient, source: ListingIdentity['source'], inventoryId: string,
  options: { published?: boolean; dealershipId?: string; categoryId?: string } = {}) {
  const publication = { where: { platformSlug: CONSUMER_PLATFORM, status: 'ACTIVE' }, select: { id: true, dealershipId: true }, take: 1 } as const;
  if (source === 'category_item') {
    const item = await prisma.categoryInventoryItem.findFirst({ where: { id: inventoryId,
      ...(options.dealershipId ? { dealershipId: options.dealershipId } : {}),
      ...(options.published ? categoryPublicationGate : {}) },
      include: { dealership: true, media: true, marketplaceListings: publication } });
    if (!item || !categoryItemEligible(item) || (options.categoryId && options.categoryId !== item.categoryId)) return null;
    const published = item.marketplaceListings[0];
    if (options.published && (!published || published.dealershipId !== item.dealershipId)) return null;
    return { identity: { source, inventoryId: item.id, dealershipId: item.dealershipId, categoryId: item.categoryId, publicationId: published?.id ?? null } satisfies ListingIdentity, item };
  }
  const item = await prisma.vehicle.findFirst({ where: { id: inventoryId, soldAt: null, removedAt: null, priceCents: { gt: 0 }, listingStatus: 'READY',
    ...(options.dealershipId ? { dealershipId: options.dealershipId } : {}),
    ...(options.published ? vehiclePublicationGate : {}) },
    include: { dealership: true, media: true, marketplaceListings: publication, channelSelections: { where: { channelKey: CONSUMER_PLATFORM, selected: false } } } });
  if (!item || !enabledCategories().includes(item.dealership.businessCategory) || item.channelSelections.length ||
    (options.categoryId && options.categoryId !== item.dealership.businessCategory)) return null;
  if (categoryInventorySource(item.dealership.businessCategory) !== 'vehicle') return null;
  const published = item.marketplaceListings[0];
  if (options.published && (!published || published.dealershipId !== item.dealershipId)) return null;
  return { identity: { source, inventoryId: item.id, dealershipId: item.dealershipId, categoryId: item.dealership.businessCategory, publicationId: published?.id ?? null } satisfies ListingIdentity, item };
}
