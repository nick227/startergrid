import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { platformProfiles } from '../data/platformProfiles.js';
import { mockPortalResponses, getMockPortalResponse } from '../data/mockPortalResponses.js';
import {
  simulatePortalInteraction,
  runPortalLifecycle,
  HAPPY_PATH_FEED,
  HAPPY_PATH_ASSISTED,
  HAPPY_PATH_ADF
} from '../services/partnerPortalService.js';
import type { MockPortalCondition } from '../lib/types.js';

const REQUIRED_CONDITIONS: MockPortalCondition[] = ['PORTAL_ACCEPTED', 'PORTAL_REJECTED', 'PORTAL_NEEDS_INFO', 'PORTAL_ERROR'];

describe('mock portal response coverage', () => {
  it('every platform has the four required conditions', () => {
    const missing: string[] = [];
    for (const profile of platformProfiles) {
      for (const condition of REQUIRED_CONDITIONS) {
        if (!getMockPortalResponse(profile.slug, condition)) {
          missing.push(`${profile.slug}/${condition}`);
        }
      }
    }
    assert.deepEqual(missing, []);
  });

  it('returns undefined for an unknown platform slug', () => {
    assert.equal(getMockPortalResponse('unknown-platform', 'PORTAL_ACCEPTED'), undefined);
  });

  it('returns undefined for a condition not registered on a platform', () => {
    assert.equal(getMockPortalResponse('adf-xml-lead-routing', 'FEED_LIVE'), undefined);
  });
});

describe('simulatePortalInteraction — status transitions', () => {
  it('PORTAL_ACCEPTED transitions to PLATFORM_REVIEWING for marketplace platforms', () => {
    const marketplaces = platformProfiles.filter(p => p.kind === 'MARKETPLACE');
    for (const platform of marketplaces) {
      const result = simulatePortalInteraction(platform, 'PORTAL_ACCEPTED');
      assert.equal(result.toStatus, 'PLATFORM_REVIEWING', `${platform.slug} expected PLATFORM_REVIEWING`);
    }
  });

  it('PORTAL_ACCEPTED transitions directly to ACTIVE for ADF/XML lead routing', () => {
    const adf = platformProfiles.find(p => p.slug === 'adf-xml-lead-routing')!;
    const result = simulatePortalInteraction(adf, 'PORTAL_ACCEPTED');
    assert.equal(result.toStatus, 'ACTIVE');
  });

  it('PORTAL_REJECTED transitions to REJECTED for all platforms', () => {
    for (const platform of platformProfiles) {
      const result = simulatePortalInteraction(platform, 'PORTAL_REJECTED');
      assert.equal(result.toStatus, 'REJECTED', `${platform.slug} expected REJECTED`);
    }
  });

  it('PORTAL_NEEDS_INFO transitions to DEALER_ACTION_NEEDED for all platforms', () => {
    for (const platform of platformProfiles) {
      const result = simulatePortalInteraction(platform, 'PORTAL_NEEDS_INFO');
      assert.equal(result.toStatus, 'DEALER_ACTION_NEEDED', `${platform.slug} expected DEALER_ACTION_NEEDED`);
    }
  });

  it('PORTAL_ERROR keeps status at SUBMITTED for all platforms', () => {
    for (const platform of platformProfiles) {
      const result = simulatePortalInteraction(platform, 'PORTAL_ERROR', 'SUBMITTED');
      assert.equal(result.toStatus, 'SUBMITTED', `${platform.slug} expected SUBMITTED after error`);
    }
  });

  it('carries the dealerAction from the mock response', () => {
    const cargurus = platformProfiles.find(p => p.slug === 'cargurus-dealer')!;
    const result = simulatePortalInteraction(cargurus, 'PORTAL_NEEDS_INFO');
    assert.ok(result.dealerAction !== null && result.dealerAction.length > 0);
  });

  it('dealerAction is null for non-blocking outcomes', () => {
    const google = platformProfiles.find(p => p.slug === 'google-vehicle-ads')!;
    const result = simulatePortalInteraction(google, 'PORTAL_ACCEPTED');
    assert.equal(result.dealerAction, null);
  });

  it('throws for an unregistered condition on a platform', () => {
    const adf = platformProfiles.find(p => p.slug === 'adf-xml-lead-routing')!;
    assert.throws(
      () => simulatePortalInteraction(adf, 'FEED_LIVE'),
      /No mock portal response registered/
    );
  });

  it('result carries platformSlug, platformName, condition, and interactedAt', () => {
    const meta = platformProfiles.find(p => p.slug === 'meta-automotive-ads')!;
    const result = simulatePortalInteraction(meta, 'PORTAL_ACCEPTED');
    assert.equal(result.platformSlug, 'meta-automotive-ads');
    assert.equal(result.platformName, 'Meta Automotive Inventory Ads');
    assert.equal(result.condition, 'PORTAL_ACCEPTED');
    assert.ok(result.interactedAt.startsWith('20'));
  });
});

