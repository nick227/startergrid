import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isBlockingAccountState,
  isPartnerRequiredAccountState,
  needsSetupAccountState,
  validateAccountUpdatePayload,
  buildSummary,
  computeReadinessScore,
  VALID_ACCOUNT_STATES,
  NEXT_ACTION_OWNERS,
  STATE_BASE_SCORE,
  type AccountUpdatePayload,
  type PlatformAccountDetail,
  type ReadinessScore,
  recordValidationAttempt,
} from '../services/publishing/platformAccountService.js';
import type { PlatformAccountState } from '@prisma/client';
import {
  derivePublishState,
  summarizePublishStates,
  type PublishState,
} from '../services/publishing/prepareAndPublishService.js';
import { platformProfiles } from '../data/platformProfiles.js';

// ── State classification helpers ─────────────────────────────────────────────

describe('isBlockingAccountState', () => {
  it('BLOCKED → true', () => {
    assert.equal(isBlockingAccountState('BLOCKED'), true);
  });
  it('SUSPENDED → true', () => {
    assert.equal(isBlockingAccountState('SUSPENDED'), true);
  });
  it('ACTIVE → false', () => {
    assert.equal(isBlockingAccountState('ACTIVE'), false);
  });
  it('ACCOUNT_NEEDED → false', () => {
    assert.equal(isBlockingAccountState('ACCOUNT_NEEDED'), false);
  });
  it('PARTNER_REQUIRED → false', () => {
    assert.equal(isBlockingAccountState('PARTNER_REQUIRED'), false);
  });
});

describe('isPartnerRequiredAccountState', () => {
  it('PARTNER_REQUIRED → true', () => {
    assert.equal(isPartnerRequiredAccountState('PARTNER_REQUIRED'), true);
  });
  it('BLOCKED → false', () => {
    assert.equal(isPartnerRequiredAccountState('BLOCKED'), false);
  });
  it('ACTIVE → false', () => {
    assert.equal(isPartnerRequiredAccountState('ACTIVE'), false);
  });
});

describe('needsSetupAccountState', () => {
  it('ACCOUNT_NEEDED → true', () => {
    assert.equal(needsSetupAccountState('ACCOUNT_NEEDED'), true);
  });
  it('CREDENTIALS_NEEDED → true', () => {
    assert.equal(needsSetupAccountState('CREDENTIALS_NEEDED'), true);
  });
  it('ACTIVE → false', () => {
    assert.equal(needsSetupAccountState('ACTIVE'), false);
  });
  it('PENDING_REVIEW → false', () => {
    assert.equal(needsSetupAccountState('PENDING_REVIEW'), false);
  });
});

// ── validateAccountUpdatePayload ─────────────────────────────────────────────

describe('validateAccountUpdatePayload', () => {
  it('empty payload is valid', () => {
    assert.equal(validateAccountUpdatePayload({}), null);
  });

  it('valid state is accepted', () => {
    for (const state of VALID_ACCOUNT_STATES) {
      assert.equal(validateAccountUpdatePayload({ state }), null, `state ${state} should be valid`);
    }
  });

  it('invalid state returns error', () => {
    const err = validateAccountUpdatePayload({ state: 'BOGUS_STATE' as any });
    assert.ok(err !== null, 'should return error for bogus state');
    assert.ok(err!.includes('BOGUS_STATE'));
  });

  it('valid nextActionOwner values are accepted', () => {
    for (const owner of NEXT_ACTION_OWNERS) {
      assert.equal(validateAccountUpdatePayload({ nextActionOwner: owner }), null);
    }
  });

  it('invalid nextActionOwner returns error', () => {
    const err = validateAccountUpdatePayload({ nextActionOwner: 'GHOST' });
    assert.ok(err !== null);
    assert.ok(err!.includes('GHOST'));
  });

  it('null nextActionOwner is allowed (clearing the field)', () => {
    assert.equal(validateAccountUpdatePayload({ nextActionOwner: null }), null);
  });

  it('empty nextActionOwner is allowed (clearing the field)', () => {
    assert.equal(validateAccountUpdatePayload({ nextActionOwner: '' }), null);
  });

  it('all valid fields together', () => {
    const payload: AccountUpdatePayload = {
      state: 'ACTIVE',
      notes: 'Account confirmed',
      accountId: 'DEALER-123',
      platformRepName: 'Jane Smith',
      platformRepEmail: 'jane@cars.example.com',
      membershipStatus: 'PREMIUM',
      nextAction: 'Await feed approval',
      nextActionOwner: 'PLATFORM',
    };
    assert.equal(validateAccountUpdatePayload(payload), null);
  });
});

