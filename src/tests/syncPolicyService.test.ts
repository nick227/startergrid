import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  defaultSyncMode,
  resolveQueueStatus,
  resolvePriority,
  resolveScheduledFor,
  resolveBlockReason,
  defaultAccountState,
  defaultMinIntervalMinutes,
  isInCooldown,
  cooldownRemainingSeconds,
} from '../services/publishing/syncPolicyService.js';
import { platformProfiles } from '../data/platformProfiles.js';

describe('defaultSyncMode', () => {
  it('OWNED → REAL_TIME', () => {
    assert.equal(defaultSyncMode('OWNED'), 'REAL_TIME');
  });
  it('FEEDABLE → SCHEDULED', () => {
    assert.equal(defaultSyncMode('FEEDABLE'), 'SCHEDULED');
  });
  it('ASSISTED → APPROVAL_REQUIRED', () => {
    assert.equal(defaultSyncMode('ASSISTED'), 'APPROVAL_REQUIRED');
  });
  it('PARTNER_DEPENDENT → MANUAL', () => {
    assert.equal(defaultSyncMode('PARTNER_DEPENDENT'), 'MANUAL');
  });
});

describe('resolveQueueStatus', () => {
  it('REAL_TIME → READY for normal changes', () => {
    assert.equal(resolveQueueStatus('REAL_TIME', 'PRICE_CHANGE', true), 'READY');
  });
  it('SCHEDULED → SCHEDULED for normal changes', () => {
    assert.equal(resolveQueueStatus('SCHEDULED', 'PRICE_CHANGE', true), 'SCHEDULED');
  });
  it('APPROVAL_REQUIRED → NEEDS_APPROVAL for normal changes', () => {
    assert.equal(resolveQueueStatus('APPROVAL_REQUIRED', 'PRICE_CHANGE', true), 'NEEDS_APPROVAL');
  });
  it('MANUAL → BLOCKED for normal changes', () => {
    assert.equal(resolveQueueStatus('MANUAL', 'PRICE_CHANGE', true), 'BLOCKED');
  });

  it('SOLD bypasses to READY regardless of mode when urgentRemoval=true', () => {
    assert.equal(resolveQueueStatus('SCHEDULED', 'SOLD', true), 'READY');
    assert.equal(resolveQueueStatus('APPROVAL_REQUIRED', 'SOLD', true), 'READY');
    assert.equal(resolveQueueStatus('MANUAL', 'SOLD', true), 'READY');
  });
  it('REMOVED bypasses to READY when urgentRemoval=true', () => {
    assert.equal(resolveQueueStatus('SCHEDULED', 'REMOVED', true), 'READY');
  });
  it('SOLD respects policy when urgentRemoval=false', () => {
    assert.equal(resolveQueueStatus('SCHEDULED', 'SOLD', false), 'SCHEDULED');
    assert.equal(resolveQueueStatus('MANUAL', 'SOLD', false), 'BLOCKED');
  });
});

describe('resolvePriority', () => {
  it('SOLD returns priority 1 (highest)', () => {
    assert.equal(resolvePriority('SOLD'), 1);
  });
  it('REMOVED returns priority 1', () => {
    assert.equal(resolvePriority('REMOVED'), 1);
  });
  it('PRICE_CHANGE returns priority 3', () => {
    assert.equal(resolvePriority('PRICE_CHANGE'), 3);
  });
  it('PHOTO_CHANGE returns priority 5', () => {
    assert.equal(resolvePriority('PHOTO_CHANGE'), 5);
  });
  it('all priorities are positive integers', () => {
    const kinds = ['PRICE_CHANGE', 'PHOTO_CHANGE', 'SOLD', 'REMOVED', 'RELISTED', 'DETAILS_CHANGE'] as const;
    for (const k of kinds) {
      assert.ok(resolvePriority(k) > 0);
    }
  });
});

describe('resolveScheduledFor', () => {
  it('SCHEDULED returns a future Date', () => {
    const d = resolveScheduledFor('SCHEDULED');
    assert.ok(d instanceof Date);
    assert.ok(d.getTime() > Date.now());
  });
  it('REAL_TIME returns null', () => {
    assert.equal(resolveScheduledFor('REAL_TIME'), null);
  });
  it('MANUAL returns null', () => {
    assert.equal(resolveScheduledFor('MANUAL'), null);
  });
  it('APPROVAL_REQUIRED returns null', () => {
    assert.equal(resolveScheduledFor('APPROVAL_REQUIRED'), null);
  });
});

