import type { PrismaClient } from '@prisma/client';
import { applyVehicleUpdate } from './inventoryUpdateService.js';
import {
  resolveVehicleLifecycleState,
  shouldApplyLifecycleTransition,
  type VehicleLifecycleState,
} from './vehicleLifecycle.js';

export type IngestAvailability = 'available' | 'sold' | 'removed';

export type SalesStatusIngestRow = {
  stockNumber: string;
  availability?: IngestAvailability;
  statusChangedAt?: Date;
};

export type SalesStatusReconcileResult = {
  sold: number;
  removed: number;
  reactivated: number;
  skipped: number;
};

function targetStateForAvailability(availability: IngestAvailability): VehicleLifecycleState {
  if (availability === 'sold') return 'SOLD';
  if (availability === 'removed') return 'REMOVED';
  return 'REACTIVATED';
}

export async function reconcileSalesStatusFromIngest(
  prisma: PrismaClient,
  dealershipId: string,
  rows: SalesStatusIngestRow[],
  opts: { snapshotMode?: boolean } = {},
): Promise<SalesStatusReconcileResult> {
  const result: SalesStatusReconcileResult = { sold: 0, removed: 0, reactivated: 0, skipped: 0 };
  const feedStocks = new Set(rows.map(r => r.stockNumber));

  for (const row of rows) {
    if (!row.availability) continue;

    const vehicle = await prisma.vehicle.findUnique({
      where: { dealershipId_stockNumber: { dealershipId, stockNumber: row.stockNumber } },
      select: { soldAt: true, removedAt: true, reactivatedAt: true },
    });
    if (!vehicle) continue;

    if (vehicle.soldAt && row.availability === 'removed') {
      result.skipped++;
      continue;
    }

    const target = targetStateForAvailability(row.availability);
    if (!shouldApplyLifecycleTransition(vehicle, target)) {
      result.skipped++;
      continue;
    }

    const kind = row.availability === 'available' ? 'RELISTED' : row.availability === 'sold' ? 'SOLD' : 'REMOVED';
    try {
      await applyVehicleUpdate(prisma, dealershipId, row.stockNumber, kind, {
        statusChangedAt: row.statusChangedAt,
      });
    } catch {
      result.skipped++;
      continue;
    }

    if (kind === 'SOLD') result.sold++;
    else if (kind === 'REMOVED') result.removed++;
    else result.reactivated++;
  }

  if (opts.snapshotMode) {
    const activeInDb = await prisma.vehicle.findMany({
      where: { dealershipId, soldAt: null, removedAt: null },
      select: { stockNumber: true },
    });

    for (const vehicle of activeInDb) {
      if (feedStocks.has(vehicle.stockNumber)) continue;
      await applyVehicleUpdate(prisma, dealershipId, vehicle.stockNumber, 'REMOVED');
      result.removed++;
    }
  }

  return result;
}

export function summarizeLifecycleState(fields: {
  soldAt: Date | null;
  removedAt: Date | null;
  reactivatedAt?: Date | null;
}): VehicleLifecycleState {
  return resolveVehicleLifecycleState(fields);
}
