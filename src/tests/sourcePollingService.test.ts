import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_POLL_INTERVAL_MINUTES,
  MIN_POLL_INTERVAL_MINUTES,
  MAX_POLL_INTERVAL_MINUTES,
  isSourceDueForCheck,
  getNextCheckAt,
  summarizeSourcePolling,
  type PollingSourceMeta,
  type PollSummary,
} from '../services/inventory/sourcePollingService.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOW = new Date('2026-06-05T14:00:00.000Z');

function source(overrides: Partial<PollingSourceMeta> = {}): PollingSourceMeta {
  return {
    id:                  'src-1',
    label:               'Test Feed',
    status:              'ACTIVE',
    pollIntervalMinutes: 60,
    lastCheckedAt:       null,
    ...overrides,
  };
}

function hoursAgo(n: number): string {
  return new Date(NOW.getTime() - n * 3_600_000).toISOString();
}

function minutesAgo(n: number): string {
  return new Date(NOW.getTime() - n * 60_000).toISOString();
}

// ── Constants ─────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('DEFAULT_POLL_INTERVAL_MINUTES is positive', () => {
    assert.ok(DEFAULT_POLL_INTERVAL_MINUTES > 0);
  });
  it('MIN_POLL_INTERVAL_MINUTES is 5', () => {
    assert.equal(MIN_POLL_INTERVAL_MINUTES, 5);
  });
  it('MAX_POLL_INTERVAL_MINUTES is 10080 (1 week)', () => {
    assert.equal(MAX_POLL_INTERVAL_MINUTES, 10_080);
  });
});

// ── isSourceDueForCheck ───────────────────────────────────────────────────────

describe('isSourceDueForCheck — no poll interval', () => {
  it('returns false when pollIntervalMinutes is null', () => {
    const s = source({ pollIntervalMinutes: null, lastCheckedAt: null });
    assert.equal(isSourceDueForCheck(s, NOW), false);
  });

  it('returns false even if never checked and interval is null', () => {
    const s = source({ pollIntervalMinutes: null, lastCheckedAt: hoursAgo(100) });
    assert.equal(isSourceDueForCheck(s, NOW), false);
  });
});

describe('isSourceDueForCheck — never checked', () => {
  it('returns true when never checked and has interval', () => {
    const s = source({ pollIntervalMinutes: 60, lastCheckedAt: null });
    assert.equal(isSourceDueForCheck(s, NOW), true);
  });

  it('returns true for any positive interval when never checked', () => {
    assert.ok(isSourceDueForCheck(source({ pollIntervalMinutes: 5,     lastCheckedAt: null }), NOW));
    assert.ok(isSourceDueForCheck(source({ pollIntervalMinutes: 10_080, lastCheckedAt: null }), NOW));
  });
});

describe('isSourceDueForCheck — elapsed time', () => {
  it('returns false when checked less than interval ago', () => {
    const s = source({ pollIntervalMinutes: 60, lastCheckedAt: minutesAgo(30) });
    assert.equal(isSourceDueForCheck(s, NOW), false);
  });

  it('returns true when exactly at interval boundary', () => {
    const s = source({ pollIntervalMinutes: 60, lastCheckedAt: minutesAgo(60) });
    assert.equal(isSourceDueForCheck(s, NOW), true);
  });

  it('returns true when overdue (checked more than interval ago)', () => {
    const s = source({ pollIntervalMinutes: 60, lastCheckedAt: hoursAgo(3) });
    assert.equal(isSourceDueForCheck(s, NOW), true);
  });

  it('5-minute interval: due after 5 minutes', () => {
    const s = source({ pollIntervalMinutes: 5, lastCheckedAt: minutesAgo(5) });
    assert.equal(isSourceDueForCheck(s, NOW), true);
  });

  it('5-minute interval: not due at 4 minutes', () => {
    const s = source({ pollIntervalMinutes: 5, lastCheckedAt: minutesAgo(4) });
    assert.equal(isSourceDueForCheck(s, NOW), false);
  });

  it('weekly interval: due after 7 days', () => {
    const sevenDaysAgo = new Date(NOW.getTime() - 7 * 24 * 3_600_000).toISOString();
    const s = source({ pollIntervalMinutes: 10_080, lastCheckedAt: sevenDaysAgo });
    assert.equal(isSourceDueForCheck(s, NOW), true);
  });
});

// ── getNextCheckAt ────────────────────────────────────────────────────────────

describe('getNextCheckAt — no interval', () => {
  it('returns null when pollIntervalMinutes is null', () => {
    const s = source({ pollIntervalMinutes: null, lastCheckedAt: null });
    assert.equal(getNextCheckAt(s, NOW), null);
  });
});