describe('resolveBlockReason', () => {
  it('BLOCKED status has a reason mentioning partner', () => {
    const reason = resolveBlockReason('BLOCKED', 'MANUAL');
    assert.ok(reason);
    assert.ok(reason!.toLowerCase().includes('partner'));
  });
  it('NEEDS_APPROVAL has a reason mentioning approval', () => {
    const reason = resolveBlockReason('NEEDS_APPROVAL', 'APPROVAL_REQUIRED');
    assert.ok(reason);
    assert.ok(reason!.toLowerCase().includes('approval'));
  });
  it('READY has no block reason', () => {
    assert.equal(resolveBlockReason('READY', 'REAL_TIME'), null);
  });
  it('SCHEDULED has no block reason', () => {
    assert.equal(resolveBlockReason('SCHEDULED', 'SCHEDULED'), null);
  });
});

describe('defaultAccountState', () => {
  it('ACTIVE application → ACTIVE account', () => {
    assert.equal(defaultAccountState('ACTIVE'), 'ACTIVE');
  });
  it('SUBMITTED → PENDING_REVIEW', () => {
    assert.equal(defaultAccountState('SUBMITTED'), 'PENDING_REVIEW');
  });
  it('PLATFORM_REVIEWING → PENDING_REVIEW', () => {
    assert.equal(defaultAccountState('PLATFORM_REVIEWING'), 'PENDING_REVIEW');
  });
  it('PARTNER_REQUIRED → PARTNER_REQUIRED', () => {
    assert.equal(defaultAccountState('PARTNER_REQUIRED'), 'PARTNER_REQUIRED');
  });
  it('DEALER_ACTION_NEEDED → CREDENTIALS_NEEDED', () => {
    assert.equal(defaultAccountState('DEALER_ACTION_NEEDED'), 'CREDENTIALS_NEEDED');
  });
  it('REJECTED → BLOCKED', () => {
    assert.equal(defaultAccountState('REJECTED'), 'BLOCKED');
  });
  it('NOT_STARTED → ACCOUNT_NEEDED', () => {
    assert.equal(defaultAccountState('NOT_STARTED'), 'ACCOUNT_NEEDED');
  });
});

// ── defaultMinIntervalMinutes ────────────────────────────────────────────────

describe('defaultMinIntervalMinutes', () => {
  it('OWNED → 0 (real-time OK)', () => {
    assert.equal(defaultMinIntervalMinutes('OWNED'), 0);
  });
  it('FEEDABLE → 60 (max once per hour)', () => {
    assert.equal(defaultMinIntervalMinutes('FEEDABLE'), 60);
  });
  it('ASSISTED → 1440 (max once per day)', () => {
    assert.equal(defaultMinIntervalMinutes('ASSISTED'), 1440);
  });
  it('PARTNER_DEPENDENT → null (no rule yet)', () => {
    assert.equal(defaultMinIntervalMinutes('PARTNER_DEPENDENT'), null);
  });
});

// ── isInCooldown ─────────────────────────────────────────────────────────────

describe('isInCooldown', () => {
  const NOW = new Date('2026-06-04T12:00:00Z');

  it('null policy → not in cooldown', () => {
    assert.equal(isInCooldown(null, NOW), false);
  });

  it('undefined policy → not in cooldown', () => {
    assert.equal(isInCooldown(undefined, NOW), false);
  });

  it('minIntervalMinutes = null → not in cooldown', () => {
    assert.equal(isInCooldown({ minIntervalMinutes: null, lastDispatchedAt: new Date() }, NOW), false);
  });

  it('minIntervalMinutes = 0 → not in cooldown (real-time policy)', () => {
    assert.equal(isInCooldown({ minIntervalMinutes: 0, lastDispatchedAt: new Date() }, NOW), false);
  });

  it('no lastDispatchedAt → not in cooldown (never dispatched)', () => {
    assert.equal(isInCooldown({ minIntervalMinutes: 60, lastDispatchedAt: null }, NOW), false);
  });

  it('dispatched 30m ago, cooldown=60m → still in cooldown', () => {
    const last = new Date(NOW.getTime() - 30 * 60_000);
    assert.equal(isInCooldown({ minIntervalMinutes: 60, lastDispatchedAt: last }, NOW), true);
  });

  it('dispatched 61m ago, cooldown=60m → not in cooldown', () => {
    const last = new Date(NOW.getTime() - 61 * 60_000);
    assert.equal(isInCooldown({ minIntervalMinutes: 60, lastDispatchedAt: last }, NOW), false);
  });

  it('dispatched exactly 60m ago, cooldown=60m → not in cooldown (elapsed === cooldown)', () => {
    const last = new Date(NOW.getTime() - 60 * 60_000);
    assert.equal(isInCooldown({ minIntervalMinutes: 60, lastDispatchedAt: last }, NOW), false);
  });

  it('dispatched 23h ago, cooldown=1440m → still in cooldown', () => {
    const last = new Date(NOW.getTime() - 23 * 60 * 60_000);
    assert.equal(isInCooldown({ minIntervalMinutes: 1440, lastDispatchedAt: last }, NOW), true);
  });

  it('dispatched 25h ago, cooldown=1440m → not in cooldown', () => {
    const last = new Date(NOW.getTime() - 25 * 60 * 60_000);
    assert.equal(isInCooldown({ minIntervalMinutes: 1440, lastDispatchedAt: last }, NOW), false);
  });
});

