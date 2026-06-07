import type { QueueItemView } from './types.ts';
import type { OpsRowField } from './opsRowPresentation.ts';
import { queueStatusVisual } from './statusRegistry.ts';
import { taskActionLabel } from './copy/index.ts';
import { inventoryLabels } from './copy/index.ts';
import { operatorCopy } from './copy/operator.ts';

export function queueTaskTitle(item: QueueItemView): string {
  if (item.vehicleTitle) return item.vehicleTitle;
  if (item.stockNumber) return `${inventoryLabels().refColumn} ${item.stockNumber}`;
  return operatorCopy.asset.unknown;
}

export function queueTaskSecondaryMeta(item: QueueItemView): string {
  const labels = inventoryLabels();
  const parts: string[] = [];
  if (item.stockNumber && item.vehicleTitle) {
    parts.push(`${labels.refColumn} ${item.stockNumber}`);
  }
  parts.push(item.platformName, taskActionLabel(item.triggerKind));
  if (item.blockReason) parts.push(item.blockReason);
  else if (item.approvalRequiredReason) parts.push(item.approvalRequiredReason);
  return parts.join(' · ');
}

export function queueDesktopFields(item: QueueItemView): OpsRowField[] {
  const status = queueStatusVisual(item.status);
  const fields: OpsRowField[] = [
    { label: operatorCopy.drawer.channel, value: item.platformName },
    { label: operatorCopy.drawer.action, value: taskActionLabel(item.triggerKind) },
    { label: operatorCopy.drawer.status, value: status.label },
    { label: operatorCopy.drawer.policy, value: item.policyMode },
  ];
  if (item.scheduledFor) {
    fields.push({
      label: operatorCopy.drawer.scheduledFor,
      value: new Date(item.scheduledFor).toLocaleString(),
    });
  }
  if (item.attemptCount > 0) {
    fields.push({ label: operatorCopy.drawer.attempts, value: String(item.attemptCount) });
  }
  return fields;
}

export function queueRowSurface(status: string): string {
  if (status === 'BLOCKED' || status === 'FAILED') return 'bg-status-error-bg/20';
  if (status === 'NEEDS_APPROVAL' || status === 'HELD') return 'bg-status-warning-bg/20';
  return '';
}

export function queueItemStatusVisual(item: QueueItemView): { label: string; pill: string } {
  const v = queueStatusVisual(item.status);
  return { label: v.label, pill: v.pill };
}
