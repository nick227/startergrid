import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  derivePublishState,
  needsInitialQueueItem,
  summarizePublishStates,
  classifyVehicleReadiness,
  type PublishState
} from '../services/prepareAndPublishService.js';
import { platformProfiles } from '../data/platformProfiles.js';
import type { ValidationIssue, VehiclePayload } from '../lib/types.js';

const google    = platformProfiles.find(p => p.slug === 'google-vehicle-ads')!;
const storefront = platformProfiles.find(p => p.slug === 'dealer-storefront')!;
const cargurus  = platformProfiles.find(p => p.slug === 'cargurus-dealer')!;
const autotrader = platformProfiles.find(p => p.slug === 'autotrader-cox')!;

// ── derivePublishState ────────────────────────────────────────────────────────

describe('derivePublishState — application-level states', () => {
  it('ACTIVE application → Active regardless of queue', () => {
    const state = derivePublishState({ platform: google, readiness: 'GREEN', applicationStatus: 'ACTIVE', latestQueueItemStatus: null, hasSubmissionAttempt: false });
    assert.equal(state, 'Active');
  });

  it('PARTNER_REQUIRED application → Partner Required', () => {
    const state = derivePublishState({ platform: google, readiness: 'GREEN', applicationStatus: 'PARTNER_REQUIRED', latestQueueItemStatus: null, hasSubmissionAttempt: false });
    assert.equal(state, 'Partner Required');
  });

  it('PARTNER_DEPENDENT platform → Partner Required regardless of app status', () => {
    const state = derivePublishState({ platform: autotrader, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: null, hasSubmissionAttempt: false });
    assert.equal(state, 'Partner Required');
  });
});

describe('derivePublishState — queue item states', () => {
  it('READY queue item → Ready', () => {
    const state = derivePublishState({ platform: google, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: 'READY', hasSubmissionAttempt: false });
    assert.equal(state, 'Ready');
  });

  it('CLAIMED queue item → Ready (in-flight counts as ready)', () => {
    const state = derivePublishState({ platform: google, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: 'CLAIMED', hasSubmissionAttempt: false });
    assert.equal(state, 'Ready');
  });

  it('SCHEDULED queue item → Scheduled', () => {
    const state = derivePublishState({ platform: google, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: 'SCHEDULED', hasSubmissionAttempt: false });
    assert.equal(state, 'Scheduled');
  });

  it('NEEDS_APPROVAL queue item → Needs Approval', () => {
    const state = derivePublishState({ platform: cargurus, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: 'NEEDS_APPROVAL', hasSubmissionAttempt: false });
    assert.equal(state, 'Needs Approval');
  });

  it('HELD queue item → Needs Approval', () => {
    const state = derivePublishState({ platform: cargurus, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: 'HELD', hasSubmissionAttempt: false });
    assert.equal(state, 'Needs Approval');
  });

  it('BLOCKED queue item → Blocked', () => {
    const state = derivePublishState({ platform: google, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: 'BLOCKED', hasSubmissionAttempt: false });
    assert.equal(state, 'Blocked');
  });

  it('FAILED queue item → Failed', () => {
    const state = derivePublishState({ platform: google, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: 'FAILED', hasSubmissionAttempt: false });
    assert.equal(state, 'Failed');
  });

  it('SENT queue item for ASSISTED → Packet Prepared', () => {
    const state = derivePublishState({ platform: cargurus, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: 'SENT', hasSubmissionAttempt: true });
    assert.equal(state, 'Packet Prepared');
  });

  it('SENT queue item for FEEDABLE → Ready', () => {
    const state = derivePublishState({ platform: google, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: 'SENT', hasSubmissionAttempt: false });
    assert.equal(state, 'Ready');
  });
});

describe('derivePublishState — readiness fallback (no queue item)', () => {
  it('RED readiness → Blocked', () => {
    const state = derivePublishState({ platform: google, readiness: 'RED', applicationStatus: null, latestQueueItemStatus: null, hasSubmissionAttempt: false });
    assert.equal(state, 'Blocked');
  });

  it('FEEDABLE with no queue item → Scheduled (default batch)', () => {
    const state = derivePublishState({ platform: google, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: null, hasSubmissionAttempt: false });
    assert.equal(state, 'Scheduled');
  });

  it('ASSISTED with submission attempt → Packet Prepared', () => {
    const state = derivePublishState({ platform: cargurus, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: null, hasSubmissionAttempt: true });
    assert.equal(state, 'Packet Prepared');
  });

  it('ASSISTED without submission → Needs Approval', () => {
    const state = derivePublishState({ platform: cargurus, readiness: 'GREEN', applicationStatus: 'SUBMITTED', latestQueueItemStatus: null, hasSubmissionAttempt: false });
    assert.equal(state, 'Needs Approval');
  });

  it('OWNED with null app → Ready', () => {
    const state = derivePublishState({ platform: storefront, readiness: 'GREEN', applicationStatus: null, latestQueueItemStatus: null, hasSubmissionAttempt: false });
    assert.equal(state, 'Ready');
  });
});

// ── needsInitialQueueItem ─────────────────────────────────────────────────────

