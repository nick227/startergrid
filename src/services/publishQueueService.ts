import type { PrismaClient, Prisma } from '@prisma/client';
import type { IntegrationClass, VehicleUpdateKind, VehicleUpdatePropagation } from '../lib/types.js';
import { platformProfiles } from '../data/platformProfiles.js';
import {
  defaultSyncMode,
  resolveQueueStatus,
  resolvePriority,
  resolveScheduledFor,
  resolveBlockReason,
  type SyncMode
} from './syncPolicyService.js';
import { recordSyncEvent } from './syncEventService.js';

export type QueueItemView = {
  id: string;
  stockNumber: string | null;
  vehicleTitle: string | null;
  vehicleId: string | null;
  platformSlug: string;
  platformName: string;
  integrationClass: IntegrationClass;
  triggerKind: string;
  status: string;
  policyMode: string;
  priority: number;
  scheduledFor: string | null;
  blockReason: string | null;
  approvalRequiredReason: string | null;
  holdReason: string | null;
  approvedBy: string | null;
  sentAt: string | null;
  attemptCount: number;
  nextAttemptAt: string | null;
  claimedBy: string | null;
  createdAt: string;
};

export type QueueView = {
  dealershipId: string;
  dealerName: string;
  generatedAt: string;
  pending: QueueItemView[];
  terminal: QueueItemView[];
  overdue: QueueItemView[];
  retryPending: QueueItemView[];
  claimed: QueueItemView[];
  platformAccounts: Array<{ platformSlug: string; platformName: string; state: string }>;
  summary: {
    ready: number;
    scheduled: number;
    needsApproval: number;
    blocked: number;
    held: number;
    claimed: number;
    overdue: number;
    retryPending: number;
    sent: number;
    failed: number;
  };
};

// ── Queue population ─────────────────────────────────────────────────────────

export async function enqueueFromVehicleUpdate(
  prisma: PrismaClient,
  dealershipId: string,
  vehicleId: string,
  kind: VehicleUpdateKind,
  propagations: VehicleUpdatePropagation[]
): Promise<{ queued: number; syncEventId: string }> {
  // Pick the right SyncEventKind
  const syncEventKind = kind === 'SOLD'
    ? 'VEHICLE_SOLD'
    : kind === 'REMOVED'
    ? 'VEHICLE_REMOVED'
    : 'INVENTORY_CHANGE';

  const syncEventId = await recordSyncEvent(prisma, {
    dealershipId,
    vehicleId,
    kind: syncEventKind as any,
    payload: { triggerKind: kind, platformCount: propagations.length, action: propagations.map(p => p.action) }
  });

  // Load persisted policies; fall back to defaults
  const policies = await prisma.syncPolicy.findMany({ where: { dealershipId } });
  const policyMap = new Map(policies.map(p => [p.platformSlug, p]));

  let queued = 0;

  for (const prop of propagations) {
    if (prop.action === 'NO_ACTION') continue;

    const policy = policyMap.get(prop.platformSlug);
    const mode: SyncMode = (policy?.mode as SyncMode) ?? defaultSyncMode(prop.integrationClass as IntegrationClass);
    const urgentRemoval = policy?.urgentRemoval ?? true;

    const status = resolveQueueStatus(mode, kind, urgentRemoval);
    const priority = resolvePriority(kind);
    const scheduledFor = resolveScheduledFor(mode);
    const blockReason = resolveBlockReason(status, mode);

    // Cancel any open (non-terminal) items for this vehicle × platform
    await prisma.publishQueueItem.updateMany({
      where: {
        dealershipId,
        vehicleId,
        platformSlug: prop.platformSlug,
        status: { in: ['READY', 'SCHEDULED', 'NEEDS_APPROVAL', 'HELD'] as any }
      },
      data: { status: 'CANCELLED' as any }
    });

    const approvalRequiredReason = status === 'NEEDS_APPROVAL'
      ? `${prop.integrationClass} platform change requires operator review before dispatch.`
      : null;

    const created = await prisma.publishQueueItem.create({
      data: {
        dealershipId,
        vehicleId,
        platformSlug: prop.platformSlug,
        triggerKind: kind,
        status: status as any,
        policyMode: mode as any,
        priority,
        scheduledFor,
        blockReason,
        approvalRequiredReason
      }
    });

    // Emit APPROVAL_REQUESTED event so the approval gate has an audit entry
    if (status === 'NEEDS_APPROVAL') {
      await recordSyncEvent(prisma, {
        dealershipId,
        vehicleId,
        platformSlug: prop.platformSlug,
        kind: 'APPROVAL_REQUESTED',
        payload: {
          queueItemId: created.id,
          triggerKind: kind,
          reason: approvalRequiredReason,
          policyMode: mode
        }
      });
    }

    queued++;
  }

  return { queued, syncEventId };
}

// ── Queue read ────────────────────────────────────────────────────────────────

const NON_TERMINAL: string[] = ['READY', 'SCHEDULED', 'NEEDS_APPROVAL', 'BLOCKED', 'HELD'];
const TERMINAL: string[] = ['SENT', 'FAILED', 'CANCELLED'];
const IN_FLIGHT: string[] = ['CLAIMED'];

