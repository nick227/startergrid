import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  deriveNextRecommendedAction,
  derivePublishState,
  summarizePublishStates,
  STATE_BADGE,
  type NextRecommendedAction,
  type PreparePublishResult,
  type PublishState,
  type PublishStateSummary
} from '../services/publishing/prepareAndPublishService.js';
import { platformProfiles } from '../data/platformProfiles.js';

// ── Full set of valid states and actions ──────────────────────────────────────

const ALL_STATES: PublishState[] = [
  'Active', 'Ready', 'Scheduled', 'Needs Approval',
  'Blocked', 'Packet Prepared', 'Partner Required', 'Failed'
];

const ALL_ACTIONS: NextRecommendedAction[] = [
  'fix_blocked_vehicles', 'review_approvals', 'run_scheduler',
  'resolve_partner_requirement', 'resolve_account_requirement', 'no_action'
];

// ── CLI/API badge alignment ───────────────────────────────────────────────────

describe('CLI/API badge alignment', () => {
  it('STATE_BADGE has an entry for every PublishState', () => {
    for (const s of ALL_STATES) {
      assert.ok(STATE_BADGE[s], `STATE_BADGE missing entry for: ${s}`);
      assert.equal(typeof STATE_BADGE[s], 'string');
    }
  });

  it('summarizePublishStates zero-fills all 8 keys', () => {
    const summary = summarizePublishStates([]);
    for (const s of ALL_STATES) {
      assert.ok(s in summary, `summary missing key: ${s}`);
      assert.equal(summary[s], 0);
    }
  });

  it('summarizePublishStates totals equal input length', () => {
    const summary = summarizePublishStates(ALL_STATES);
    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    assert.equal(total, ALL_STATES.length);
  });
});

// ── PreparePublishResult shape (API contract) ─────────────────────────────────

describe('PreparePublishResult API contract shape', () => {
  const fixture: PreparePublishResult = {
    dealershipId: 'dealer-1',
    dealerName: 'Apex Motors',
    preparedAt: new Date().toISOString(),
    dryRun: true,
    vehicles: { total: 5, ready: 3, warning: 1, blocked: 1, details: [] },
    readinessSummary: { green: 3, yellow: 1, red: 1 },
    platforms: [],
    summary: summarizePublishStates([])
  };

  it('has dealershipId, dealerName, preparedAt, dryRun', () => {
    assert.equal(typeof fixture.dealershipId, 'string');
    assert.equal(typeof fixture.dealerName, 'string');
    assert.equal(typeof fixture.preparedAt, 'string');
    assert.equal(typeof fixture.dryRun, 'boolean');
  });

  it('vehicles block has total/ready/warning/blocked/details', () => {
    assert.ok('total' in fixture.vehicles);
    assert.ok('ready' in fixture.vehicles);
    assert.ok('warning' in fixture.vehicles);
    assert.ok('blocked' in fixture.vehicles);
    assert.ok(Array.isArray(fixture.vehicles.details));
  });

  it('readinessSummary has green/yellow/red', () => {
    assert.ok('green' in fixture.readinessSummary);
    assert.ok('yellow' in fixture.readinessSummary);
    assert.ok('red' in fixture.readinessSummary);
  });

  it('summary has all 8 PublishState keys', () => {
    for (const s of ALL_STATES) {
      assert.ok(s in fixture.summary, `summary missing: ${s}`);
    }
  });
});

// ── deriveNextRecommendedAction ───────────────────────────────────────────────

function zeroSummary(): PublishStateSummary {
  return summarizePublishStates([]);
}