// ── buildSummary ─────────────────────────────────────────────────────────────

describe('buildSummary', () => {
  it('returns zero-filled summary for empty array', () => {
    const s = buildSummary([]);
    assert.equal(s.total, 0);
    assert.equal(s.active, 0);
    assert.equal(s.needsSetup, 0);
    assert.equal(s.pendingReview, 0);
    assert.equal(s.blocked, 0);
    assert.equal(s.partnerRequired, 0);
  });

  it('buildSummary counts active platforms correctly', () => {
    const accounts = [
      { state: 'ACTIVE' as any },
      { state: 'ACTIVE' as any },
      { state: 'ACCOUNT_NEEDED' as any }
    ] as any;
    const s = buildSummary(accounts);
    assert.equal(s.active, 2);
    assert.equal(s.total, 3);
  });

  it('counts needsSetup as ACCOUNT_NEEDED + CREDENTIALS_NEEDED', () => {
    const s = buildSummary([
      { state: 'ACCOUNT_NEEDED' }, { state: 'CREDENTIALS_NEEDED' }, { state: 'ACTIVE' }
    ]);
    assert.equal(s.needsSetup, 2);
    assert.equal(s.active, 1);
  });

  it('counts blocked as BLOCKED + SUSPENDED', () => {
    const s = buildSummary([{ state: 'BLOCKED' }, { state: 'SUSPENDED' }, { state: 'ACTIVE' }]);
    assert.equal(s.blocked, 2);
  });

  it('counts partnerRequired correctly', () => {
    const s = buildSummary([
      { state: 'PARTNER_REQUIRED' }, { state: 'PARTNER_REQUIRED' }, { state: 'ACTIVE' }
    ]);
    assert.equal(s.partnerRequired, 2);
  });

  it('total equals input length', () => {
    const states = VALID_ACCOUNT_STATES.map(s => ({ state: s }));
    const summary = buildSummary(states);
    assert.equal(summary.total, VALID_ACCOUNT_STATES.length);
  });
});

// ── VALID_ACCOUNT_STATES completeness ────────────────────────────────────────

describe('VALID_ACCOUNT_STATES', () => {
  it('contains all 11 expected states', () => {
    const expected = [
      'ACCOUNT_NEEDED', 'CREDENTIALS_NEEDED', 'PENDING_REVIEW',
      'ACTIVE', 'READY', 'BLOCKED', 'FAILED',
      'PARTNER_REQUIRED', 'SUSPENDED', 'NEEDS_INFO', 'WAITING_ON_PARTNER',
    ];
    for (const s of expected) {
      assert.ok(VALID_ACCOUNT_STATES.includes(s as any), `missing state: ${s}`);
    }
    assert.equal(VALID_ACCOUNT_STATES.length, expected.length);
  });
});

// ── PlatformAccountDetail shape ───────────────────────────────────────────────

describe('PlatformAccountDetail shape', () => {
  const fixture: PlatformAccountDetail = {
    id:               'acct-1',
    platformSlug:     'autotrader-cox',
    platformName:     'AutoTrader',
    integrationClass: 'PARTNER_DEPENDENT',
    state:            'ACCOUNT_NEEDED',
    accountId:        null,
    platformRepName:  null,
    platformRepEmail: null,
    membershipStatus: null,
    nextAction:       null,
    nextActionOwner:  null,
    notes:            null,
    lastChecked:      null,
    createdAt:        new Date().toISOString(),
    updatedAt:        new Date().toISOString(),
    readinessScore:   10,
    lastValidationStatus: null,
    lastValidationNote: null,
    lastValidatedAt: null,
    highestConfirmedLevel: null,
    oauthProvider:    null,
    oauthConnected:   false,
    oauthExpired:     false,
    tier:             null,
    partnerSignup:    null,
    socialPosting:    false,
    catalogSync:      false,
    marketplaceListing: false,
    partnerFeed:      false,
    leadSync:         false,
    connectionType:   null,
    integrationMaturity: null,
    liveValidationNote: null,
    integrationUrls: null,
    requirementsConfidence: null,
    sourceNote: null,
    requiredDealershipFields: [],
    requiredVehicleFields: [],
    profileConfidence: null,
    connectionConfig: null,
  };

  it('has all required fields', () => {
    assert.equal(typeof fixture.id, 'string');
    assert.equal(typeof fixture.platformSlug, 'string');
    assert.equal(typeof fixture.platformName, 'string');
    assert.equal(typeof fixture.integrationClass, 'string');
    assert.equal(typeof fixture.state, 'string');
    assert.equal(typeof fixture.createdAt, 'string');
    assert.equal(typeof fixture.updatedAt, 'string');
  });

  it('nullable metadata fields default to null', () => {
    assert.equal(fixture.accountId, null);
    assert.equal(fixture.platformRepName, null);
    assert.equal(fixture.platformRepEmail, null);
    assert.equal(fixture.membershipStatus, null);
    assert.equal(fixture.nextAction, null);
    assert.equal(fixture.nextActionOwner, null);
    assert.equal(fixture.notes, null);
    assert.equal(fixture.lastChecked, null);
  });
});

