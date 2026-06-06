import { movementSignalVisual } from './statusRegistry.ts';
import type { MovementSignal, PerformanceConfidence, PlatformPerformanceItem, VehiclePerformanceItem } from './types.ts';

export function hasSimilarBenchmark(perf: VehiclePerformanceItem): boolean {
  return perf.comparableCount >= 3 && perf.avgComparableDays != null;
}

export type MovementBenchmarkParts = {
  daysOnline: number;
  similarAvg: number | null;
  similarMedian: number | null;
  sampleSize: number;
  benchmarkConfidence: PerformanceConfidence;
  benchmarkLabel: string;
  signalLabel: string;
  signalTone: string;
  hasBenchmark: boolean;
};

export function movementBenchmarkParts(perf: VehiclePerformanceItem): MovementBenchmarkParts {
  const meta = movementSignalVisual(perf.movementSignal);
  const hasBenchmark = hasSimilarBenchmark(perf);
  return {
    daysOnline: perf.daysOnline,
    similarAvg: perf.avgComparableDays != null ? Math.round(perf.avgComparableDays) : null,
    similarMedian: perf.medianComparableDays != null ? Math.round(perf.medianComparableDays) : null,
    sampleSize: perf.comparableCount,
    benchmarkConfidence: perf.benchmarkConfidence,
    benchmarkLabel: perf.benchmarkLabel,
    signalLabel: meta.label,
    signalTone: meta.pill,
    hasBenchmark,
  };
}

export function formatMovementBenchmarkLine(perf: VehiclePerformanceItem): string {
  const p = movementBenchmarkParts(perf);
  if (p.hasBenchmark && p.similarAvg != null) {
    return `${p.daysOnline} days · Similar avg ${p.similarAvg} · ${p.signalLabel}`;
  }
  if (p.daysOnline > 0) {
    return `${p.daysOnline} days · Not enough comparable data`;
  }
  return 'Not enough comparable data';
}

export function movementTaskHint(perf: VehiclePerformanceItem): string | null {
  switch (perf.movementSignal) {
    case 'STALE':
      return 'Sitting longer than similar stock — review price, photos, or placement.';
    case 'SLOW':
      return 'Moving slower than similar vehicles — worth a second look today.';
    case 'FAST':
      return 'Moving faster than similar stock — keep listing quality up.';
    case 'ON_TRACK':
      return 'In line with similar vehicles.';
    case 'LOW_DATA':
      return 'Not enough similar vehicles yet for a benchmark.';
    default:
      return null;
  }
}

export function formatPlatformAssistHint(item: PlatformPerformanceItem): string | null {
  if (item.totalLeads === 0 && item.avgDaysToMove == null) return null;
  const parts: string[] = [];
  if (item.avgDaysToMove != null) {
    parts.push(`Avg move ${Math.round(item.avgDaysToMove)}d`);
  }
  if (item.medianDaysToMove != null) {
    parts.push(`median ${Math.round(item.medianDaysToMove)}d`);
  }
  if (item.totalLeads > 0) {
    parts.push(`${item.totalLeads} observed assist${item.totalLeads !== 1 ? 's' : ''}`);
  }
  if (item.confidence === 'INSUFFICIENT' || item.confidence === 'LOW') {
    parts.push('low confidence');
  }
  return parts.length > 0 ? parts.join(' · ') : null;
}

export const COMPARABLE_GROUP_RULE =
  'Similar group: same make & model · year ±3 · price ±5% · 3+ sold comparables';

export function formatPlatformExpandLine(
  slug: string,
  leads: number,
  platform?: PlatformPerformanceItem | null,
): string {
  const parts: string[] = [slug];
  if (leads > 0) {
    parts.push(`${leads} observed assist${leads !== 1 ? 's' : ''}`);
  }
  if (platform?.avgDaysToMove != null) {
    parts.push(`avg move ${Math.round(platform.avgDaysToMove)}d`);
  }
  if (platform?.medianDaysToMove != null) {
    parts.push(`median ${Math.round(platform.medianDaysToMove)}d`);
  }
  if (platform && (platform.confidence === 'INSUFFICIENT' || platform.confidence === 'LOW')) {
    parts.push('low confidence');
  }
  return parts.join(' · ');
}

export function platformCompareRows(
  perf: VehiclePerformanceItem,
  platformPerfBySlug?: Map<string, PlatformPerformanceItem>,
): Array<{ slug: string; line: string; vehicleLeads: number }> {
  return Object.entries(perf.platformAssists)
    .map(([slug, assist]) => ({
      slug,
      vehicleLeads: assist.leads,
      line: formatPlatformExpandLine(slug, assist.leads, platformPerfBySlug?.get(slug)),
    }))
    .sort((a, b) => b.vehicleLeads - a.vehicleLeads);
}

export function countLowDataVehicles(items: VehiclePerformanceItem[]): number {
  return items.filter(v => v.movementSignal === 'LOW_DATA' || !hasSimilarBenchmark(v)).length;
}

export function countSlowVehicles(items: VehiclePerformanceItem[]): number {
  return items.filter(v => v.movementSignal === 'SLOW').length;
}

export function countBenchmarkedVehicles(items: VehiclePerformanceItem[]): number {
  return items.filter(hasSimilarBenchmark).length;
}

export function staleStockNumbers(
  items: VehiclePerformanceItem[],
  limit = 3,
): string[] {
  return items
    .filter(v => v.movementSignal === 'STALE' || v.movementSignal === 'SLOW')
    .sort((a, b) => b.daysOnline - a.daysOnline)
    .slice(0, limit)
    .map(v => v.stockNumber);
}

export type MovementSignalKey = MovementSignal;
