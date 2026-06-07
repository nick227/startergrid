import type { QueueItemView, QueueView } from './types.ts';
import { queueStatusVisual } from './statusRegistry.ts';
import { operatorCopy } from './copy/operator.ts';

export type QueueTaskFilter =
  | 'ALL'
  | 'NEEDS_APPROVAL'
  | 'SCHEDULED'
  | 'READY'
  | 'BLOCKED'
  | 'FAILED'
  | 'SENT';

export const QUEUE_TASK_FILTERS: Array<{ key: QueueTaskFilter; label: string }> = [
  { key: 'ALL', label: 'All active' },
  { key: 'NEEDS_APPROVAL', label: 'Needs approval' },
  { key: 'SCHEDULED', label: 'Scheduled' },
  { key: 'READY', label: 'Ready' },
  { key: 'BLOCKED', label: 'Blocked' },
  { key: 'FAILED', label: 'Failed' },
  { key: 'SENT', label: 'Sent' },
];

export function taskActionLabel(triggerKind: string): string {
  const k = triggerKind.toUpperCase();
  if (k === 'SOLD') return operatorCopy.taskActions.sold;
  if (k === 'REMOVED') return operatorCopy.taskActions.remove;
  if (k === 'INITIAL_PUBLISH' || k === 'NEW') return operatorCopy.taskActions.post;
  return operatorCopy.taskActions.update;
}

export function queueSituationSummary(view: QueueView): string {
  const s = view.summary;
  const active =
    s.ready + s.scheduled + s.needsApproval + s.blocked + s.held + s.claimed + s.retryPending;
  if (active === 0 && s.failed === 0) return operatorCopy.queue.empty;
  const parts: string[] = [];
  if (active) parts.push(`${active} task${active !== 1 ? 's' : ''} waiting`);
  if (s.needsApproval) parts.push(`${s.needsApproval} need approval`);
  if (s.failed || s.retryPending) parts.push(`${s.failed + s.retryPending} failed`);
  return parts.join(' · ');
}

function activeItems(view: QueueView): QueueItemView[] {
  const byId = new Map<string, QueueItemView>();
  for (const item of [...view.pending, ...view.claimed, ...view.retryPending]) {
    byId.set(item.id, item);
  }
  return [...byId.values()];
}

export function filterQueueItems(
  view: QueueView,
  filter: QueueTaskFilter,
  platformSlug?: string | null,
  search?: string
): QueueItemView[] {
  let items: QueueItemView[];
  if (filter === 'SENT') {
    items = view.terminal.filter(i => i.status === 'SENT');
  } else if (filter === 'FAILED') {
    items = [...view.retryPending, ...view.terminal.filter(i => i.status === 'FAILED')];
  } else if (filter === 'ALL') {
    items = activeItems(view);
  } else {
    items = activeItems(view).filter(i => i.status === filter);
  }

  if (platformSlug) items = items.filter(i => i.platformSlug === platformSlug);

  if (search?.trim()) {
    const q = search.toLowerCase();
    items = items.filter(
      i =>
        (i.vehicleTitle?.toLowerCase().includes(q) ?? false) ||
        (i.stockNumber?.toLowerCase().includes(q) ?? false) ||
        i.platformName.toLowerCase().includes(q) ||
        i.platformSlug.toLowerCase().includes(q)
    );
  }

  return items.sort((a, b) => a.priority - b.priority || b.createdAt.localeCompare(a.createdAt));
}

export function queueItemMeta(item: QueueItemView): string {
  const parts: string[] = [item.platformName, taskActionLabel(item.triggerKind)];
  if (item.scheduledFor) {
    parts.push(`scheduled ${new Date(item.scheduledFor).toLocaleString()}`);
  }
  if (item.blockReason) parts.push(item.blockReason);
  else if (item.approvalRequiredReason) parts.push(item.approvalRequiredReason);
  else if (item.holdReason) parts.push(item.holdReason);
  return parts.join(' · ');
}

export function queueItemStatus(item: QueueItemView): { label: string; pill: string } {
  const v = queueStatusVisual(item.status);
  return { label: v.label, pill: v.pill };
}