// ── derivePublishState with accountState ─────────────────────────────────────

describe('derivePublishState accounts integration', () => {
  const google = platformProfiles.find(p => p.slug === 'google-vehicle-ads')!;

  it('BLOCKED accountState → Blocked (overrides GREEN readiness)', () => {
    const state = derivePublishState({
      platform: google,
      readiness: 'GREEN',
      applicationStatus: 'ACTIVE',
      latestQueueItemStatus: null,
      hasSubmissionAttempt: false,
      accountState: 'BLOCKED',
    });
    assert.equal(state, 'Blocked');
  });

  it('SUSPENDED accountState → Blocked', () => {
    const state = derivePublishState({
      platform: google,
      readiness: 'GREEN',
      applicationStatus: 'ACTIVE',
      latestQueueItemStatus: null,
      hasSubmissionAttempt: false,
      accountState: 'SUSPENDED',
    });
    assert.equal(state, 'Blocked');
  });

  it('PARTNER_REQUIRED accountState → Partner Required', () => {
    const state = derivePublishState({
      platform: google,
      readiness: 'GREEN',
      applicationStatus: null,
      latestQueueItemStatus: null,
      hasSubmissionAttempt: false,
      accountState: 'PARTNER_REQUIRED',
    });
    assert.equal(state, 'Partner Required');
  });

  it('ACTIVE accountState does not interfere with existing logic → Active for ACTIVE app', () => {
    const state = derivePublishState({
      platform: google,
      readiness: 'GREEN',
      applicationStatus: 'ACTIVE',
      latestQueueItemStatus: null,
      hasSubmissionAttempt: false,
      accountState: 'ACTIVE',
    });
    assert.equal(state, 'Active');
  });

  it('null accountState → existing logic unchanged', () => {
    const state = derivePublishState({
      platform: google,
      readiness: 'GREEN',
      applicationStatus: 'ACTIVE',
      latestQueueItemStatus: null,
      hasSubmissionAttempt: false,
      accountState: null,
    });
    assert.equal(state, 'Active');
  });

  it('ACCOUNT_NEEDED accountState does not block (unenforced default state)', () => {
    const state = derivePublishState({
      platform: google,
      readiness: 'GREEN',
      applicationStatus: 'ACTIVE',
      latestQueueItemStatus: null,
      hasSubmissionAttempt: false,
      accountState: 'ACCOUNT_NEEDED',
    });
    assert.equal(state, 'Active');
  });

  it('all account states yield a known PublishState', () => {
    const knownStates: PublishState[] = [
      'Active', 'Ready', 'Scheduled', 'Needs Approval',
      'Blocked', 'Packet Prepared', 'Partner Required', 'Failed'
    ];
    for (const accountState of VALID_ACCOUNT_STATES) {
      const state = derivePublishState({
        platform: google,
        readiness: 'GREEN',
        applicationStatus: null,
        latestQueueItemStatus: null,
        hasSubmissionAttempt: false,
        accountState,
      });
      assert.ok(knownStates.includes(state), `unexpected state "${state}" for accountState "${accountState}"`);
    }
  });
});

// ── AccountStateSummary totals ────────────────────────────────────────────────

describe('buildSummary totals', () => {
  it('active + needsSetup + pendingReview + blocked + partnerRequired ≤ total', () => {
    const states = [
      { state: 'ACTIVE' },
      { state: 'ACCOUNT_NEEDED' },
      { state: 'CREDENTIALS_NEEDED' },
      { state: 'PENDING_REVIEW' },
      { state: 'BLOCKED' },
      { state: 'SUSPENDED' },
      { state: 'PARTNER_REQUIRED' },
    ];
    const s = buildSummary(states as any);
    const classified = s.active + s.needsSetup + s.pendingReview + s.blocked + s.partnerRequired;
    assert.equal(classified, s.total);
  });
});

