/** Operator-facing freshness line — never use "cache" wording. */

import type { AutoSyncStatus } from '@/lib/types.ts';

export function formatPerformanceUpdated(computedAt: string | null | undefined): string {
  if (!computedAt) {
    return 'No movement benchmarks yet. Refresh on Sync when you want an update.';
  }
  return `Benchmarks updated ${new Date(computedAt).toLocaleString()}`;
}

export function hasPerformanceData(computedAt: string | null | undefined): boolean {
  return computedAt != null && computedAt.length > 0;
}

export function isBenchmarksUpdating(autoSync: AutoSyncStatus | null | undefined): boolean {
  if (!autoSync) return false;
  if (autoSync.performanceRefreshPending) return true;
  return autoSync.phase === 'scheduled' || autoSync.phase === 'running';
}

export function isBenchmarksStale(
  performanceComputedAt: string | null | undefined,
  autoSyncLastCompletedAt: string | null | undefined,
): boolean {
  if (!autoSyncLastCompletedAt) return false;
  if (!performanceComputedAt) return true;
  return new Date(autoSyncLastCompletedAt).getTime() > new Date(performanceComputedAt).getTime();
}

export function formatBenchmarkFreshness(
  performanceComputedAt: string | null | undefined,
  autoSync: AutoSyncStatus | null | undefined,
): string {
  if (isBenchmarksUpdating(autoSync)) {
    return 'Benchmarks updating after inventory sync…';
  }
  if (isBenchmarksStale(performanceComputedAt, autoSync?.lastCompletedAt)) {
    return 'Sync finished — movement benchmarks may still be catching up. Refresh on Sync if needed.';
  }
  return formatPerformanceUpdated(performanceComputedAt);
}
