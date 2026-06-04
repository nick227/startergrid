import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isEligibleForDispatch,
  isOverdue,
  isRetryPending,
  backoffDelayMs,
  nextRetryAt,
  MAX_ATTEMPTS,
  BACKOFF_DELAYS_MS
} from '../services/schedulerService.js';

// ── helpers ──────────────────────────────────────────────────────────────────

const NOW = new Date('2026-06-05T09:00:00.000Z');
const PAST = new Date(NOW.getTime() - 10_000);      // 10s ago
const FUTURE = new Date(NOW.getTime() + 3_600_000); // 1h ahead

function base(overrides: Partial<Parameters<typeof isEligibleForDispatch>[0]> = {}) {
  return {
    status: 'READY',
    scheduledFor: null,
    attemptCount: 0,
    nextAttemptAt: null,
    claimedAt: null,
    ...overrides
  };
}

// ── isEligibleForDispatch ────────────────────────────────────────────────────

describe('isEligibleForDispatch — READY', () => {
  it('READY with no scheduledFor is always eligible', () => {
    assert.ok(isEligibleForDispatch(base({ status: 'READY' }), NOW));
  });
  it('already claimed → not eligible', () => {
    assert.ok(!isEligibleForDispatch(base({ status: 'READY', claimedAt: PAST }), NOW));
  });
});

describe('isEligibleForDispatch — SCHEDULED', () => {
  it('SCHEDULED with past scheduledFor is eligible', () => {
    assert.ok(isEligibleForDispatch(base({ status: 'SCHEDULED', scheduledFor: PAST }), NOW));
  });
  it('SCHEDULED with future scheduledFor is not eligible', () => {
    assert.ok(!isEligibleForDispatch(base({ status: 'SCHEDULED', scheduledFor: FUTURE }), NOW));
  });
  it('SCHEDULED with null scheduledFor is not eligible', () => {
    assert.ok(!isEligibleForDispatch(base({ status: 'SCHEDULED', scheduledFor: null }), NOW));
  });
  it('SCHEDULED past but already claimed → not eligible', () => {
    assert.ok(!isEligibleForDispatch(base({ status: 'SCHEDULED', scheduledFor: PAST, claimedAt: PAST }), NOW));
  });
});

describe('isEligibleForDispatch — FAILED retry', () => {
  it('FAILED with attemptCount < MAX and null nextAttemptAt is eligible', () => {
    assert.ok(isEligibleForDispatch(base({ status: 'FAILED', attemptCount: 1, nextAttemptAt: null }), NOW));
  });
  it('FAILED with nextAttemptAt in past is eligible', () => {
    assert.ok(isEligibleForDispatch(base({ status: 'FAILED', attemptCount: 1, nextAttemptAt: PAST }), NOW));
  });
  it('FAILED with nextAttemptAt in future is NOT eligible', () => {
    assert.ok(!isEligibleForDispatch(base({ status: 'FAILED', attemptCount: 1, nextAttemptAt: FUTURE }), NOW));
  });
  it('FAILED with attemptCount >= MAX is not eligible (exhausted)', () => {
    assert.ok(!isEligibleForDispatch(base({ status: 'FAILED', attemptCount: MAX_ATTEMPTS, nextAttemptAt: PAST }), NOW));
  });
});

describe('isEligibleForDispatch — non-eligible statuses', () => {
  for (const status of ['SENT', 'CANCELLED', 'BLOCKED', 'NEEDS_APPROVAL', 'CLAIMED']) {
    it(`${status} is never eligible`, () => {
      assert.ok(!isEligibleForDispatch(base({ status }), NOW));
    });
  }
});

// ── isOverdue ─────────────────────────────────────────────────────────────────

