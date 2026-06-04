import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  resolveApplicationStatus,
  resolveSubmissionMethod,
  resolveNextAction
} from '../services/publishing/applicationActivationService.js';
import { platformProfiles } from '../data/platformProfiles.js';

const google    = platformProfiles.find(p => p.slug === 'google-vehicle-ads')!;
const storefront = platformProfiles.find(p => p.slug === 'dealer-storefront')!;
const cargurus  = platformProfiles.find(p => p.slug === 'cargurus-dealer')!;
const autotrader = platformProfiles.find(p => p.slug === 'autotrader-cox')!;

describe('resolveApplicationStatus', () => {
  it('OWNED → ACTIVE', () => {
    assert.equal(resolveApplicationStatus('OWNED'), 'ACTIVE');
  });
  it('FEEDABLE → SUBMITTED', () => {
    assert.equal(resolveApplicationStatus('FEEDABLE'), 'SUBMITTED');
  });
  it('ASSISTED → SUBMITTED', () => {
    assert.equal(resolveApplicationStatus('ASSISTED'), 'SUBMITTED');
  });
  it('PARTNER_DEPENDENT → PARTNER_REQUIRED', () => {
    assert.equal(resolveApplicationStatus('PARTNER_DEPENDENT'), 'PARTNER_REQUIRED');
  });
});

describe('resolveSubmissionMethod', () => {
  it('OWNED → MOCK_API', () => {
    assert.equal(resolveSubmissionMethod('OWNED'), 'MOCK_API');
  });
  it('FEEDABLE → FEED_URL', () => {
    assert.equal(resolveSubmissionMethod('FEEDABLE'), 'FEED_URL');
  });
  it('ASSISTED → MOCK_EMAIL', () => {
    assert.equal(resolveSubmissionMethod('ASSISTED'), 'MOCK_EMAIL');
  });
  it('PARTNER_DEPENDENT → MANUAL_REP', () => {
    assert.equal(resolveSubmissionMethod('PARTNER_DEPENDENT'), 'MANUAL_REP');
  });
});

describe('resolveNextAction', () => {
  it('OWNED returns null', () => {
    assert.equal(resolveNextAction('OWNED', storefront.name), null);
  });
  it('FEEDABLE mentions platform name', () => {
    const action = resolveNextAction('FEEDABLE', google.name);
    assert.ok(action?.includes(google.name));
  });
  it('ASSISTED mentions review and platform name', () => {
    const action = resolveNextAction('ASSISTED', cargurus.name);
    assert.ok(action?.toLowerCase().includes('review'));
    assert.ok(action?.includes(cargurus.name));
  });
  it('PARTNER_DEPENDENT mentions commercial agreement', () => {
    const action = resolveNextAction('PARTNER_DEPENDENT', autotrader.name);
    assert.ok(action?.toLowerCase().includes('commercial agreement'));
    assert.ok(action?.includes(autotrader.name));
  });
});

describe('integration class coverage — all 18 platforms', () => {
  it('every platform resolves to a valid ApplicationStatus', () => {
    for (const p of platformProfiles) {
      const status = resolveApplicationStatus(p.integrationClass);
      assert.ok(
        ['ACTIVE', 'SUBMITTED', 'PARTNER_REQUIRED'].includes(status),
        `${p.slug} resolved to unexpected status: ${status}`
      );
    }
  });

  it('PARTNER_DEPENDENT platforms all resolve to PARTNER_REQUIRED', () => {
    const partnerPlatforms = platformProfiles.filter(p => p.integrationClass === 'PARTNER_DEPENDENT');
    assert.ok(partnerPlatforms.length >= 1, 'expected at least one PARTNER_DEPENDENT platform');
    for (const p of partnerPlatforms) {
      assert.equal(resolveApplicationStatus(p.integrationClass), 'PARTNER_REQUIRED');
    }
  });

  it('ASSISTED platforms all resolve to SUBMITTED', () => {
    const assistedPlatforms = platformProfiles.filter(p => p.integrationClass === 'ASSISTED');
    assert.ok(assistedPlatforms.length >= 1, 'expected at least one ASSISTED platform');
    for (const p of assistedPlatforms) {
      assert.equal(resolveApplicationStatus(p.integrationClass), 'SUBMITTED');
    }
  });
});
