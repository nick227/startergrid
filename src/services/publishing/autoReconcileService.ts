import { prisma } from '../../lib/prisma.js';
import { runPrepareAndPublish } from './prepareAndPublishService.js';
import { runScheduler } from './schedulerService.js';
import { recordSyncEvent } from './syncEventService.js';

const DEBOUNCE_MS = 2_000;

export type AutoSyncPhase = 'idle' | 'scheduled' | 'running' | 'failed';

export type AutoSyncStatus = {
  phase: AutoSyncPhase;
  scheduledFullReconcile: boolean;
  lastCompletedAt: string | null;
  lastError: string | null;
  lastDispatched: number | null;
};

type Pending = {
  needsFullReconcile: boolean;
  timer: ReturnType<typeof setTimeout> | null;
};

const pendingByDealer = new Map<string, Pending>();
const statusByDealer = new Map<string, AutoSyncStatus>();

function defaultStatus(): AutoSyncStatus {
  return {
    phase: 'idle',
    scheduledFullReconcile: false,
    lastCompletedAt: null,
    lastError: null,
    lastDispatched: null,
  };
}

export function getAutoSyncStatus(dealershipId: string): AutoSyncStatus {
  return statusByDealer.get(dealershipId) ?? defaultStatus();
}

/** After inventory writes: debounced prepare + dispatch. Use full:true for import/bulk. */
export function scheduleAutoReconcile(
  dealershipId: string,
  opts: { full?: boolean; immediate?: boolean } = {}
): void {
  const full = opts.full === true;
  const entry = pendingByDealer.get(dealershipId) ?? { needsFullReconcile: false, timer: null };
  entry.needsFullReconcile = entry.needsFullReconcile || full;
  if (entry.timer) clearTimeout(entry.timer);

  const delay = opts.immediate ? 0 : DEBOUNCE_MS;
  entry.timer = setTimeout(() => {
    entry.timer = null;
    void flushAutoReconcile(dealershipId);
  }, delay);

  pendingByDealer.set(dealershipId, entry);

  const st = statusByDealer.get(dealershipId) ?? defaultStatus();
  statusByDealer.set(dealershipId, {
    ...st,
    phase: 'scheduled',
    scheduledFullReconcile: entry.needsFullReconcile,
    lastError: null,
  });
}

async function flushAutoReconcile(dealershipId: string): Promise<void> {
  const entry = pendingByDealer.get(dealershipId);
  const needsFull = entry?.needsFullReconcile ?? false;
  pendingByDealer.delete(dealershipId);

  const running: AutoSyncStatus = {
    phase: 'running',
    scheduledFullReconcile: false,
    lastCompletedAt: getAutoSyncStatus(dealershipId).lastCompletedAt,
    lastError: null,
    lastDispatched: null,
  };
  statusByDealer.set(dealershipId, running);

  try {
    if (needsFull) {
      await runPrepareAndPublish(prisma, dealershipId, { dryRun: false });
    }
    const sched = await runScheduler(prisma, { dealershipId, dryRun: false });

    await recordSyncEvent(prisma, {
      dealershipId,
      kind: 'INVENTORY_CHANGE',
      payload: {
        autoReconcile: true,
        fullPrepare: needsFull,
        dispatched: sched.sentCount,
      },
    });

    statusByDealer.set(dealershipId, {
      phase: 'idle',
      scheduledFullReconcile: false,
      lastCompletedAt: new Date().toISOString(),
      lastError: null,
      lastDispatched: sched.sentCount,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Auto-reconcile failed';
    statusByDealer.set(dealershipId, {
      phase: 'failed',
      scheduledFullReconcile: false,
      lastCompletedAt: getAutoSyncStatus(dealershipId).lastCompletedAt,
      lastError: message,
      lastDispatched: null,
    });
  }
}

/** First visit: no artifacts yet but inventory exists — bootstrap outbound pipeline. */
export async function scheduleBootstrapIfNeeded(dealershipId: string): Promise<void> {
  const [artifactCount, vehicleCount] = await Promise.all([
    prisma.generatedArtifact.count({ where: { dealershipId } }),
    prisma.vehicle.count({
      where: { dealershipId, soldAt: null, removedAt: null },
    }),
  ]);
  if (artifactCount === 0 && vehicleCount > 0) {
    scheduleAutoReconcile(dealershipId, { full: true, immediate: false });
  }
}

/** Test-only reset */
export function _resetAutoReconcileState(): void {
  for (const p of pendingByDealer.values()) {
    if (p.timer) clearTimeout(p.timer);
  }
  pendingByDealer.clear();
  statusByDealer.clear();
}
