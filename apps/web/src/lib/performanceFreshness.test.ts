import { describe, expect, it } from 'vitest';
import {
  benchmarkFreshnessMeta,
  resolveBenchmarkFreshnessState,
} from './performanceFreshness.ts';
import type { AutoSyncStatus } from './types.ts';

const AUTO_SYNC_IDLE: AutoSyncStatus = {
  phase: 'idle',
  scheduledFullReconcile: false,
  lastCompletedAt: null,
  lastError: null,
  lastDispatched: null,
  performanceRefreshPending: false,
  performanceComputedAt: '2026-06-05T10:00:00.000Z',
};

describe('resolveBenchmarkFreshnessState', () => {
  it('returns updating when auto-sync is busy', () => {
    expect(resolveBenchmarkFreshnessState('2026-06-05T10:00:00.000Z', {
      ...AUTO_SYNC_IDLE,
      performanceRefreshPending: true,
    })).toBe('updating');
  });

  it('returns stale when sync completed after benchmarks', () => {
    expect(resolveBenchmarkFreshnessState('2026-06-05T10:00:00.000Z', {
      ...AUTO_SYNC_IDLE,
      lastCompletedAt: '2026-06-05T11:00:00.000Z',
    })).toBe('stale');
  });

  it('returns fresh when benchmarks are current', () => {
    expect(resolveBenchmarkFreshnessState('2026-06-05T12:00:00.000Z', {
      ...AUTO_SYNC_IDLE,
      lastCompletedAt: '2026-06-05T11:00:00.000Z',
    })).toBe('fresh');
  });
});

describe('benchmarkFreshnessMeta', () => {
  it('labels empty state without cache wording', () => {
    const meta = benchmarkFreshnessMeta(null, AUTO_SYNC_IDLE);
    expect(meta.label).toBe('No benchmarks yet');
    expect(meta.line.toLowerCase()).not.toContain('cache');
  });
});
