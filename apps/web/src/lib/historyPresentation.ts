import type { SyncEvent } from './types.ts';
import type { OpsRowField } from './opsRowPresentation.ts';
import { operatorCopy } from './copy/operator.ts';
import { syncEventSearchBlob } from './rowNavScope.ts';

const KIND_LABELS: Record<string, string> = {
  SUBMISSION_SENT: 'Sent to channel',
  ARTIFACT_GENERATED: 'Feed prepared',
  INVENTORY_CHANGE: 'Asset updated',
  INVENTORY_IMPORT: 'Assets imported',
  VEHICLE_SOLD: 'Delisted',
  VEHICLE_REMOVED: 'Removed from catalog',
  DISPATCH_CLAIMED: 'Dispatch started',
  SYNC_RUN_COMPLETE: 'Sync completed',
  SYNC_RUN_FAILED: 'Sync failed',
};

export function historyEventKindLabel(event: SyncEvent): string {
  return KIND_LABELS[event.kind] ?? event.kind.replace(/_/g, ' ').toLowerCase();
}

export function historyEventTitle(event: SyncEvent): string {
  return historyEventKindLabel(event);
}

export function historyEventSecondaryMeta(event: SyncEvent): string {
  const parts: string[] = [];
  if (event.platformSlug) parts.push(event.platformSlug);
  parts.push(historyEventMeta(event));
  return parts.join(' · ');
}

export function historyDesktopFields(event: SyncEvent): OpsRowField[] {
  const fields: OpsRowField[] = [
    { label: 'Recorded', value: historyEventMeta(event) },
    { label: 'Event type', value: event.kind },
  ];
  if (event.platformSlug) {
    fields.unshift({ label: operatorCopy.drawer.channel, value: event.platformSlug });
  }
  return fields;
}

/** @deprecated Use historyEventTitle + historyEventSecondaryMeta */
export function historyEventLead(event: SyncEvent): string {
  const label = historyEventKindLabel(event);
  if (event.platformSlug) return `${label} · ${event.platformSlug}`;
  return label;
}

export function historyEventMeta(event: SyncEvent): string {
  return new Date(event.createdAt).toLocaleString();
}

export function historySituationLine(events: SyncEvent[]): string {
  if (!events.length) return operatorCopy.history.empty;
  const latest = events[0]!;
  return `${events.length} recent event${events.length !== 1 ? 's' : ''} · latest ${historyEventMeta(latest)}`;
}

export function filterHistoryEvents(
  events: SyncEvent[],
  search: string,
  kindFilter: HistoryKindFilter
): SyncEvent[] {
  let list = events;
  if (kindFilter === 'SUCCESS') {
    list = list.filter(e => e.kind === 'SUBMISSION_SENT' || e.kind === 'ARTIFACT_GENERATED');
  } else if (kindFilter === 'FAILED') {
    list = list.filter(e => e.kind.includes('FAIL') || e.kind.includes('ERROR'));
  }
  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(e => syncEventSearchBlob(e).includes(q));
  }
  return list;
}

export type HistoryKindFilter = 'ALL' | 'SUCCESS' | 'FAILED';

export const HISTORY_KIND_FILTERS: Array<{ key: HistoryKindFilter; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'SUCCESS', label: 'Sent / prepared' },
  { key: 'FAILED', label: 'Failed' },
];
