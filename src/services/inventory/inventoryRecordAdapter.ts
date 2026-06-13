import type { Vehicle, CategoryInventoryItem } from '@prisma/client';

/**
 * The shared inventory shape that readiness, publishing, and lifecycle
 * services operate on. Neither Vehicle nor CategoryInventoryItem is
 * returned directly — callers project through toInventoryRecord().
 *
 * lifecycleStatus is derived from soldAt/removedAt since both tables
 * store lifecycle via nullable timestamps rather than a status column.
 *
 * data for Vehicle is a projection of typed columns; for
 * CategoryInventoryItem it is the raw data JSON field.
 */
export type InventoryRecord = {
  id: string;
  source: 'vehicle' | 'category_item';
  dealershipId: string;
  categoryId: string;
  stockNumber: string | null;
  primaryIdentifier: string | null;
  priceCents: number | null;
  originalPriceCents: number | null;
  priceLastChangedAt: Date | null;
  condition: string | null;
  listingStatus: string;
  lifecycleStatus: 'AVAILABLE' | 'SOLD' | 'REMOVED';
  data: Record<string, unknown>;
  soldAt: Date | null;
  removedAt: Date | null;
  reactivatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

function deriveLifecycle(soldAt: Date | null, removedAt: Date | null): InventoryRecord['lifecycleStatus'] {
  if (soldAt) return 'SOLD';
  if (removedAt) return 'REMOVED';
  return 'AVAILABLE';
}

export function vehicleToInventoryRecord(v: Vehicle): InventoryRecord {
  return {
    id: v.id,
    source: 'vehicle',
    dealershipId: v.dealershipId,
    categoryId: 'AUTOMOTIVE',
    stockNumber: v.stockNumber,
    primaryIdentifier: v.vin,
    priceCents: v.priceCents,
    originalPriceCents: v.originalPriceCents ?? null,
    priceLastChangedAt: v.priceLastChangedAt ?? null,
    condition: v.condition,
    listingStatus: v.listingStatus,
    lifecycleStatus: deriveLifecycle(v.soldAt ?? null, v.removedAt ?? null),
    data: {
      vin: v.vin,
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim ?? null,
      mileage: v.mileage,
      exteriorColor: v.exteriorColor,
      interiorColor: v.interiorColor ?? null,
      bodyStyle: v.bodyStyle ?? null,
      drivetrain: v.drivetrain ?? null,
      fuelType: v.fuelType ?? null,
      transmission: v.transmission ?? null,
      options: v.options,
      starCore: v.starCore,
      ...(v.categoryPayload != null ? { categoryPayload: v.categoryPayload } : {}),
    },
    soldAt: v.soldAt ?? null,
    removedAt: v.removedAt ?? null,
    reactivatedAt: v.reactivatedAt ?? null,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}

export function categoryItemToInventoryRecord(item: CategoryInventoryItem): InventoryRecord {
  return {
    id: item.id,
    source: 'category_item',
    dealershipId: item.dealershipId,
    categoryId: item.categoryId,
    stockNumber: item.stockNumber ?? null,
    primaryIdentifier: item.primaryIdentifier ?? null,
    priceCents: item.priceCents ?? null,
    originalPriceCents: item.originalPriceCents ?? null,
    priceLastChangedAt: item.priceLastChangedAt ?? null,
    condition: item.condition ?? null,
    listingStatus: item.listingStatus,
    lifecycleStatus: deriveLifecycle(item.soldAt ?? null, item.removedAt ?? null),
    data: item.data as Record<string, unknown>,
    soldAt: item.soldAt ?? null,
    removedAt: item.removedAt ?? null,
    reactivatedAt: item.reactivatedAt ?? null,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
