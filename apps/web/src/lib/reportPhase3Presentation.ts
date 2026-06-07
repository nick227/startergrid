import type {
  LifecycleTransitionRow,
  MerchandisingAssetRow,
  ChannelVelocityRow,
} from '@auto-dealer/api-client';
import { inventoryLabels } from './copy/index.ts';
import type { OpsRowField } from './opsRowPresentation.ts';

export function lifecycleSummaryLine(
  intake: number,
  sold: number,
  removed: number,
  net: number,
): string {
  return `${intake} intake · ${sold} sold · ${removed} removed · net ${net >= 0 ? '+' : ''}${net}`;
}

export function merchandisingSummaryLine(active: number, neglected: number, total: number): string {
  return `${active} assets worked · ${neglected} active neglected · ${total} updates`;
}

export function velocitySummaryLine(cohort: number, channels: number): string {
  return `${cohort} outcomes in cohort · ${channels} channels with observed time-to-outcome`;
}

export function merchandisingAssetTitle(row: MerchandisingAssetRow): string {
  const labels = inventoryLabels();
  return `${labels.refColumn} ${row.assetRef}`;
}

export function merchandisingSecondaryMeta(row: MerchandisingAssetRow): string {
  const kinds = row.byKind.map(k => `${k.updateKind} (${k.count})`).join(' · ');
  return kinds || 'No updates';
}

export function merchandisingDesktopFields(row: MerchandisingAssetRow): OpsRowField[] {
  return [
    { label: 'Updates', value: String(row.updateCount) },
    ...row.byKind.slice(0, 4).map(k => ({ label: k.updateKind, value: String(k.count) })),
  ];
}

export function merchandisingMatchesSearch(row: MerchandisingAssetRow, search: string): boolean {
  if (!search.trim()) return true;
  const q = search.toLowerCase();
  return row.assetRef.toLowerCase().includes(q) || row.assetId.toLowerCase().includes(q);
}

export function merchandisingRowsSorted(rows: MerchandisingAssetRow[]): MerchandisingAssetRow[] {
  return [...rows].sort(
    (a, b) => b.updateCount - a.updateCount || a.assetRef.localeCompare(b.assetRef),
  );
}

export function velocityRowsSorted(rows: ChannelVelocityRow[]): ChannelVelocityRow[] {
  return [...rows].sort(
    (a, b) =>
      (a.medianDaysToOutcome ?? Number.POSITIVE_INFINITY)
      - (b.medianDaysToOutcome ?? Number.POSITIVE_INFINITY)
      || b.observedOutcomeCount - a.observedOutcomeCount,
  );
}

export function velocitySecondaryMeta(row: ChannelVelocityRow): string {
  return `${row.observedOutcomeCount} outcomes · ${row.soldOutcomes} sold · ${row.removedOutcomes} removed`;
}

export function velocityDesktopFields(row: ChannelVelocityRow): OpsRowField[] {
  return [
    { label: 'Median days', value: row.medianDaysToOutcome != null ? String(Math.round(row.medianDaysToOutcome)) : '—' },
    { label: 'Outcomes', value: String(row.observedOutcomeCount) },
    { label: 'Sold', value: String(row.soldOutcomes) },
    { label: 'Removed', value: String(row.removedOutcomes) },
  ];
}

export function velocityMatchesSearch(row: ChannelVelocityRow, search: string): boolean {
  if (!search.trim()) return true;
  return row.channelSlug.toLowerCase().includes(search.toLowerCase());
}

export function lifecycleTransitionsSorted(rows: LifecycleTransitionRow[]): LifecycleTransitionRow[] {
  return [...rows].sort((a, b) => b.count - a.count || a.transitionState.localeCompare(b.transitionState));
}
