import type { VehiclePerformanceItem, PlatformPerformanceItem, MovementSignal } from './types.ts';
import type { OpsRowField } from './opsRowPresentation.ts';
import {
  formatMovementBenchmarkLine,
  formatChannelMetricsDisplay,
  formatPlatformExposureLine,
  movementBenchmarkParts,
} from './movementBenchmark.ts';
import { movementSignalVisual } from './statusRegistry.ts';
import { inventoryLabels } from './copy/index.ts';

export function reportSituationLine(summary: {
  activeCount: number;
  fastCount: number;
  staleCount: number;
  lowDataCount: number;
}): string {
  return `${summary.activeCount} active · ${summary.fastCount} fast · ${summary.staleCount} stale · ${summary.lowDataCount} low data`;
}

export function reportAssetTitle(item: VehiclePerformanceItem): string {
  return `${item.year} ${item.make} ${item.model}`;
}

export function reportAssetSecondaryMeta(item: VehiclePerformanceItem): string {
  const labels = inventoryLabels();
  return `${labels.refColumn} ${item.stockNumber} · ${formatMovementBenchmarkLine(item)}`;
}

export function reportAssetDesktopFields(item: VehiclePerformanceItem): OpsRowField[] {
  const p = movementBenchmarkParts(item);
  return [
    { label: 'Days online', value: String(p.daysOnline) },
    { label: 'Similar avg', value: p.similarAvg != null ? `${p.similarAvg} days` : '—' },
    { label: 'Comparable sample', value: String(p.sampleSize) },
    { label: 'Benchmark', value: p.benchmarkLabel },
  ];
}

export function reportAssetStatus(item: VehiclePerformanceItem): { label: string; pill: string } {
  const meta = movementSignalVisual(item.movementSignal);
  return { label: meta.label, pill: meta.pill };
}

export function reportAssetSurface(signal: MovementSignal): string {
  if (signal === 'STALE') return 'bg-status-error-bg/20';
  if (signal === 'SLOW') return 'bg-status-warning-bg/20';
  return '';
}

export function reportPlatformTitle(item: PlatformPerformanceItem): string {
  return item.platformSlug;
}

export function reportPlatformSecondaryMeta(item: PlatformPerformanceItem): string {
  const channel = formatChannelMetricsDisplay(item.channelMetrics);
  const exposure = formatPlatformExposureLine(item);
  const parts: string[] = [];
  if (exposure) parts.push(exposure);
  if (channel.primary) parts.push(channel.primary);
  else if (item.totalLeads > 0) {
    parts.push(`${item.totalLeads} observed assist${item.totalLeads !== 1 ? 's' : ''}`);
  }
  return parts.join(' · ') || 'No channel activity recorded';
}

export function reportPlatformDesktopFields(item: PlatformPerformanceItem): OpsRowField[] {
  const channel = formatChannelMetricsDisplay(item.channelMetrics);
  return [
    { label: 'Listed', value: String(item.vehiclesListed) },
    { label: 'Sold', value: String(item.vehiclesSold) },
    {
      label: 'Avg move',
      value: item.avgDaysToMove != null ? `${Math.round(item.avgDaysToMove)} days` : '—',
    },
    { label: 'Assists', value: String(item.totalLeads) },
    ...(channel.secondary ? [{ label: 'Channel detail', value: channel.secondary }] : []),
  ];
}

export function reportPlatformStatus(item: PlatformPerformanceItem): { label: string; pill: string } {
  const low = item.confidence === 'INSUFFICIENT' || item.confidence === 'LOW';
  return low
    ? { label: 'Low sample', pill: 'bg-status-neutral-bg text-status-neutral-text border border-status-neutral-border' }
    : { label: `${item.confidence.toLowerCase()} sample`, pill: 'bg-status-info-bg text-status-info-text border border-status-info-border' };
}

export type ReportSignalFilter = 'ALL' | MovementSignal;

export function reportAssetMatchesSignal(item: VehiclePerformanceItem, filter: ReportSignalFilter): boolean {
  if (filter === 'ALL') return true;
  return item.movementSignal === filter;
}

export function reportAssetMatchesSearch(item: VehiclePerformanceItem, query: string): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  return (
    item.stockNumber.toLowerCase().includes(q)
    || item.make.toLowerCase().includes(q)
    || item.model.toLowerCase().includes(q)
    || String(item.year).includes(q)
  );
}

export function reportPlatformMatchesSearch(item: PlatformPerformanceItem, query: string): boolean {
  if (!query.trim()) return true;
  return item.platformSlug.toLowerCase().includes(query.toLowerCase());
}