describe('runPortalLifecycle — full arc', () => {
  it('feed platform happy path ends at ACTIVE: ACCEPTED → APPROVED → FEED_LIVE', () => {
    const google = platformProfiles.find(p => p.slug === 'google-vehicle-ads')!;
    const steps = runPortalLifecycle(google, HAPPY_PATH_FEED);
    assert.equal(steps.length, 3);
    assert.equal(steps[0].toStatus, 'PLATFORM_REVIEWING');
    assert.equal(steps[1].toStatus, 'FEED_TESTING');
    assert.equal(steps[2].toStatus, 'ACTIVE');
  });

  it('assisted marketplace happy path ends at ACTIVE: ACCEPTED → APPROVED', () => {
    const cargurus = platformProfiles.find(p => p.slug === 'cargurus-dealer')!;
    const steps = runPortalLifecycle(cargurus, HAPPY_PATH_ASSISTED);
    assert.equal(steps.length, 2);
    assert.equal(steps[0].toStatus, 'PLATFORM_REVIEWING');
    assert.equal(steps[1].toStatus, 'ACTIVE');
  });

  it('ADF/XML happy path ends at ACTIVE in a single step', () => {
    const adf = platformProfiles.find(p => p.slug === 'adf-xml-lead-routing')!;
    const steps = runPortalLifecycle(adf, HAPPY_PATH_ADF);
    assert.equal(steps.length, 1);
    assert.equal(steps[0].toStatus, 'ACTIVE');
  });

  it('chains fromStatus correctly across steps', () => {
    const google = platformProfiles.find(p => p.slug === 'google-vehicle-ads')!;
    const steps = runPortalLifecycle(google, HAPPY_PATH_FEED);
    assert.equal(steps[0].fromStatus, 'SUBMITTED');
    assert.equal(steps[1].fromStatus, 'PLATFORM_REVIEWING');
    assert.equal(steps[2].fromStatus, 'FEED_TESTING');
  });

  it('stops at DEALER_ACTION_NEEDED mid-lifecycle when PORTAL_NEEDS_INFO is injected', () => {
    const meta = platformProfiles.find(p => p.slug === 'meta-automotive-ads')!;
    const steps = runPortalLifecycle(meta, ['PORTAL_ACCEPTED', 'PORTAL_NEEDS_INFO']);
    assert.equal(steps[1].toStatus, 'DEALER_ACTION_NEEDED');
    assert.ok(steps[1].dealerAction !== null);
  });
});

describe('mock portal response data integrity', () => {
  it('every registered response has a non-empty notes field', () => {
    const bad: string[] = [];
    for (const [slug, responses] of Object.entries(mockPortalResponses)) {
      for (const [condition, response] of Object.entries(responses)) {
        if (!response.notes || response.notes.trim().length === 0) {
          bad.push(`${slug}/${condition}`);
        }
      }
    }
    assert.deepEqual(bad, []);
  });

  it('every PORTAL_REJECTED response has a non-null dealerAction', () => {
    const missing: string[] = [];
    for (const [slug, responses] of Object.entries(mockPortalResponses)) {
      const rejected = responses['PORTAL_REJECTED'];
      if (rejected && rejected.dealerAction === null) {
        missing.push(slug);
      }
    }
    assert.deepEqual(missing, []);
  });

  it('every PORTAL_NEEDS_INFO response has a non-null dealerAction', () => {
    const missing: string[] = [];
    for (const [slug, responses] of Object.entries(mockPortalResponses)) {
      const needsInfo = responses['PORTAL_NEEDS_INFO'];
      if (needsInfo && needsInfo.dealerAction === null) {
        missing.push(slug);
      }
    }
    assert.deepEqual(missing, []);
  });
});