// ── computeReadinessScore ─────────────────────────────────────────────────────

type ScoreInput = Parameters<typeof computeReadinessScore>[0];

function emptyAccount(overrides: Partial<ScoreInput> = {}): ScoreInput {
  return {
    state:            'ACCOUNT_NEEDED',
    accountId:        null,
    platformRepName:  null,
    platformRepEmail: null,
    nextAction:       null,
    membershipStatus: null,
    ...overrides,
  };
}

describe('computeReadinessScore — state base scores', () => {
  it('ACTIVE base score is 60', () => {
    const { score } = computeReadinessScore(emptyAccount({ state: 'ACTIVE' }));
    assert.equal(score, 60);
  });
  it('PENDING_REVIEW base is 40', () => {
    const { score } = computeReadinessScore(emptyAccount({ state: 'PENDING_REVIEW' }));
    assert.equal(score, 40);
  });
  it('CREDENTIALS_NEEDED base is 25', () => {
    const { score } = computeReadinessScore(emptyAccount({ state: 'CREDENTIALS_NEEDED' }));
    assert.equal(score, 25);
  });
  it('ACCOUNT_NEEDED base is 10', () => {
    const { score } = computeReadinessScore(emptyAccount({ state: 'ACCOUNT_NEEDED' }));
    assert.equal(score, 10);
  });
  it('PARTNER_REQUIRED base is 15', () => {
    const { score } = computeReadinessScore(emptyAccount({ state: 'PARTNER_REQUIRED' }));
    assert.equal(score, 15);
  });
  it('BLOCKED base is 0', () => {
    const { score } = computeReadinessScore(emptyAccount({ state: 'BLOCKED' }));
    assert.equal(score, 0);
  });
  it('SUSPENDED base is 0', () => {
    const { score } = computeReadinessScore(emptyAccount({ state: 'SUSPENDED' }));
    assert.equal(score, 0);
  });
});

describe('computeReadinessScore — field bonuses', () => {
  it('accountId adds 10 points', () => {
    const without = computeReadinessScore(emptyAccount({ state: 'ACTIVE' })).score;
    const with_   = computeReadinessScore(emptyAccount({ state: 'ACTIVE', accountId: 'D-999' })).score;
    assert.equal(with_ - without, 10);
  });

  it('platformRepName adds 10 points', () => {
    const without = computeReadinessScore(emptyAccount({ state: 'ACTIVE' })).score;
    const with_   = computeReadinessScore(emptyAccount({ state: 'ACTIVE', platformRepName: 'Jane' })).score;
    assert.equal(with_ - without, 10);
  });

  it('platformRepEmail adds 10 points (same slot as repName)', () => {
    const without = computeReadinessScore(emptyAccount({ state: 'ACTIVE' })).score;
    const with_   = computeReadinessScore(emptyAccount({ state: 'ACTIVE', platformRepEmail: 'j@ex.com' })).score;
    assert.equal(with_ - without, 10);
  });

  it('repName + repEmail only counts once (same slot)', () => {
    const both  = computeReadinessScore(emptyAccount({ state: 'ACTIVE', platformRepName: 'Jane', platformRepEmail: 'j@ex.com' })).score;
    const email = computeReadinessScore(emptyAccount({ state: 'ACTIVE', platformRepEmail: 'j@ex.com' })).score;
    assert.equal(both, email);
  });

  it('nextAction adds 10 points', () => {
    const without = computeReadinessScore(emptyAccount({ state: 'ACTIVE' })).score;
    const with_   = computeReadinessScore(emptyAccount({ state: 'ACTIVE', nextAction: 'Submit feed URL' })).score;
    assert.equal(with_ - without, 10);
  });

  it('membershipStatus adds 10 points', () => {
    const without = computeReadinessScore(emptyAccount({ state: 'ACTIVE' })).score;
    const with_   = computeReadinessScore(emptyAccount({ state: 'ACTIVE', membershipStatus: 'PREMIUM' })).score;
    assert.equal(with_ - without, 10);
  });

  it('fully populated ACTIVE account reaches 100', () => {
    const { score, issues } = computeReadinessScore({
      state: 'ACTIVE',
      accountId: 'D-999',
      platformRepName: 'Jane',
      platformRepEmail: 'j@ex.com',
      nextAction: 'Monitor feed',
      membershipStatus: 'PREMIUM',
    });
    assert.equal(score, 100);
    assert.equal(issues.length, 0);
  });

  it('score is capped at 100', () => {
    const { score } = computeReadinessScore({
      state: 'ACTIVE',
      accountId: 'D-999',
      platformRepName: 'Jane',
      platformRepEmail: 'j@ex.com',
      nextAction: 'Monitor',
      membershipStatus: 'PREMIUM',
    });
    assert.ok(score <= 100);
  });
});