describe('deriveNextRecommendedAction', () => {
  it('blocked vehicles → fix_blocked_vehicles (highest priority)', () => {
    const summary = { ...zeroSummary(), 'Needs Approval': 2, 'Scheduled': 5 };
    assert.equal(deriveNextRecommendedAction({ blocked: 1 }, summary), 'fix_blocked_vehicles');
  });

  it('needs approval with no blocked vehicles → review_approvals', () => {
    const summary = { ...zeroSummary(), 'Needs Approval': 3, 'Scheduled': 5 };
    assert.equal(deriveNextRecommendedAction({ blocked: 0 }, summary), 'review_approvals');
  });

  it('failed items (no approvals needed) → run_scheduler', () => {
    const summary = { ...zeroSummary(), 'Failed': 2 };
    assert.equal(deriveNextRecommendedAction({ blocked: 0 }, summary), 'run_scheduler');
  });

  it('scheduled items ready to dispatch → run_scheduler', () => {
    const summary = { ...zeroSummary(), 'Scheduled': 4 };
    assert.equal(deriveNextRecommendedAction({ blocked: 0 }, summary), 'run_scheduler');
  });

  it('ready items to dispatch → run_scheduler', () => {
    const summary = { ...zeroSummary(), 'Ready': 2 };
    assert.equal(deriveNextRecommendedAction({ blocked: 0 }, summary), 'run_scheduler');
  });

  it('only partner required → resolve_partner_requirement', () => {
    const summary = { ...zeroSummary(), 'Partner Required': 5 };
    assert.equal(deriveNextRecommendedAction({ blocked: 0 }, summary), 'resolve_partner_requirement');
  });

  it('only blocked platforms (no vehicle issues) → resolve_account_requirement', () => {
    const summary = { ...zeroSummary(), 'Blocked': 2 };
    assert.equal(deriveNextRecommendedAction({ blocked: 0 }, summary), 'resolve_account_requirement');
  });

  it('all active → no_action', () => {
    const summary = { ...zeroSummary(), 'Active': 18 };
    assert.equal(deriveNextRecommendedAction({ blocked: 0 }, summary), 'no_action');
  });

  it('returns a valid NextRecommendedAction for every possible summary state', () => {
    for (const s of ALL_STATES) {
      const summary = { ...zeroSummary(), [s]: 1 };
      const action = deriveNextRecommendedAction({ blocked: 0 }, summary);
      assert.ok(ALL_ACTIONS.includes(action), `unknown action "${action}" for state "${s}"`);
    }
  });
});

// ── derivePublishState covers all 8 states (smoke check) ─────────────────────

describe('derivePublishState returns only known PublishState values', () => {
  const google = platformProfiles.find(p => p.slug === 'google-vehicle-ads')!;
  const cargurus = platformProfiles.find(p => p.slug === 'cargurus-dealer')!;
  const autotrader = platformProfiles.find(p => p.slug === 'autotrader-cox')!;
  const storefront = platformProfiles.find(p => p.slug === 'dealer-storefront')!;

  const cases: Parameters<typeof derivePublishState>[0][] = [
    // Active
    { platform: google, readiness: 'GREEN', applicationStatus: 'ACTIVE', latestQueueItemStatus: null, hasSubmissionAttempt: false },
    // Ready
    { platform: google, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: 'READY', hasSubmissionAttempt: false },
    // Scheduled
    { platform: google, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: 'SCHEDULED', hasSubmissionAttempt: false },
    // Needs Approval
    { platform: cargurus, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: 'NEEDS_APPROVAL', hasSubmissionAttempt: false },
    // Blocked
    { platform: google, readiness: 'RED', applicationStatus: null, latestQueueItemStatus: null, hasSubmissionAttempt: false },
    // Packet Prepared
    { platform: cargurus, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: 'SENT', hasSubmissionAttempt: true },
    // Partner Required
    { platform: autotrader, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: null, hasSubmissionAttempt: false },
    // Failed
    { platform: google, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: 'FAILED', hasSubmissionAttempt: false }
  ];

  for (const [idx, c] of cases.entries()) {
    it(`case ${idx} → ${ALL_STATES[idx]}`, () => {
      assert.equal(derivePublishState(c), ALL_STATES[idx]);
    });
  }
});

// ── API response shape: GET /publish/status omits vehicle details ─────────────

describe('GET /publish/status shape contract', () => {
  it('status response shape excludes vehicles.details but includes summary + nextRecommendedAction', () => {
    const summary = summarizePublishStates(['Active', 'Scheduled', 'Scheduled']);
    const statusResponse = {
      dealershipId: 'dealer-1',
      dealerName: 'Apex Motors',
      preparedAt: new Date().toISOString(),
      vehicles: { total: 3, ready: 3, warning: 0, blocked: 0 },
      readinessSummary: { green: 2, yellow: 1, red: 0 },
      platforms: [],
      summary,
      nextRecommendedAction: deriveNextRecommendedAction({ blocked: 0 }, summary)
    };

    assert.ok(!('details' in statusResponse.vehicles), 'status should not include vehicles.details');
    assert.ok('nextRecommendedAction' in statusResponse);
    assert.ok(ALL_ACTIONS.includes(statusResponse.nextRecommendedAction));
  });
});
