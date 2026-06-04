import { nanoid } from 'nanoid';
import type { PrismaClient, Prisma } from '@prisma/client';
import { recordSyncEvent } from './syncEventService.js';

// ── Constants ────────────────────────────────────────────────────────────────

export const MAX_ATTEMPTS = 3;
// Backoff delays for attempt 1, 2, 3+ (in milliseconds)
export const BACKOFF_DELAYS_MS = [5 * 60 * 1000, 30 * 60 * 1000, 60 * 60 * 1000] as const;

// ── Pure helpers — testable without DB ──────────────────────────────────────

export type EligibilityCheck = {
  status: string;
  scheduledFor: Date | null;
  attemptCount: number;
  nextAttemptAt: Date | null;
  claimedAt: Date | null;
};

export function backoffDelayMs(attemptCount: number): number {
  return BACKOFF_DELAYS_MS[attemptCount - 1] ?? BACKOFF_DELAYS_MS[BACKOFF_DELAYS_MS.length - 1]!;
}

export function nextRetryAt(attemptCount: number): Date {
  return new Date(Date.now() + backoffDelayMs(attemptCount));
}

export function isEligibleForDispatch(item: EligibilityCheck, now = new Date()): boolean {
  if (item.claimedAt !== null) return false;
  if (item.status === 'READY') return true;
  if (item.status === 'SCHEDULED') {
    return item.scheduledFor !== null && item.scheduledFor <= now;
  }
  if (item.status === 'FAILED') {
    return item.attemptCount < MAX_ATTEMPTS &&
      (item.nextAttemptAt === null || item.nextAttemptAt <= now);
  }
  return false;
}

export function isOverdue(item: { status: string; scheduledFor: Date | null }, now = new Date()): boolean {
  return item.status === 'SCHEDULED' && item.scheduledFor !== null && item.scheduledFor < now;
}

export function isRetryPending(item: { status: string; attemptCount: number; nextAttemptAt: Date | null }, now = new Date()): boolean {
  return item.status === 'FAILED' &&
    item.attemptCount < MAX_ATTEMPTS &&
    (item.nextAttemptAt === null || item.nextAttemptAt <= now);
}

// ── Scheduler result types ────────────────────────────────────────────────────

export type SchedulerItemPreview = {
  id: string;
  dealershipId: string;
  vehicleId: string | null;
  platformSlug: string;
  triggerKind: string;
  status: string;
  priority: number;
  scheduledFor: string | null;
  attemptCount: number;
  reason: 'READY' | 'SCHEDULED_DUE' | 'RETRY';
};

export type SchedulerResult = {
  dryRun: boolean;
  schedulerId: string;
  eligibleCount: number;
  claimedCount: number;
  sentCount: number;
  failedCount: number;
  skippedCount: number;
  syncRunIds: string[];
  previews: SchedulerItemPreview[];
};

// ── DB runner ────────────────────────────────────────────────────────────────

