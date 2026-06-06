import type { PrismaClient } from '@prisma/client';
import type { VehicleUpdateKind } from '../../lib/types.js';
import {
  resolveVehicleLifecycleState,
  type VehicleLifecycleState,
} from './vehicleLifecycle.js';

export type LifecycleEventSource = 'manual' | 'ingress_row' | 'feed_snapshot';

export type SnapshotRemovedCandidate = {
  stockNumber: string;
  vehicleId: string;
  reason: 'missing_from_feed';
  label: string;
};

export type RecordLifecycleEventInput = {
  vehicleId: string;
  dealershipId: string;
  fromState: VehicleLifecycleState;
  toState: VehicleLifecycleState;
  triggerKind: 'SOLD' | 'REMOVED' | 'RELISTED';
  source: LifecycleEventSource;
  ingressRunId?: string;
  statusChangedAt: Date;
  note?: string;
};

export function targetStateForUpdateKind(kind: 'SOLD' | 'REMOVED' | 'RELISTED'): VehicleLifecycleState {
  if (kind === 'RELISTED') return 'REACTIVATED';
  return kind;
}

export function lifecycleNoteForSource(source: LifecycleEventSource): string | undefined {
  if (source === 'feed_snapshot') return 'Missing from latest feed';
  return undefined;
}

export async function recordLifecycleEvent(
  prisma: PrismaClient,
  input: RecordLifecycleEventInput,
): Promise<string> {
  const row = await prisma.vehicleLifecycleEvent.create({
    data: {
      vehicleId: input.vehicleId,
      dealershipId: input.dealershipId,
      fromState: input.fromState,
      toState: input.toState,
      triggerKind: input.triggerKind,
      source: input.source,
      ingressRunId: input.ingressRunId ?? null,
      statusChangedAt: input.statusChangedAt,
      note: input.note ?? null,
    },
  });
  return row.id;
}

export async function recordLifecycleEventForUpdate(
  prisma: PrismaClient,
  vehicleId: string,
  dealershipId: string,
  kind: VehicleUpdateKind,
  fields: { soldAt: Date | null; removedAt: Date | null; reactivatedAt?: Date | null },
  opts: {
    source?: LifecycleEventSource;
    ingressRunId?: string;
    statusChangedAt: Date;
    note?: string;
  },
): Promise<string | null> {
  if (kind !== 'SOLD' && kind !== 'REMOVED' && kind !== 'RELISTED') return null;

  const fromState = resolveVehicleLifecycleState(fields);
  const toState = targetStateForUpdateKind(kind);
  if (fromState === toState) return null;

  return recordLifecycleEvent(prisma, {
    vehicleId,
    dealershipId,
    fromState,
    toState,
    triggerKind: kind,
    source: opts.source ?? 'manual',
    ingressRunId: opts.ingressRunId,
    statusChangedAt: opts.statusChangedAt,
    note: opts.note ?? lifecycleNoteForSource(opts.source ?? 'manual'),
  });
}

export type LifecycleEventView = {
  id: string;
  vehicleId: string;
  stockNumber: string;
  fromState: VehicleLifecycleState;
  toState: VehicleLifecycleState;
  triggerKind: string;
  source: LifecycleEventSource;
  ingressRunId: string | null;
  statusChangedAt: string;
  note: string | null;
  createdAt: string;
};

export async function listLifecycleEvents(
  prisma: PrismaClient,
  dealershipId: string,
  opts: { limit?: number; stockNumber?: string } = {},
): Promise<LifecycleEventView[]> {
  const limit = Math.min(opts.limit ?? 50, 200);
  const rows = await prisma.vehicleLifecycleEvent.findMany({
    where: {
      dealershipId,
      ...(opts.stockNumber
        ? { vehicle: { stockNumber: opts.stockNumber } }
        : {}),
    },
    include: { vehicle: { select: { stockNumber: true } } },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });

  return rows.map(row => ({
    id: row.id,
    vehicleId: row.vehicleId,
    stockNumber: row.vehicle.stockNumber,
    fromState: row.fromState as VehicleLifecycleState,
    toState: row.toState as VehicleLifecycleState,
    triggerKind: row.triggerKind,
    source: row.source as LifecycleEventSource,
    ingressRunId: row.ingressRunId,
    statusChangedAt: row.statusChangedAt.toISOString(),
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function readSnapshotCandidatesFromIngress(
  prisma: PrismaClient,
  dealershipId: string,
  ingressRunId: string,
): Promise<SnapshotRemovedCandidate[]> {
  const run = await prisma.ingressRun.findFirst({
    where: { id: ingressRunId, dealershipId },
    select: { summaryJson: true },
  });
  if (!run?.summaryJson || typeof run.summaryJson !== 'object') return [];

  const summary = run.summaryJson as Record<string, unknown>;
  const raw = summary.snapshotRemovedCandidates;
  if (!Array.isArray(raw)) return [];

  return raw.filter(
    (item): item is SnapshotRemovedCandidate =>
      item != null &&
      typeof item === 'object' &&
      typeof (item as SnapshotRemovedCandidate).stockNumber === 'string' &&
      typeof (item as SnapshotRemovedCandidate).vehicleId === 'string' &&
      (item as SnapshotRemovedCandidate).reason === 'missing_from_feed',
  );
}
