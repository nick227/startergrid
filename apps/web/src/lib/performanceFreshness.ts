/** Operator-facing freshness line — never use "cache" wording. */

import type { AutoSyncStatus } from '@/lib/types.ts';
import { statusPill } from '../../../../packages/design-tokens/colors.ts';

export type BenchmarkFreshnessState = 'empty' | 'updating' | 'stale' | 'fresh';

export function resolveBenchmarkFreshnessState(
  performanceComputedAt: string | null | undefined,
  autoSync: AutoSyncStatus | null | undefined,
): BenchmarkFreshnessState {
  if (isBenchmarksUpdating(autoSync)) return 'updating';
  if (!hasPerformanceData(performanceComputedAt)) return 'empty';
  if (isBenchmarksStale(performanceComputedAt, autoSync?.lastCompletedAt)) return 'stale';
  return 'fresh';
}

export const BENCHMARK_FRESHNESS_VISUAL: Record<
  BenchmarkFreshnessState,
  { label: string; line: string; pill: string; tone: 'neutral' | 'amber' | 'success' }
> = {
  empty: {
    label: 'No benchmarks yet',
    line: 'No movement benchmarks yet. Refresh after import or sync.',
    pill: statusPill.muted,
    tone: 'neutral',
  },
  updating: {
    label: 'Updating',
    line: 'Benchmarks updating after inventory sync…',
    pill: 'bg-status-warning-bg text-status-warning-text border border-status-warning-border',
    tone: 'amber',
  },
  stale: {
    label: 'May be stale',
    line: 'Sync finished — movement benchmarks may still be catching up.',
    pill: 'bg-status-warning-bg text-status-warning-text border border-status-warning-border',
    tone: 'amber',
  },
  fresh: {
    label: 'Up to date',
    line: '',
    pill: statusPill.success,
    tone: 'success',
  },
};

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
  const state = resolveBenchmarkFreshnessState(performanceComputedAt, autoSync);
  const visual = BENCHMARK_FRESHNESS_VISUAL[state];
  if (state === 'fresh') {
    return formatPerformanceUpdated(performanceComputedAt);
  }
  return visual.line;
}

export function benchmarkFreshnessMeta(
  performanceComputedAt: string | null | undefined,
  autoSync: AutoSyncStatus | null | undefined,
) {
  const state = resolveBenchmarkFreshnessState(performanceComputedAt, autoSync);
  const visual = BENCHMARK_FRESHNESS_VISUAL[state];
  return {
    state,
    label: visual.label,
    line: state === 'fresh' ? formatPerformanceUpdated(performanceComputedAt) : visual.line,
    pill: visual.pill,
    tone: visual.tone,
  };
}