// ── cooldownRemainingSeconds ─────────────────────────────────────────────────

describe('cooldownRemainingSeconds', () => {
  const NOW = new Date('2026-06-04T12:00:00Z');

  it('returns 0 when not in cooldown', () => {
    assert.equal(cooldownRemainingSeconds(null, NOW), 0);
  });

  it('returns 0 when cooldown already expired', () => {
    const last = new Date(NOW.getTime() - 120 * 60_000);
    assert.equal(cooldownRemainingSeconds({ minIntervalMinutes: 60, lastDispatchedAt: last }, NOW), 0);
  });

  it('returns remaining seconds when in cooldown', () => {
    const last = new Date(NOW.getTime() - 30 * 60_000); // 30m ago
    const remaining = cooldownRemainingSeconds({ minIntervalMinutes: 60, lastDispatchedAt: last }, NOW);
    assert.ok(remaining > 0 && remaining <= 30 * 60, `Expected 0–1800s, got ${remaining}`);
  });

  it('returns approximately 1800s when exactly half of 60m cooldown remains', () => {
    const last = new Date(NOW.getTime() - 30 * 60_000);
    const remaining = cooldownRemainingSeconds({ minIntervalMinutes: 60, lastDispatchedAt: last }, NOW);
    assert.ok(remaining >= 1799 && remaining <= 1801, `Expected ~1800, got ${remaining}`);
  });
});

// ── isInCooldown + urgent removal interaction (documented) ────────────────────

describe('cooldown and urgentRemoval logic', () => {
  const NOW = new Date('2026-06-04T12:00:00Z');
  const RECENT = new Date(NOW.getTime() - 10 * 60_000); // 10m ago

  it('isInCooldown returns true for FEEDABLE platform dispatched 10m ago', () => {
    assert.equal(
      isInCooldown({ minIntervalMinutes: 60, lastDispatchedAt: RECENT }, NOW),
      true
    );
  });

  it('urgent removals should bypass cooldown (verified at scheduler level, not here)', () => {
    // isInCooldown has no knowledge of triggerKind — that check lives in runScheduler.
    // This test documents the contract: isInCooldown reports true; caller decides bypass.
    assert.equal(
      isInCooldown({ minIntervalMinutes: 60, lastDispatchedAt: RECENT }, NOW),
      true,
      'isInCooldown itself always checks interval, bypass is caller responsibility'
    );
  });
});

describe('policy coverage — all 18 platforms get a valid mode', () => {
  it('every platform maps to a valid SyncMode via defaultSyncMode', () => {
    const valid = new Set(['REAL_TIME', 'SCHEDULED', 'MANUAL', 'APPROVAL_REQUIRED']);
    for (const p of platformProfiles) {
      const mode = defaultSyncMode(p.integrationClass);
      assert.ok(valid.has(mode), `${p.slug} got invalid mode: ${mode}`);
    }
  });

  it('OWNED platforms get REAL_TIME', () => {
    const owned = platformProfiles.filter(p => p.integrationClass === 'OWNED');
    assert.ok(owned.length >= 1);
    assert.ok(owned.every(p => defaultSyncMode(p.integrationClass) === 'REAL_TIME'));
  });

  it('PARTNER_DEPENDENT platforms get MANUAL', () => {
    const partner = platformProfiles.filter(p => p.integrationClass === 'PARTNER_DEPENDENT');
    assert.ok(partner.length >= 1);
    assert.ok(partner.every(p => defaultSyncMode(p.integrationClass) === 'MANUAL'));
  });
});