describe('needsInitialQueueItem', () => {
  it('FEEDABLE SUBMITTED with no active queue → needs item', () => {
    assert.ok(needsInitialQueueItem({ integrationClass: 'FEEDABLE', applicationStatus: 'SUBMITTED', activeQueueItemStatus: null }));
  });

  it('FEEDABLE SUBMITTED with existing SCHEDULED item → no new item', () => {
    assert.ok(!needsInitialQueueItem({ integrationClass: 'FEEDABLE', applicationStatus: 'SUBMITTED', activeQueueItemStatus: 'SCHEDULED' }));
  });

  it('FEEDABLE SUBMITTED with existing READY item → no new item', () => {
    assert.ok(!needsInitialQueueItem({ integrationClass: 'FEEDABLE', applicationStatus: 'SUBMITTED', activeQueueItemStatus: 'READY' }));
  });

  it('FEEDABLE SUBMITTED with only CANCELLED item → needs item', () => {
    assert.ok(needsInitialQueueItem({ integrationClass: 'FEEDABLE', applicationStatus: 'SUBMITTED', activeQueueItemStatus: 'CANCELLED' }));
  });

  it('OWNED → never needs initial item', () => {
    assert.ok(!needsInitialQueueItem({ integrationClass: 'OWNED', applicationStatus: 'ACTIVE', activeQueueItemStatus: null }));
  });

  it('ASSISTED → managed by activateApplicationAfterCreate', () => {
    assert.ok(!needsInitialQueueItem({ integrationClass: 'ASSISTED', applicationStatus: 'SUBMITTED', activeQueueItemStatus: null }));
  });

  it('PARTNER_DEPENDENT → never needs initial item', () => {
    assert.ok(!needsInitialQueueItem({ integrationClass: 'PARTNER_DEPENDENT', applicationStatus: null, activeQueueItemStatus: null }));
  });
});

// ── summarizePublishStates ────────────────────────────────────────────────────

describe('summarizePublishStates', () => {
  it('counts each state correctly', () => {
    const states: PublishState[] = ['Active', 'Ready', 'Ready', 'Scheduled', 'Needs Approval', 'Partner Required', 'Partner Required'];
    const summary = summarizePublishStates(states);
    assert.equal(summary['Active'], 1);
    assert.equal(summary['Ready'], 2);
    assert.equal(summary['Scheduled'], 1);
    assert.equal(summary['Needs Approval'], 1);
    assert.equal(summary['Partner Required'], 2);
    assert.equal(summary['Blocked'], 0);
    assert.equal(summary['Packet Prepared'], 0);
    assert.equal(summary['Failed'], 0);
  });

  it('total of all states equals input length', () => {
    const states: PublishState[] = ['Active', 'Ready', 'Scheduled', 'Needs Approval', 'Blocked', 'Packet Prepared', 'Partner Required', 'Failed'];
    const summary = summarizePublishStates(states);
    const total = Object.values(summary).reduce((a, b) => a + b, 0);
    assert.equal(total, states.length);
  });
});

// ── classifyVehicleReadiness ──────────────────────────────────────────────────

describe('classifyVehicleReadiness', () => {
  const baseVehicle: VehiclePayload = {
    stockNumber: 'TEST-001', vin: '1HGCV1F30JA000001', year: 2021, make: 'Honda', model: 'Accord',
    trim: null, mileage: 10000, priceCents: 2000000, condition: 'USED', exteriorColor: 'White'
  };

  it('no issues → ready', () => {
    const result = classifyVehicleReadiness(baseVehicle, []);
    assert.equal(result.label, 'ready');
    assert.equal(result.issues.length, 0);
  });

  it('FAIL issue for this vehicle → blocked', () => {
    const issues: ValidationIssue[] = [
      { path: `vehicles.TEST-001.vin`, message: 'Invalid VIN', severity: 'FAIL', code: 'INVALID_VIN' }
    ];
    const result = classifyVehicleReadiness(baseVehicle, issues);
    assert.equal(result.label, 'blocked');
  });

  it('WARN issue for this vehicle → warning', () => {
    const issues: ValidationIssue[] = [
      { path: `vehicles.TEST-001.priceCents`, message: 'Low price', severity: 'WARN', code: 'PRICE_SUSPICIOUS' }
    ];
    const result = classifyVehicleReadiness(baseVehicle, issues);
    assert.equal(result.label, 'warning');
  });

  it('issues for a different vehicle do not affect this one', () => {
    const issues: ValidationIssue[] = [
      { path: `vehicles.OTHER-001.vin`, message: 'Invalid VIN', severity: 'FAIL', code: 'INVALID_VIN' }
    ];
    const result = classifyVehicleReadiness(baseVehicle, issues);
    assert.equal(result.label, 'ready');
  });

  it('FAIL overrides WARN → blocked', () => {
    const issues: ValidationIssue[] = [
      { path: `vehicles.TEST-001.priceCents`, message: 'Low price', severity: 'WARN' },
      { path: `vehicles.TEST-001.vin`, message: 'Invalid VIN', severity: 'FAIL' }
    ];
    const result = classifyVehicleReadiness(baseVehicle, issues);
    assert.equal(result.label, 'blocked');
  });
});

// ── All 18 platforms produce valid states in default scenario ─────────────────

describe('all 18 platforms derive a valid state', () => {
  it('GREEN readiness, SUBMITTED app, no queue → valid state for every platform', () => {
    const validStates: Set<PublishState> = new Set([
      'Active', 'Ready', 'Scheduled', 'Needs Approval', 'Blocked', 'Packet Prepared', 'Partner Required', 'Failed'
    ]);
    for (const p of platformProfiles) {
      const state = derivePublishState({
        platform: p,
        readiness: 'GREEN',
        applicationStatus: 'SUBMITTED',
        latestQueueItemStatus: null,
        hasSubmissionAttempt: p.integrationClass === 'ASSISTED'
      });
      assert.ok(validStates.has(state), `${p.slug} got invalid state: ${state}`);
    }
  });
});