export async function getQueueView(
  prisma: PrismaClient,
  dealershipId: string
): Promise<QueueView> {
  const dealer = await prisma.dealershipProfile.findUniqueOrThrow({ where: { id: dealershipId } });

  const items = await prisma.publishQueueItem.findMany({
    where: { dealershipId },
    include: { vehicle: { select: { stockNumber: true, year: true, make: true, model: true } } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }]
  });

  const accounts = await prisma.platformAccount.findMany({
    where: { dealershipId },
    orderBy: { platformSlug: 'asc' }
  });

  const profileBySlug = new Map(platformProfiles.map(p => [p.slug, p]));

  const toView = (item: typeof items[number]): QueueItemView => {
    const profile = profileBySlug.get(item.platformSlug);
    const v = item.vehicle;
    return {
      id: item.id,
      stockNumber: v?.stockNumber ?? null,
      vehicleTitle: v ? `${v.year} ${v.make} ${v.model}` : null,
      vehicleId: item.vehicleId,
      platformSlug: item.platformSlug,
      platformName: profile?.name ?? item.platformSlug,
      integrationClass: (profile?.integrationClass ?? 'FEEDABLE') as IntegrationClass,
      triggerKind: item.triggerKind,
      status: item.status,
      policyMode: item.policyMode,
      priority: item.priority,
      scheduledFor: item.scheduledFor?.toISOString() ?? null,
      blockReason: item.blockReason,
      approvalRequiredReason: item.approvalRequiredReason,
      holdReason: item.holdReason ?? null,
      approvedBy: item.approvedBy,
      sentAt: item.sentAt?.toISOString() ?? null,
      attemptCount: item.attemptCount,
      nextAttemptAt: item.nextAttemptAt?.toISOString() ?? null,
      claimedBy: item.claimedBy ?? null,
      createdAt: item.createdAt.toISOString()
    };
  };

  const now = new Date();
  const pending  = items.filter(i => NON_TERMINAL.includes(i.status)).map(toView);
  const terminal = items.filter(i => TERMINAL.includes(i.status)).map(toView);
  const claimed  = items.filter(i => IN_FLIGHT.includes(i.status)).map(toView);
  const overdue  = pending.filter(i => i.status === 'SCHEDULED' && i.scheduledFor !== null && new Date(i.scheduledFor) < now);
  const retryPending = terminal.filter(
    i => i.status === 'FAILED' && i.attemptCount < 3 &&
    (i.nextAttemptAt === null || new Date(i.nextAttemptAt) <= now)
  );

  const accountViews = accounts.map(a => ({
    platformSlug: a.platformSlug,
    platformName: profileBySlug.get(a.platformSlug)?.name ?? a.platformSlug,
    state: a.state
  }));

  const summary = {
    ready:        pending.filter(i => i.status === 'READY').length,
    scheduled:    pending.filter(i => i.status === 'SCHEDULED').length,
    needsApproval:pending.filter(i => i.status === 'NEEDS_APPROVAL').length,
    blocked:      pending.filter(i => i.status === 'BLOCKED').length,
    held:         pending.filter(i => i.status === 'HELD').length,
    claimed:      claimed.length,
    overdue:      overdue.length,
    retryPending: retryPending.length,
    sent:         terminal.filter(i => i.status === 'SENT').length,
    failed:       terminal.filter(i => i.status === 'FAILED').length
  };

  return {
    dealershipId,
    dealerName: dealer.legalName,
    generatedAt: new Date().toISOString(),
    pending,
    terminal,
    overdue,
    retryPending,
    claimed,
    platformAccounts: accountViews,
    summary
  };
}

// ── Queue mutations ──────────────────────────────────────────────────────────
// Note: approve/hold/reject/release are in approvalService.ts

export async function processReadyItems(
  prisma: PrismaClient,
  dealershipId: string,
  triggeredBy = 'OPERATOR'
): Promise<{ runId: string; sent: number; skipped: number }> {
  const now = new Date();

  const ready = await prisma.publishQueueItem.findMany({
    where: {
      dealershipId,
      status: { in: ['READY', 'SCHEDULED'] as any }
    },
    include: { vehicle: { select: { stockNumber: true } } }
  });

  // Filter SCHEDULED items whose scheduledFor has arrived
  const toProcess = ready.filter(item =>
    item.status === 'READY' ||
    (item.status === 'SCHEDULED' && item.scheduledFor != null && item.scheduledFor <= now)
  );

  const syncRun = await prisma.syncRun.create({
    data: {
      dealershipId,
      triggeredBy,
      status: 'RUNNING',
      itemsTotal: toProcess.length,
      startedAt: now
    }
  });

  let sent = 0;
  let skipped = 0;

  for (const item of toProcess) {
    // In MOCK env: mark SENT immediately (no real API call)
    await prisma.publishQueueItem.update({
      where: { id: item.id },
      data: { status: 'SENT' as any, sentAt: new Date() }
    });

    await recordSyncEvent(prisma, {
      dealershipId,
      vehicleId: item.vehicleId,
      platformSlug: item.platformSlug,
      kind: 'SUBMISSION_SENT',
      payload: {
        queueItemId: item.id,
        triggerKind: item.triggerKind,
        stockNumber: item.vehicle?.stockNumber ?? null,
        environment: 'MOCK'
      },
      syncRunId: syncRun.id
    });
    sent++;
  }

  skipped = ready.length - toProcess.length;

  await prisma.syncRun.update({
    where: { id: syncRun.id },
    data: {
      status: 'COMPLETE',
      itemsSent: sent,
      itemsSkipped: skipped,
      completedAt: new Date()
    }
  });

  return { runId: syncRun.id, sent, skipped };
}