describe('computeReadinessScore — missing fields', () => {
  it('empty ACTIVE account reports 4 missing fields', () => {
    const { issues } = computeReadinessScore(emptyAccount({ state: 'ACTIVE' }));
    assert.equal(issues.length, 4);
  });

  it('missing includes Account ID when not set', () => {
    const { issues } = computeReadinessScore(emptyAccount({ state: 'ACTIVE' }));
    assert.ok(issues.some(i => i.includes('Account ID')));
  });

  it('missing includes Platform rep contact when neither name nor email set', () => {
    const { issues } = computeReadinessScore(emptyAccount({ state: 'ACTIVE' }));
    assert.ok(issues.some(i => i.includes('Partner Contact')));
  });

  it('missing does not include rep when email only is set', () => {
    const { issues } = computeReadinessScore(emptyAccount({ state: 'ACTIVE', platformRepEmail: 'r@ex.com' }));
    assert.ok(!issues.some(i => i.includes('Partner Contact')));
  });

  it('score 0 and missing all fields for BLOCKED with no fields', () => {
    const { score, issues } = computeReadinessScore(emptyAccount({ state: 'BLOCKED' }));
    assert.equal(score, 0);
    assert.equal(issues.length, 4);
  });
});

describe('STATE_BASE_SCORE covers all VALID_ACCOUNT_STATES', () => {
  it('every valid state has a defined base score', () => {
    for (const state of VALID_ACCOUNT_STATES) {
      assert.ok(state in STATE_BASE_SCORE, `STATE_BASE_SCORE missing entry for: ${state}`);
      assert.equal(typeof STATE_BASE_SCORE[state], 'number');
    }
  });
  it('all base scores are between 0 and 100', () => {
    for (const [state, score] of Object.entries(STATE_BASE_SCORE)) {
      assert.ok(score >= 0 && score <= 100, `${state} score ${score} out of range`);
    }
  });
});

// -- recordValidationAttempt ---------------------------------------------------

describe('recordValidationAttempt', () => {
  it('stub success -> READY + CONNECTION_TESTED', async () => {
    const prismaMock = {
      platformAccount: {
        update: async (args: any) => {
          assert.equal(args.data.state, 'READY');
          assert.equal(args.data.highestConfirmedLevel, 'CONNECTION_TESTED');
          assert.equal(args.data.lastValidationStatus, 'SUCCESS');
          assert.equal(args.data.lastValidationNote, null);
          return {};
        }
      },
      adminAuditLog: {
        create: async (args: any) => {
          assert.equal(args.data.action, 'PARTNER_CONNECTION_VALIDATED');
          assert.equal(args.data.detail.success, true);
          assert.equal(args.data.detail.code, 'SUCCESS');
        }
      }
    };

    await recordValidationAttempt(
      prismaMock as any,
      'dealer-1',
      'platform-1',
      true,
      undefined,
      'SUCCESS',
      150,
      { id: 'actor-1', email: 'test@example.com' }
    );
  });

  it('timeout/auth/unreachable -> FAILED + safe reason', async () => {
    const prismaMock = {
      platformAccount: {
        update: async (args: any) => {
          assert.equal(args.data.state, 'FAILED');
          assert.equal(args.data.highestConfirmedLevel, undefined);
          assert.equal(args.data.lastValidationStatus, 'AUTH_FAILED');
          assert.equal(args.data.lastValidationNote, 'Invalid credentials');
          return {};
        }
      },
      adminAuditLog: {
        create: async (args: any) => {
          assert.equal(args.data.action, 'PARTNER_CONNECTION_VALIDATED');
          assert.equal(args.data.detail.success, false);
          assert.equal(args.data.detail.code, 'AUTH_FAILED');
          assert.equal(args.data.detail.safeReason, 'Invalid credentials');
        }
      }
    };

    await recordValidationAttempt(
      prismaMock as any,
      'dealer-1',
      'platform-1',
      false,
      'Invalid credentials',
      'AUTH_FAILED',
      150,
      { id: 'actor-1', email: 'test@example.com' }
    );
  });
});
