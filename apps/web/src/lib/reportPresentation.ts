import type { VehicleReadinessItem, PublishStatusResponse } from './types.ts';
import type { VehiclePerformanceItem, PlatformPerformanceItem } from './types.ts';
import { inventoryLabels } from './copy/index.ts';

export type ReadinessFilter = 'ALL' | 'blocked' | 'warning' | 'ready';

export function readinessCounts(status: PublishStatusResponse['vehicles']): {
  blocked: number;
  warning: number;
  ready: number;
  total: number;
} {
  return {
    blocked: status.blocked,
    warning: status.warning,
    ready: status.ready,
    total: status.total,
  };
}

export function filterReadinessRows(
  rows: VehicleReadinessItem[],
  filter: ReadinessFilter,
  search: string,
): VehicleReadinessItem[] {
  let list = rows;
  if (filter !== 'ALL') list = list.filter(r => r.label === filter);
  if (search.trim()) {
    const q = search.toLowerCase();
    list = list.filter(
      r =>
        r.stockNumber.toLowerCase().includes(q)
        || r.issues.some(i => i.message.toLowerCase().includes(q) || (i.code?.toLowerCase().includes(q) ?? false)),
    );
  }
  return list.sort((a, b) => {
    const rank = { blocked: 0, warning: 1, ready: 2 };
    return rank[a.label] - rank[b.label] || a.stockNumber.localeCompare(b.stockNumber);
  });
}

export function topIssueSummary(rows: VehicleReadinessItem[], limit = 3): string {
  const counts = new Map<string, number>();
  for (const row of rows.filter(r => r.label === 'blocked')) {
    for (const issue of row.issues) {
      const key = issue.code ?? issue.path ?? issue.message.slice(0, 40);
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit);
  if (!top.length) return 'No blockers';
  return top.map(([k, n]) => `${k} (${n})`).join(' · ');
}

export function readinessRowTitle(row: VehicleReadinessItem): string {
  const labels = inventoryLabels();
  return `${labels.refColumn} ${row.stockNumber}`;
}

export function readinessRowMeta(row: VehicleReadinessItem): string {
  if (!row.issues.length) return 'No issues';
  return row.issues.map(i => i.message).slice(0, 2).join(' · ');
}

export function readinessStatusVisual(row: VehicleReadinessItem): { label: string; pill: string } {
  if (row.label === 'blocked') {
    return { label: 'Blocked', pill: 'bg-status-error-bg text-status-error-text border border-status-error-border' };
  }
  if (row.label === 'warning') {
    return { label: 'Warning', pill: 'bg-status-warning-bg text-status-warning-text border border-status-warning-border' };
  }
  return { label: 'Ready', pill: 'bg-status-success-bg text-status-success-text border border-status-success-border' };
}

export function movementActionCount(vehicles: VehiclePerformanceItem[]): number {
  return vehicles.filter(v => v.movementSignal === 'STALE' || v.movementSignal === 'SLOW').length;
}

export function topMovementRows(vehicles: VehiclePerformanceItem[], limit = 3): VehiclePerformanceItem[] {
  const rank: Record<string, number> = { STALE: 0, SLOW: 1, ON_TRACK: 2, FAST: 3, LOW_DATA: 4 };
  return [...vehicles]
    .sort((a, b) => (rank[a.movementSignal] ?? 9) - (rank[b.movementSignal] ?? 9) || b.daysOnline - a.daysOnline)
    .slice(0, limit);
}

export type PlatformCoverageRow = PlatformPerformanceItem & { coveragePct: number | null };

export function platformCoverageRows(
  platforms: PlatformPerformanceItem[],
  activeAssetCount: number,
): PlatformCoverageRow[] {
  return platforms.map(p => ({
    ...p,
    coveragePct:
      activeAssetCount > 0 ? Math.round((p.vehiclesListed / activeAssetCount) * 100) : null,
  }));
}

export function lowestCoveragePct(rows: PlatformCoverageRow[]): number | null {
  const vals = rows.map(r => r.coveragePct).filter((v): v is number => v != null);
  if (!vals.length) return null;
  return Math.min(...vals);
}

export function exposureSecondaryMeta(row: PlatformCoverageRow, activeTotal: number): string {
  const listed = `${row.vehiclesListed} listed`;
  const pct = row.coveragePct != null ? `${row.coveragePct}% of ${activeTotal} active` : '—';
  return `${listed} · ${pct}`;
}

export function engagementSortedPlatforms(platforms: PlatformPerformanceItem[]): PlatformPerformanceItem[] {
  return [...platforms].sort(
    (a, b) => (b.leadsPerVehicle ?? b.totalLeads) - (a.leadsPerVehicle ?? a.totalLeads),
  );
}

export function topEngagementTotal(platforms: PlatformPerformanceItem[]): number {
  if (!platforms.length) return 0;
  return Math.max(...platforms.map(p => p.totalLeads));
}