export async function runScheduler(
  prisma: PrismaClient,
  opts: {
    dealershipId?: string;
    dryRun?: boolean;
    schedulerId?: string;
  } = {}
): Promise<SchedulerResult> {
  const { dealershipId, dryRun = false } = opts;
  const schedulerId = opts.schedulerId ?? `scheduler-${Date.now()}-${nanoid(6)}`;
  const now = new Date();

  // Find all potentially eligible items
  const candidates = await prisma.publishQueueItem.findMany({
    where: {
      ...(dealershipId ? { dealershipId } : {}),
      claimedAt: null,
      status: { in: ['READY', 'SCHEDULED', 'FAILED'] as any }
    },
    include: {
      vehicle: { select: { stockNumber: true, year: true, make: true, model: true } }
    },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }]
  });

  // Filter to truly eligible
  const eligible = candidates.filter(c => isEligibleForDispatch(c, now));

  // Build previews for dry-run and result reporting
  const previews: SchedulerItemPreview[] = eligible.map(item => ({
    id: item.id,
    dealershipId: item.dealershipId,
    vehicleId: item.vehicleId,
    platformSlug: item.platformSlug,
    triggerKind: item.triggerKind,
    status: item.status,
    priority: item.priority,
    scheduledFor: item.scheduledFor?.toISOString() ?? null,
    attemptCount: item.attemptCount,
    reason: item.status === 'READY'
      ? 'READY'
      : item.status === 'FAILED'
      ? 'RETRY'
      : 'SCHEDULED_DUE'
  }));

  if (dryRun) {
    return {
      dryRun: true,
      schedulerId,
      eligibleCount: eligible.length,
      claimedCount: 0,
      sentCount: 0,
      failedCount: 0,
      skippedCount: 0,
      syncRunIds: [],
      previews
    };
  }

  // Atomically claim each eligible item
  const claimedIds: string[] = [];
  for (const item of eligible) {
    const updated = await prisma.publishQueueItem.updateMany({
      where: {
        id: item.id,
        claimedAt: null,
        status: { in: ['READY', 'SCHEDULED', 'FAILED'] as any }
      },
      data: {
        status: 'CLAIMED' as any,
        claimedAt: now,
        claimedBy: schedulerId
      }
    });
    if (updated.count > 0) {
      claimedIds.push(item.id);
      await recordSyncEvent(prisma, {
        dealershipId: item.dealershipId,
        vehicleId: item.vehicleId,
        platformSlug: item.platformSlug,
        kind: 'DISPATCH_CLAIMED',
        payload: { schedulerId, idempotencyKey: item.idempotencyKey, triggerKind: item.triggerKind }
      });
    }
  }

  if (claimedIds.length === 0) {
    return { dryRun: false, schedulerId, eligibleCount: eligible.length, claimedCount: 0, sentCount: 0, failedCount: 0, skippedCount: eligible.length, syncRunIds: [], previews };
  }

  // Group claimed items by dealershipId
  const claimedItems = eligible.filter(i => claimedIds.includes(i.id));
  const byDealer = new Map<string, typeof claimedItems>();
  for (const item of claimedItems) {
    const arr = byDealer.get(item.dealershipId) ?? [];
    arr.push(item);
    byDealer.set(item.dealershipId, arr);
  }

  let totalSent = 0;
  let totalFailed = 0;
  const syncRunIds: string[] = [];

  for (const [dId, items] of byDealer) {
    const syncRun = await prisma.syncRun.create({
      data: {
        dealershipId: dId,
        triggeredBy: schedulerId,
        status: 'RUNNING',
        itemsTotal: items.length,
        startedAt: now
      }
    });
    syncRunIds.push(syncRun.id);

    let runSent = 0;
    let runFailed = 0;

    for (const item of items) {
      // MOCK dispatch: always succeeds (real failures happen in SANDBOX/PRODUCTION)
      const success = true;

      if (success) {
        await prisma.publishQueueItem.update({
          where: { id: item.id },
          data: {
            status: 'SENT' as any,
            sentAt: new Date(),
            lastAttemptAt: new Date(),
            attemptCount: { increment: 1 }
          }
        });
        await recordSyncEvent(prisma, {
          dealershipId: dId,
          vehicleId: item.vehicleId,
          platformSlug: item.platformSlug,
          kind: 'SUBMISSION_SENT',
          payload: {
            syncRunId: syncRun.id,
            schedulerId,
            idempotencyKey: item.idempotencyKey,
            triggerKind: item.triggerKind,
            environment: 'MOCK'
          },
          syncRunId: syncRun.id
        });
        runSent++;
      } else {
        const newAttemptCount = item.attemptCount + 1;
        const exhausted = newAttemptCount >= MAX_ATTEMPTS;
        const retryAt = exhausted ? null : nextRetryAt(newAttemptCount);

        await prisma.publishQueueItem.update({
          where: { id: item.id },
          data: {
            status: (exhausted ? 'FAILED' : 'SCHEDULED') as any,
            claimedAt: null,
            claimedBy: null,
            attemptCount: newAttemptCount,
            lastAttemptAt: new Date(),
            nextAttemptAt: retryAt,
            failureReason: 'MOCK dispatch failure (simulated)'
          }
        });

        const eventKind = exhausted ? 'DISPATCH_FAILED' : 'DISPATCH_RETRY';
        await recordSyncEvent(prisma, {
          dealershipId: dId,
          vehicleId: item.vehicleId,
          platformSlug: item.platformSlug,
          kind: eventKind,
          payload: {
            syncRunId: syncRun.id,
            schedulerId,
            attemptCount: newAttemptCount,
            exhausted,
            nextAttemptAt: retryAt?.toISOString() ?? null
          },
          syncRunId: syncRun.id
        });
        runFailed++;
      }
    }

    await prisma.syncRun.update({
      where: { id: syncRun.id },
      data: {
        status: 'COMPLETE',
        itemsSent: runSent,
        itemsFailed: runFailed,
        completedAt: new Date()
      }
    });

    totalSent += runSent;
    totalFailed += runFailed;
  }

  return {
    dryRun: false,
    schedulerId,
    eligibleCount: eligible.length,
    claimedCount: claimedIds.length,
    sentCount: totalSent,
    failedCount: totalFailed,
    skippedCount: eligible.length - claimedIds.length,
    syncRunIds,
    previews
  };
}
