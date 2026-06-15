import type { QueueItemView } from './types.ts';
import { operatorCopy } from './copy/operator.ts';

export type QueueRowAction =
  | { kind: 'send-now'; label: string }
  | { kind: 'approve'; label: string }
  | { kind: 'hold'; label: string; needsReason?: boolean }
  | { kind: 'reject'; label: string; needsReason?: boolean }
  | { kind: 'release'; label: string }
  | { kind: 'fix-item'; label: string }
  | { kind: 'view-inventory'; label: string }
  | { kind: 'setup-channel'; label: string };

const POSTING_MODE_LABEL: Record<string, string> = {
  REAL_TIME: 'Real-time',
  SCHEDULED: 'Scheduled batch',
  MANUAL: 'Manual',
  APPROVAL_REQUIRED: 'Approval required',
};

export function postingModeLabel(mode: string): string {
  return POSTING_MODE_LABEL[mode] ?? mode.replace(/_/g, ' ').toLowerCase();
}

export function formatQueueSchedule(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function queueItemReason(item: QueueItemView): string {
  if (item.ineligibleReason) return item.ineligibleReason;
  if (item.blockReason) return item.blockReason;
  if (item.approvalRequiredReason) return item.approvalRequiredReason;
  if (item.holdReason) return item.holdReason;
  if (item.status === 'SCHEDULED' && item.policyMode === 'SCHEDULED') return 'Daily feed batch';
  if (item.policyMode === 'REAL_TIME') return 'Automatic sync';
  if (item.policyMode === 'APPROVAL_REQUIRED') return 'Requires operator approval';
  if (item.policyMode === 'MANUAL') return 'Manual dispatch required';
  return '—';
}

export function queueItemActions(item: QueueItemView): QueueRowAction[] {
  if (item.outboundEligible === false) {
    return [{ kind: 'setup-channel', label: operatorCopy.queue.setupChannel }];
  }

  const actions: QueueRowAction[] = [];

  if (item.status === 'NEEDS_APPROVAL') {
    actions.push({ kind: 'approve', label: 'Approve' });
    actions.push({ kind: 'hold', label: 'Hold' });
    actions.push({ kind: 'reject', label: 'Reject' });
    return actions;
  }

  if (item.status === 'HELD') {
    actions.push({ kind: 'release', label: 'Release' });
    actions.push({ kind: 'reject', label: 'Reject' });
    return actions;
  }

  if (item.status === 'READY' || item.status === 'SCHEDULED') {
    actions.push({ kind: 'send-now', label: operatorCopy.queue.sendNow });
    actions.push({ kind: 'hold', label: 'Hold' });
    return actions;
  }

  if (item.status === 'FAILED' && item.attemptCount < 3) {
    actions.push({ kind: 'send-now', label: 'Retry' });
    return actions;
  }

  if (item.status === 'BLOCKED') {
    if (item.assetId || item.assetRef) {
      actions.push({ kind: 'fix-item', label: 'Fix item' });
    }
    return actions;
  }

  return actions;
}