describe('isOverdue', () => {
  it('SCHEDULED with past scheduledFor is overdue', () => {
    assert.ok(isOverdue({ status: 'SCHEDULED', scheduledFor: PAST }, NOW));
  });
  it('SCHEDULED with future scheduledFor is not overdue', () => {
    assert.ok(!isOverdue({ status: 'SCHEDULED', scheduledFor: FUTURE }, NOW));
  });
  it('READY is never overdue', () => {
    assert.ok(!isOverdue({ status: 'READY', scheduledFor: null }, NOW));
  });
  it('null scheduledFor is not overdue', () => {
    assert.ok(!isOverdue({ status: 'SCHEDULED', scheduledFor: null }, NOW));
  });
});

// ── isRetryPending ────────────────────────────────────────────────────────────

describe('isRetryPending', () => {
  it('FAILED with attempts left and past nextAttemptAt is retry-pending', () => {
    assert.ok(isRetryPending({ status: 'FAILED', attemptCount: 1, nextAttemptAt: PAST }, NOW));
  });
  it('FAILED with attempts left and null nextAttemptAt is retry-pending', () => {
    assert.ok(isRetryPending({ status: 'FAILED', attemptCount: 0, nextAttemptAt: null }, NOW));
  });
  it('FAILED with attempts left but future nextAttemptAt is NOT retry-pending', () => {
    assert.ok(!isRetryPending({ status: 'FAILED', attemptCount: 1, nextAttemptAt: FUTURE }, NOW));
  });
  it('FAILED with MAX attempts reached is not retry-pending', () => {
    assert.ok(!isRetryPending({ status: 'FAILED', attemptCount: MAX_ATTEMPTS, nextAttemptAt: PAST }, NOW));
  });
  it('SENT is never retry-pending', () => {
    assert.ok(!isRetryPending({ status: 'SENT', attemptCount: 0, nextAttemptAt: null }, NOW));
  });
});

// ── backoffDelayMs ────────────────────────────────────────────────────────────

describe('backoffDelayMs', () => {
  it('attempt 1 → 5 minutes', () => {
    assert.equal(backoffDelayMs(1), 5 * 60 * 1000);
  });
  it('attempt 2 → 30 minutes', () => {
    assert.equal(backoffDelayMs(2), 30 * 60 * 1000);
  });
  it('attempt 3+ → 60 minutes (max)', () => {
    assert.equal(backoffDelayMs(3), 60 * 60 * 1000);
    assert.equal(backoffDelayMs(99), 60 * 60 * 1000);
  });
  it('delays are strictly increasing', () => {
    for (let i = 0; i < BACKOFF_DELAYS_MS.length - 1; i++) {
      assert.ok(BACKOFF_DELAYS_MS[i]! < BACKOFF_DELAYS_MS[i + 1]!);
    }
  });
});

// ── nextRetryAt ───────────────────────────────────────────────────────────────

describe('nextRetryAt', () => {
  it('returns a future Date', () => {
    const d = nextRetryAt(1);
    assert.ok(d instanceof Date);
    assert.ok(d.getTime() > Date.now());
  });
  it('attempt 1 is ~5 minutes ahead', () => {
    const before = Date.now();
    const d = nextRetryAt(1);
    const delta = d.getTime() - before;
    assert.ok(delta >= 5 * 60 * 1000 - 100, `expected >= 5m, got ${delta}ms`);
    assert.ok(delta <= 5 * 60 * 1000 + 1000, `expected <= 5m+1s, got ${delta}ms`);
  });
  it('attempt 2 is further out than attempt 1', () => {
    assert.ok(nextRetryAt(2).getTime() > nextRetryAt(1).getTime());
  });
});

// ── Constants ─────────────────────────────────────────────────────────────────

describe('constants', () => {
  it('MAX_ATTEMPTS is 3', () => {
    assert.equal(MAX_ATTEMPTS, 3);
  });
  it('BACKOFF_DELAYS_MS has 3 entries matching 5m, 30m, 60m', () => {
    assert.equal(BACKOFF_DELAYS_MS.length, 3);
    assert.equal(BACKOFF_DELAYS_MS[0], 5 * 60 * 1000);
    assert.equal(BACKOFF_DELAYS_MS[1], 30 * 60 * 1000);
    assert.equal(BACKOFF_DELAYS_MS[2], 60 * 60 * 1000);
  });
});
