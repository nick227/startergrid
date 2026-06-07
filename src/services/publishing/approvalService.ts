import type { PrismaClient } from '@prisma/client';
import type { SyncMode } from './syncPolicyService.js';
import { resolveScheduledFor } from './syncPolicyService.js';
import { recordSyncEvent } from './syncEventService.js';

// ── Legal transition matrix ──────────────────────────────────────────────────

export function canApprove(status: string): boolean {
  return status === 'NEEDS_APPROVAL';
}

export function canHold(status: string): boolean {
  return status === 'NEEDS_APPROVAL';
}

export function canReject(status: string): boolean {
  return status === 'NEEDS_APPROVAL' || status === 'HELD';
}

export function canRelease(status: string): boolean {
  return status === 'HELD';
}

// After approval, what status should the item move to?
export function approvedNextStatus(policyMode: SyncMode): 'READY' | 'SCHEDULED' {
  return policyMode === 'SCHEDULED' ? 'SCHEDULED' : 'READY';
}

// Human-readable age string from a date
export function ageLabel(since: Date, now = new Date()): string {
  const ms = now.getTime() - since.getTime();
  const minutes = Math.floor(ms / 60_000);
  const hours   = Math.floor(minutes / 60);
  const days    = Math.floor(hours / 24);
  if (days > 0)    return `${days}d ${hours % 24}h`;
  if (hours > 0)   return `${hours}h ${minutes % 60}m`;
  if (minutes > 0) return `${minutes}m`;
  return 'just now';
}

// ── DB functions ─────────────────────────────────────────────────────────────

export async function approveQueueItem(
  prisma: PrismaClient,
  itemId: string,
  operator: string
): Promise<void> {
  const item = await prisma.publishQueueItem.findUniqueOrThrow({ where: { id: itemId } });

  if (!canApprove(item.status)) {
    throw new Error(`Cannot approve item in status ${item.status}. Only NEEDS_APPROVAL items can be approved.`);
  }

  const nextStatus = approvedNextStatus(item.policyMode as SyncMode);
  const scheduledFor = nextStatus === 'SCHEDULED' ? resolveScheduledFor('SCHEDULED') : null;

  await prisma.publishQueueItem.update({
    where: { id: itemId },
    data: {
      status: nextStatus as any,
      approvedBy: operator,
      approvedAt: new Date(),
      scheduledFor
    }
  });

  await recordSyncEvent(prisma, {
    dealershipId: item.dealershipId,
    vehicleId: item.vehicleId,
    platformSlug: item.platformSlug,
    kind: 'APPROVAL_GRANTED',
    payload: {
      queueItemId: itemId,
      operator,
      nextStatus,
      policyMode: item.policyMode,
      scheduledFor: scheduledFor?.toISOString() ?? null
    }
  });
}

export async function holdQueueItem(
  prisma: PrismaClient,
  itemId: string,
  operator: string,
  reason: string
): Promise<void> {
  const item = await prisma.publishQueueItem.findUniqueOrThrow({ where: { id: itemId } });

  if (!canHold(item.status)) {
    throw new Error(`Cannot hold item in status ${item.status}. Only NEEDS_APPROVAL items can be held.`);
  }

  await prisma.publishQueueItem.update({
    where: { id: itemId },
    data: {
      status: 'HELD' as any,
      heldBy: operator,
      heldAt: new Date(),
      holdReason: reason
    }
  });

  await recordSyncEvent(prisma, {
    dealershipId: item.dealershipId,
    vehicleId: item.vehicleId,
    platformSlug: item.platformSlug,
    kind: 'APPROVAL_HELD',
    payload: { queueItemId: itemId, operator, reason }
  });
}

export async function rejectQueueItem(
  prisma: PrismaClient,
  itemId: string,
  operator: string,
  reason: string
): Promise<void> {
  const item = await prisma.publishQueueItem.findUniqueOrThrow({ where: { id: itemId } });

  if (!canReject(item.status)) {
    throw new Error(`Cannot reject item in status ${item.status}. Only NEEDS_APPROVAL or HELD items can be rejected.`);
  }

  await prisma.publishQueueItem.update({
    where: { id: itemId },
    data: {
      status: 'CANCELLED' as any,
      rejectedBy: operator,
      rejectedAt: new Date(),
      rejectionReason: reason
    }
  });

  await recordSyncEvent(prisma, {
    dealershipId: item.dealershipId,
    vehicleId: item.vehicleId,
    platformSlug: item.platformSlug,
    kind: 'APPROVAL_REJECTED',
    payload: { queueItemId: itemId, operator, reason }
  });
}

export async function releaseHeldQueueItem(
  prisma: PrismaClient,
  itemId: string,
  operator: string
): Promise<void> {
  const item = await prisma.publishQueueItem.findUniqueOrThrow({ where: { id: itemId } });

  if (!canRelease(item.status)) {
    throw new Error(`Cannot release item in status ${item.status}. Only HELD items can be released.`);
  }

  await prisma.publishQueueItem.update({
    where: { id: itemId },
    data: {
      status: 'NEEDS_APPROVAL' as any,
      holdReason: null,
      heldAt: null,
      heldBy: null
    }
  });

  await recordSyncEvent(prisma, {
    dealershipId: item.dealershipId,
    vehicleId: item.vehicleId,
    platformSlug: item.platformSlug,
    kind: 'APPROVAL_RELEASED',
    payload: { queueItemId: itemId, operator }
  });
}

export type ApprovalListItem = {
  id: string;
  status: string;
  platformSlug: string;
  platformName: string;
  assetRef: string | null;
  assetTitle: string | null;
  triggerKind: string;
  policyMode: string;
  approvalRequiredReason: string | null;
  holdReason: string | null;
  heldBy: string | null;
  heldAt: string | null;
  ageLabel: string;
  createdAt: string;
};

export async function listApprovalQueue(
  prisma: PrismaClient,
  dealershipId: string
): Promise<{ needsApproval: ApprovalListItem[]; held: ApprovalListItem[] }> {
  const { platformProfiles } = await import('../../data/platformProfiles.js');
  const profileBySlug = new Map(platformProfiles.map(p => [p.slug, p]));

  const items = await prisma.publishQueueItem.findMany({
    where: {
      dealershipId,
      status: { in: ['NEEDS_APPROVAL', 'HELD'] as any }
    },
    include: { vehicle: { select: { stockNumber: true, year: true, make: true, model: true } } },
    orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }]
  });

  const toView = (item: typeof items[number]): ApprovalListItem => ({
    id: item.id,
    status: item.status,
    platformSlug: item.platformSlug,
    platformName: profileBySlug.get(item.platformSlug)?.name ?? item.platformSlug,
    assetRef: item.vehicle?.stockNumber ?? null,
    assetTitle: item.vehicle ? `${item.vehicle.year} ${item.vehicle.make} ${item.vehicle.model}` : null,
    triggerKind: item.triggerKind,
    policyMode: item.policyMode,
    approvalRequiredReason: item.approvalRequiredReason,
    holdReason: item.holdReason,
    heldBy: item.heldBy,
    heldAt: item.heldAt?.toISOString() ?? null,
    ageLabel: ageLabel(item.createdAt),
    createdAt: item.createdAt.toISOString()
  });

  return {
    needsApproval: items.filter(i => i.status === 'NEEDS_APPROVAL').map(toView),
    held: items.filter(i => i.status === 'HELD').map(toView)
  };
}
