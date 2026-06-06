import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

// Mirror operator portal freshness helpers (kept in sync with apps/web/src/lib/performanceFreshness.ts)
function isBenchmarksUpdating(autoSync: {
  phase: string;
  performanceRefreshPending: boolean;
} | null | undefined): boolean {
  if (!autoSync) return false;
  if (autoSync.performanceRefreshPending) return true;
  return autoSync.phase === 'scheduled' || autoSync.phase === 'running';
}

function formatBenchmarkFreshness(
  performanceComputedAt: string | null | undefined,
  autoSync: { phase: string; performanceRefreshPending: boolean; lastCompletedAt?: string | null } | null | undefined,
): string {
  if (isBenchmarksUpdating(autoSync)) {
    return 'Benchmarks updating after inventory sync…';
  }
  if (autoSync?.lastCompletedAt && (!performanceComputedAt || new Date(autoSync.lastCompletedAt) > new Date(performanceComputedAt))) {
    return 'Sync finished — movement benchmarks may still be catching up. Refresh on Sync if needed.';
  }
  if (!performanceComputedAt) {
    return 'No movement benchmarks yet. Refresh on Sync when you want an update.';
  }
  return `Benchmarks updated ${new Date(performanceComputedAt).toLocaleString()}`;
}

describe('performance freshness copy', () => {
  it('shows updating copy while auto-sync reconcile or benchmark compute runs', () => {
    assert.equal(
      formatBenchmarkFreshness('2026-06-01T12:00:00.000Z', { phase: 'running', performanceRefreshPending: false }),
      'Benchmarks updating after inventory sync…',
    );
    assert.equal(
      formatBenchmarkFreshness(null, { phase: 'idle', performanceRefreshPending: true }),
      'Benchmarks updating after inventory sync…',
    );
  });
});
