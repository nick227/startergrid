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
  readiness: 'READY' | 'BLOCKED' | 'WARNING';
  issues: Array<{ path: string; message: string; severity: 'FAIL' | 'WARN' }>;
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
      bodyStyle: true,
      soldAt: true, removedAt: true, reactivatedAt: true,
      updatedAt: true,
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
      readiness,
      issues,
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
