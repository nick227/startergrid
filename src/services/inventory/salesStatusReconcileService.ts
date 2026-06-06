import type { PrismaClient } from '@prisma/client';
import { applyVehicleUpdate } from './inventoryUpdateService.js';
import {
  readSnapshotCandidatesFromIngress,
  type SnapshotRemovedCandidate,
} from './lifecycleEventService.js';
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

export type SalesStatusReconcileOpts = {
  snapshotMode?: boolean;
  dryRun?: boolean;
  commitSnapshotRemovals?: boolean;
  ingressRunId?: string;
};

export type SalesStatusReconcileResult = {
  sold: number;
  removed: number;
  reactivated: number;
  skipped: number;
  snapshotRemovedCandidates: SnapshotRemovedCandidate[];
  snapshotRemovalsApplied: number;
  snapshotDryRun: boolean;
};

function targetStateForAvailability(availability: IngestAvailability): VehicleLifecycleState {
  if (availability === 'sold') return 'SOLD';
  if (availability === 'removed') return 'REMOVED';
  return 'REACTIVATED';
}

export async function detectSnapshotRemovedCandidates(
  prisma: PrismaClient,
  dealershipId: string,
  feedStocks: Set<string>,
): Promise<SnapshotRemovedCandidate[]> {
  const activeInDb = await prisma.vehicle.findMany({
    where: { dealershipId, soldAt: null, removedAt: null },
    select: { id: true, stockNumber: true },
  });

  return activeInDb
    .filter(vehicle => !feedStocks.has(vehicle.stockNumber))
    .map(vehicle => ({
      stockNumber: vehicle.stockNumber,
      vehicleId: vehicle.id,
      reason: 'missing_from_feed' as const,
      label: 'Missing from latest feed',
    }));
}

async function applyRowAvailability(
  prisma: PrismaClient,
  dealershipId: string,
  rows: SalesStatusIngestRow[],
  ingressRunId?: string,
): Promise<Pick<SalesStatusReconcileResult, 'sold' | 'removed' | 'reactivated' | 'skipped'>> {
  const result = { sold: 0, removed: 0, reactivated: 0, skipped: 0 };

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
        source: 'ingress_row',
        ingressRunId,
      });
    } catch {
      result.skipped++;
      continue;
    }

    if (kind === 'SOLD') result.sold++;
    else if (kind === 'REMOVED') result.removed++;
    else result.reactivated++;
  }

  return result;
}

export async function reconcileSalesStatusFromIngest(
  prisma: PrismaClient,
  dealershipId: string,
  rows: SalesStatusIngestRow[],
  opts: SalesStatusReconcileOpts = {},
): Promise<SalesStatusReconcileResult> {
  const snapshotMode = opts.snapshotMode === true;
  const snapshotDryRun = snapshotMode && opts.dryRun !== false;
  const canApplySnapshot =
    snapshotMode &&
    opts.dryRun === false &&
    opts.commitSnapshotRemovals === true;

  const feedStocks = new Set(rows.map(r => r.stockNumber));
  const rowResult = await applyRowAvailability(
    prisma,
    dealershipId,
    rows.filter(r => r.availability),
    opts.ingressRunId,
  );

  const result: SalesStatusReconcileResult = {
    ...rowResult,
    snapshotRemovedCandidates: [],
    snapshotRemovalsApplied: 0,
    snapshotDryRun,
  };

  if (!snapshotMode) return result;

  const candidates = await detectSnapshotRemovedCandidates(prisma, dealershipId, feedStocks);
  result.snapshotRemovedCandidates = candidates;

  if (!canApplySnapshot || candidates.length === 0) return result;

  for (const candidate of candidates) {
    try {
      await applyVehicleUpdate(prisma, dealershipId, candidate.stockNumber, 'REMOVED', {
        source: 'feed_snapshot',
        ingressRunId: opts.ingressRunId,
        lifecycleNote: candidate.label,
      });
      result.snapshotRemovalsApplied++;
      result.removed++;
    } catch {
      result.skipped++;
    }
  }

  return result;
}

export type SnapshotCommitResult = {
  applied: number;
  skipped: number;
  rejected: string[];
};

export async function commitSnapshotRemovals(
  prisma: PrismaClient,
  dealershipId: string,
  ingressRunId: string,
  stockNumbers: string[],
  opts: { statusChangedAt?: Date } = {},
): Promise<SnapshotCommitResult> {
  const allowed = await readSnapshotCandidatesFromIngress(prisma, dealershipId, ingressRunId);
  const allowedByStock = new Map(allowed.map(c => [c.stockNumber, c]));
  const uniqueStocks = [...new Set(stockNumbers)];

  const result: SnapshotCommitResult = { applied: 0, skipped: 0, rejected: [] };

  for (const stockNumber of uniqueStocks) {
    const candidate = allowedByStock.get(stockNumber);
    if (!candidate) {
      result.rejected.push(stockNumber);
      continue;
    }

    const vehicle = await prisma.vehicle.findUnique({
      where: { dealershipId_stockNumber: { dealershipId, stockNumber } },
      select: { soldAt: true, removedAt: true },
    });
    if (!vehicle || vehicle.soldAt || vehicle.removedAt) {
      result.skipped++;
      continue;
    }

    try {
      await applyVehicleUpdate(prisma, dealershipId, stockNumber, 'REMOVED', {
        statusChangedAt: opts.statusChangedAt,
        source: 'feed_snapshot',
        ingressRunId,
        lifecycleNote: 'Missing from latest feed',
      });
      result.applied++;
    } catch {
      result.skipped++;
    }
  }

  if (result.applied > 0) {
    const { scheduleAutoReconcile } = await import('../publishing/autoReconcileService.js');
    scheduleAutoReconcile(dealershipId, { full: false, immediate: true });
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
