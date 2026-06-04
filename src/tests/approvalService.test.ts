import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canApprove,
  canHold,
  canReject,
  canRelease,
  approvedNextStatus,
  ageLabel
} from '../services/approvalService.js';
import { isEligibleForDispatch } from '../services/schedulerService.js';

// ── Legal / illegal transition matrix ────────────────────────────────────────

describe('canApprove', () => {
  it('NEEDS_APPROVAL → can approve', () => assert.ok(canApprove('NEEDS_APPROVAL')));
  it('HELD           → cannot approve', () => assert.ok(!canApprove('HELD')));
  it('READY          → cannot approve', () => assert.ok(!canApprove('READY')));
  it('SCHEDULED      → cannot approve', () => assert.ok(!canApprove('SCHEDULED')));
  it('SENT           → cannot approve', () => assert.ok(!canApprove('SENT')));
  it('CANCELLED      → cannot approve', () => assert.ok(!canApprove('CANCELLED')));
  it('BLOCKED        → cannot approve', () => assert.ok(!canApprove('BLOCKED')));
  it('CLAIMED        → cannot approve', () => assert.ok(!canApprove('CLAIMED')));
  it('FAILED         → cannot approve', () => assert.ok(!canApprove('FAILED')));
});

describe('canHold', () => {
  it('NEEDS_APPROVAL → can hold',   () => assert.ok(canHold('NEEDS_APPROVAL')));
  it('HELD           → cannot hold', () => assert.ok(!canHold('HELD')));
  it('READY          → cannot hold', () => assert.ok(!canHold('READY')));
  it('SENT           → cannot hold', () => assert.ok(!canHold('SENT')));
  it('CANCELLED      → cannot hold', () => assert.ok(!canHold('CANCELLED')));
});

describe('canReject', () => {
  it('NEEDS_APPROVAL → can reject', () => assert.ok(canReject('NEEDS_APPROVAL')));
  it('HELD           → can reject',  () => assert.ok(canReject('HELD')));
  it('READY          → cannot reject', () => assert.ok(!canReject('READY')));
  it('SENT           → cannot reject', () => assert.ok(!canReject('SENT')));
  it('SCHEDULED      → cannot reject', () => assert.ok(!canReject('SCHEDULED')));
  it('CANCELLED      → cannot reject', () => assert.ok(!canReject('CANCELLED')));
  it('CLAIMED        → cannot reject', () => assert.ok(!canReject('CLAIMED')));
});

describe('canRelease', () => {
  it('HELD           → can release',  () => assert.ok(canRelease('HELD')));
  it('NEEDS_APPROVAL → cannot release', () => assert.ok(!canRelease('NEEDS_APPROVAL')));
  it('READY          → cannot release', () => assert.ok(!canRelease('READY')));
  it('SENT           → cannot release', () => assert.ok(!canRelease('SENT')));
  it('CANCELLED      → cannot release', () => assert.ok(!canRelease('CANCELLED')));
});

describe('approvedNextStatus — timing policy respect', () => {
  it('SCHEDULED mode → SCHEDULED (respects batch timing)', () => {
    assert.equal(approvedNextStatus('SCHEDULED'), 'SCHEDULED');
  });
  it('REAL_TIME mode → READY (immediate)', () => {
    assert.equal(approvedNextStatus('REAL_TIME'), 'READY');
  });
  it('APPROVAL_REQUIRED mode → READY (cleared for dispatch)', () => {
    assert.equal(approvedNextStatus('APPROVAL_REQUIRED'), 'READY');
  });
  it('MANUAL mode → READY (operator made explicit choice)', () => {
    assert.equal(approvedNextStatus('MANUAL'), 'READY');
  });
});

describe('ageLabel', () => {
  const now = new Date('2026-06-05T12:00:00Z');

  it('seconds ago → "just now"', () => {
    const since = new Date('2026-06-05T11:59:55Z');
    assert.equal(ageLabel(since, now), 'just now');
  });
  it('minutes ago', () => {
    const since = new Date('2026-06-05T11:45:00Z');
    assert.ok(ageLabel(since, now).includes('15m'));
  });
  it('hours and minutes', () => {
    const since = new Date('2026-06-05T09:30:00Z');
    assert.ok(ageLabel(since, now).includes('2h'));
    assert.ok(ageLabel(since, now).includes('30m'));
  });
  it('days and hours', () => {
    const since = new Date('2026-06-04T09:00:00Z'); // 1d3h before now
    const label = ageLabel(since, now);
    assert.ok(label.includes('d'), `expected days in label, got: ${label}`);
  });
});

// ── Scheduler skips unapproved/held items ─────────────────────────────────────

describe('scheduler never dispatches unapproved or held items', () => {
  const past = new Date(Date.now() - 10_000);
  const base = {
    scheduledFor: past,
    attemptCount: 0,
    nextAttemptAt: null,
    claimedAt: null
  };

  it('NEEDS_APPROVAL is not eligible for dispatch', () => {
    assert.ok(!isEligibleForDispatch({ ...base, status: 'NEEDS_APPROVAL' }));
  });
  it('HELD is not eligible for dispatch', () => {
    assert.ok(!isEligibleForDispatch({ ...base, status: 'HELD' }));
  });
  it('READY is eligible', () => {
    assert.ok(isEligibleForDispatch({ ...base, status: 'READY' }));
  });
  it('past-due SCHEDULED is eligible', () => {
    assert.ok(isEligibleForDispatch({ ...base, status: 'SCHEDULED', scheduledFor: past }));
  });
});

// ── Full transition sequence ───────────────────────────────────────────────────

describe('complete approval sequences', () => {
  it('NEEDS_APPROVAL → approve → READY is valid', () => {
    assert.ok(canApprove('NEEDS_APPROVAL'));
    assert.equal(approvedNextStatus('REAL_TIME'), 'READY');
    // After approve: READY is eligible for dispatch
    assert.ok(isEligibleForDispatch({ status: 'READY', scheduledFor: null, attemptCount: 0, nextAttemptAt: null, claimedAt: null }));
  });

  it('NEEDS_APPROVAL → hold → release → NEEDS_APPROVAL is valid', () => {
    assert.ok(canHold('NEEDS_APPROVAL'));
    assert.ok(canRelease('HELD'));
    // After release: NEEDS_APPROVAL (not eligible for dispatch)
    assert.ok(!isEligibleForDispatch({ status: 'NEEDS_APPROVAL', scheduledFor: null, attemptCount: 0, nextAttemptAt: null, claimedAt: null }));
  });

  it('NEEDS_APPROVAL → hold → reject is valid', () => {
    assert.ok(canHold('NEEDS_APPROVAL'));
    assert.ok(canReject('HELD'));
  });

  it('NEEDS_APPROVAL → approve (SCHEDULED policy) → SCHEDULED', () => {
    assert.ok(canApprove('NEEDS_APPROVAL'));
    assert.equal(approvedNextStatus('SCHEDULED'), 'SCHEDULED');
    // SCHEDULED with no scheduledFor set is not yet eligible
    assert.ok(!isEligibleForDispatch({ status: 'SCHEDULED', scheduledFor: null, attemptCount: 0, nextAttemptAt: null, claimedAt: null }));
  });

  it('double-approve is not permitted', () => {
    // Once approved, item moves to READY — READY cannot be approved again
    assert.ok(!canApprove('READY'));
  });
});