describe('getNextCheckAt — never checked', () => {
  it('returns now when never checked', () => {
    const s = source({ pollIntervalMinutes: 60, lastCheckedAt: null });
    const next = getNextCheckAt(s, NOW);
    assert.equal(next, NOW.toISOString());
  });
});

describe('getNextCheckAt — with lastCheckedAt', () => {
  it('returns lastCheckedAt + interval', () => {
    const lastChecked = minutesAgo(30); // 30 min ago
    const s = source({ pollIntervalMinutes: 60, lastCheckedAt: lastChecked });
    const next = getNextCheckAt(s, NOW);
    assert.ok(next !== null);
    // Next should be in 30 minutes
    const nextMs = new Date(next).getTime();
    const expectedMs = NOW.getTime() + 30 * 60_000;
    assert.ok(Math.abs(nextMs - expectedMs) < 1000, `Expected ~${expectedMs}, got ${nextMs}`);
  });

  it('returns past time when overdue', () => {
    const s = source({ pollIntervalMinutes: 60, lastCheckedAt: hoursAgo(3) });
    const next = getNextCheckAt(s, NOW);
    assert.ok(next !== null);
    assert.ok(new Date(next) < NOW, 'Overdue source next check should be in the past');
  });

  it('due-check and getNextCheckAt are consistent (due iff next is in the past)', () => {
    const justChecked  = source({ pollIntervalMinutes: 60, lastCheckedAt: minutesAgo(1) });
    const overdueCheck = source({ pollIntervalMinutes: 60, lastCheckedAt: hoursAgo(2) });

    const nextJust    = getNextCheckAt(justChecked,  NOW)!;
    const nextOverdue = getNextCheckAt(overdueCheck, NOW)!;

    assert.ok(new Date(nextJust) > NOW);
    assert.ok(new Date(nextOverdue) <= NOW);
    assert.equal(isSourceDueForCheck(justChecked,  NOW), false);
    assert.equal(isSourceDueForCheck(overdueCheck, NOW), true);
  });
});

// ── summarizeSourcePolling ────────────────────────────────────────────────────

describe('summarizeSourcePolling — empty', () => {
  it('returns zeros for empty array', () => {
    const s = summarizeSourcePolling([], NOW);
    assert.equal(s.total, 0);
    assert.equal(s.active, 0);
    assert.equal(s.due, 0);
  });
});

describe('summarizeSourcePolling — status buckets', () => {
  it('counts PAUSED and DISCONNECTED as skipped', () => {
    const sources = [
      source({ status: 'PAUSED' }),
      source({ status: 'DISCONNECTED' }),
    ];
    const s = summarizeSourcePolling(sources, NOW);
    assert.equal(s.skipped, 2);
    assert.equal(s.active, 0);
    assert.equal(s.errors, 0);
  });

  it('counts ERROR separately', () => {
    const sources = [source({ status: 'ERROR' })];
    const s = summarizeSourcePolling(sources, NOW);
    assert.equal(s.errors, 1);
    assert.equal(s.active, 0);
    assert.equal(s.skipped, 0);
  });

  it('partitions active into due vs not-due', () => {
    const sources = [
      source({ status: 'ACTIVE', pollIntervalMinutes: 60, lastCheckedAt: hoursAgo(2) }), // due
      source({ status: 'ACTIVE', pollIntervalMinutes: 60, lastCheckedAt: minutesAgo(10) }), // not due
      source({ status: 'ACTIVE', pollIntervalMinutes: null }), // no interval → not due
      source({ status: 'PAUSED' }),
      source({ status: 'ERROR' }),
    ];
    const s = summarizeSourcePolling(sources, NOW);
    assert.equal(s.total,   5);
    assert.equal(s.active,  3);
    assert.equal(s.due,     1);
    assert.equal(s.notDue,  2);
    assert.equal(s.skipped, 1);
    assert.equal(s.errors,  1);
  });

  it('never-checked active source with interval is due', () => {
    const sources = [source({ status: 'ACTIVE', pollIntervalMinutes: 60, lastCheckedAt: null })];
    const s = summarizeSourcePolling(sources, NOW);
    assert.equal(s.due, 1);
  });
});

// ── PollSummary type ──────────────────────────────────────────────────────────

describe('PollSummary type shape', () => {
  it('has all required fields', () => {
    const s: PollSummary = { total: 5, active: 3, due: 1, notDue: 2, skipped: 1, errors: 1 };
    assert.equal(s.total, 5);
    assert.equal(s.active, 3);
    assert.equal(s.due, 1);
    assert.equal(s.notDue, 2);
    assert.equal(s.skipped, 1);
    assert.equal(s.errors, 1);
  });
});
