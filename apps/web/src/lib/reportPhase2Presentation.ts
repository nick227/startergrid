import type {
  PublishThroughputChannelRow,
  SyncActivityChannelRow,
  ObservedDemandAssetRow,
} from '@auto-dealer/api-client';
import { movementSignalVisual } from './statusRegistry.ts';
import { inventoryLabels } from './copy/index.ts';
import type { OpsRowField } from './opsRowPresentation.ts';

export function throughputRowsSorted(
  channels: PublishThroughputChannelRow[],
): PublishThroughputChannelRow[] {
  return [...channels].sort(
    (a, b) =>
      b.failedInPeriod - a.failedInPeriod
      || b.openQueueCount - a.openQueueCount
      || a.channelSlug.localeCompare(b.channelSlug),
  );
}

export function throughputChannelStatus(row: PublishThroughputChannelRow): { label: string; pill: string } {
  if (row.failedInPeriod > 0 || row.dispatchFailuresInPeriod > 0) {
    return {
      label: 'Failures',
      pill: 'bg-status-error-bg text-status-error-text border border-status-error-border',
    };
  }
  if (row.openQueueCount > 0) {
    return {
      label: 'Queue open',
      pill: 'bg-status-warning-bg text-status-warning-text border border-status-warning-border',
    };
  }
  return {
    label: 'Clear',
    pill: 'bg-status-success-bg text-status-success-text border border-status-success-border',
  };
}

export function throughputSecondaryMeta(row: PublishThroughputChannelRow): string {
  return `${row.sentInPeriod} sent · ${row.failedInPeriod} failed · ${row.openQueueCount} open`;
}

export function throughputDesktopFields(row: PublishThroughputChannelRow): OpsRowField[] {
  return [
    { label: 'Sent', value: String(row.sentInPeriod) },
    { label: 'Failed', value: String(row.failedInPeriod) },
    { label: 'Retries', value: String(row.retryEventsInPeriod) },
    { label: 'Dispatch fails', value: String(row.dispatchFailuresInPeriod) },
    { label: 'Open queue', value: String(row.openQueueCount) },
  ];
}

export function throughputMatchesSearch(row: PublishThroughputChannelRow, search: string): boolean {
  if (!search.trim()) return true;
  return row.channelSlug.toLowerCase().includes(search.toLowerCase());
}

export function syncActivityRowsSorted(channels: SyncActivityChannelRow[]): SyncActivityChannelRow[] {
  return [...channels].sort(
    (a, b) => b.totalEvents - a.totalEvents || a.channelSlug.localeCompare(b.channelSlug),
  );
}

export function syncActivitySecondaryMeta(row: SyncActivityChannelRow): string {
  const kinds = row.byKind.slice(0, 3).map(k => `${k.eventKind} (${k.count})`).join(' · ');
  return kinds || 'No events';
}

export function syncActivityDesktopFields(row: SyncActivityChannelRow): OpsRowField[] {
  return [
    { label: 'Total events', value: String(row.totalEvents) },
    ...row.byKind.slice(0, 4).map(k => ({ label: k.eventKind, value: String(k.count) })),
  ];
}

export function syncActivityMatchesSearch(row: SyncActivityChannelRow, search: string): boolean {
  if (!search.trim()) return true;
  const q = search.toLowerCase();
  return (
    row.channelSlug.toLowerCase().includes(q)
    || row.byKind.some(k => k.eventKind.toLowerCase().includes(q))
  );
}

export function observedDemandRowsSorted(assets: ObservedDemandAssetRow[]): ObservedDemandAssetRow[] {
  return [...assets].sort(
    (a, b) =>
      b.observedDemandCount - a.observedDemandCount
      || (b.daysOnline ?? 0) - (a.daysOnline ?? 0)
      || a.assetRef.localeCompare(b.assetRef),
  );
}

export function observedDemandAssetTitle(row: ObservedDemandAssetRow): string {
  const labels = inventoryLabels();
  return `${labels.refColumn} ${row.assetRef}`;
}

export function observedDemandSecondaryMeta(row: ObservedDemandAssetRow): string {
  const days = row.daysOnline != null ? `${row.daysOnline} days online` : 'Days unknown';
  const signal = row.movementSignal ? movementSignalVisual(row.movementSignal).label : 'No signal';
  return `${days} · ${signal}`;
}

export function observedDemandDesktopFields(row: ObservedDemandAssetRow): OpsRowField[] {
  return [
    { label: 'Observed demand', value: String(row.observedDemandCount) },
    { label: 'Leads', value: String(row.observedLeads) },
    { label: 'Channel events', value: String(row.observedChannelEvents) },
    { label: 'Channels touched', value: String(row.byChannel.length) },
  ];
}

export function observedDemandStatus(row: ObservedDemandAssetRow): { label: string; pill: string } {
  if (row.observedDemandCount === 0 && (row.daysOnline ?? 0) >= 30) {
    return {
      label: 'No demand',
      pill: 'bg-status-warning-bg text-status-warning-text border border-status-warning-border',
    };
  }
  if (row.observedDemandCount > 0) {
    return {
      label: `${row.observedDemandCount} demand`,
      pill: 'bg-status-info-bg text-status-info-text border border-status-info-border',
    };
  }
  return {
    label: 'No demand',
    pill: 'bg-status-neutral-bg text-status-neutral-text border border-status-neutral-border',
  };
}

export function observedDemandMatchesSearch(row: ObservedDemandAssetRow, search: string): boolean {
  if (!search.trim()) return true;
  const q = search.toLowerCase();
  return row.assetRef.toLowerCase().includes(q) || row.assetId.toLowerCase().includes(q);
}
