import type { Prisma, PrismaClient } from '@prisma/client';
import { classifyVehicleReadiness } from './importService.js';
import { resolveVehicleLifecycleState, type VehicleLifecycleState } from './vehicleLifecycle.js';

export type LifecycleScope = 'active' | 'sold' | 'removed' | 'all';

export function lifecycleScopeWhere(scope: LifecycleScope): Prisma.VehicleWhereInput {
  switch (scope) {
    case 'active':
      return { soldAt: null, removedAt: null };
    case 'sold':
      return { soldAt: { not: null } };
    case 'removed':
      return { soldAt: null, removedAt: { not: null } };
    case 'all':
      return {};
  }
}

export type InventoryListItem = {
  id: string;
  stockNumber: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim: string | null;
  mileage: number;
  priceCents: number;
  condition: string;
  exteriorColor: string;
  mediaCount: number;
  thumbnailUrl: string | null;
  readiness: 'READY' | 'BLOCKED' | 'WARNING';
  issues: Array<{ path: string; message: string; severity: 'FAIL' | 'WARN' }>;
  listingStatus: string;
  lifecycleState: VehicleLifecycleState;
  soldAt: string | null;
  removedAt: string | null;
  reactivatedAt: string | null;
  updatedAt: string;
};

export type InventoryListResult = {
  vehicles: InventoryListItem[];
  summary: {
    total: number;
    ready: number;
    warning: number;
    blocked: number;
    lifecycle: { active: number; sold: number; removed: number };
  };
  lifecycleScope: LifecycleScope;
};

type ThumbnailMedia = {
  url: string;
  kind: string;
  sortOrder: number;
  mediaSlotKey: string | null;
};

const THUMBNAIL_SLOT_PRIORITY = [
  'main-photo',
  'front',
  'front-quarter-driver',
  'front-quarter-passenger',
];

function selectThumbnailUrl(media: ThumbnailMedia[]): string | null {
  if (media.length === 0) return null;
  const sorted = [...media].sort((a, b) => a.sortOrder - b.sortOrder);
  const images = sorted.filter(m => m.url && m.kind.toUpperCase() === 'IMAGE');

  for (const slotKey of THUMBNAIL_SLOT_PRIORITY) {
    const matches = images.filter(m => m.mediaSlotKey === slotKey);
    const latest = matches[matches.length - 1];
    if (latest) return latest.url;
  }

  return images[0]?.url ?? sorted.find(m => m.url)?.url ?? null;
}

export async function listInventoryVehicles(
  prisma: PrismaClient,
  dealershipId: string,
  scope: LifecycleScope = 'active',
): Promise<InventoryListResult> {
  const vehicles = await prisma.vehicle.findMany({
    where: { dealershipId, ...lifecycleScopeWhere(scope) },
    select: {
      id: true, stockNumber: true, vin: true, year: true,
      make: true, model: true, trim: true, mileage: true,
      priceCents: true, condition: true, exteriorColor: true,
      bodyStyle: true, listingStatus: true,
      soldAt: true, removedAt: true, reactivatedAt: true,
      updatedAt: true,
      media: {
        select: { url: true, kind: true, sortOrder: true, mediaSlotKey: true },
        orderBy: { sortOrder: 'asc' },
      },
      _count: { select: { media: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });

  const [activeCount, soldCount, removedCount] = await Promise.all([
    prisma.vehicle.count({ where: { dealershipId, soldAt: null, removedAt: null } }),
    prisma.vehicle.count({ where: { dealershipId, soldAt: { not: null } } }),
    prisma.vehicle.count({ where: { dealershipId, soldAt: null, removedAt: { not: null } } }),
  ]);

  const items: InventoryListItem[] = vehicles.map(v => {
    const { readiness, issues } = classifyVehicleReadiness({ ...v, mediaCount: v._count.media });
    return {
      id: v.id,
      stockNumber: v.stockNumber,
      vin: v.vin,
      year: v.year,
      make: v.make,
      model: v.model,
      trim: v.trim,
      mileage: v.mileage,
      priceCents: v.priceCents,
      condition: v.condition,
      exteriorColor: v.exteriorColor,
      mediaCount: v._count.media,
      thumbnailUrl: selectThumbnailUrl(v.media),
      readiness,
      issues,
      listingStatus: v.listingStatus,
      lifecycleState: resolveVehicleLifecycleState(v),
      soldAt: v.soldAt?.toISOString() ?? null,
      removedAt: v.removedAt?.toISOString() ?? null,
      reactivatedAt: v.reactivatedAt?.toISOString() ?? null,
      updatedAt: v.updatedAt.toISOString(),
    };
  });

  return {
    vehicles: items,
    summary: {
      total: items.length,
      ready: items.filter(v => v.readiness === 'READY').length,
      warning: items.filter(v => v.readiness === 'WARNING').length,
      blocked: items.filter(v => v.readiness === 'BLOCKED').length,
      lifecycle: { active: activeCount, sold: soldCount, removed: removedCount },
    },
    lifecycleScope: scope,
  };
}
