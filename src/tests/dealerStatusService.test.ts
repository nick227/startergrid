import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { getDealerStatusCopy, getDealerStatusBadge, integrationClassLabel } from '../services/dealerStatusService.js';
import { platformProfiles } from '../data/platformProfiles.js';
import type { PlatformProfileSeed } from '../lib/types.js';

const storefront = platformProfiles.find(p => p.slug === 'dealer-storefront')!;
const google = platformProfiles.find(p => p.slug === 'google-vehicle-ads')!;
const cargurus = platformProfiles.find(p => p.slug === 'cargurus-dealer')!;
const autotrader = platformProfiles.find(p => p.slug === 'autotrader-cox')!;

describe('getDealerStatusCopy — status labels', () => {
  it('ACTIVE returns statusLabel active', () => {
    const copy = getDealerStatusCopy(google, 'ACTIVE');
    assert.equal(copy.statusLabel, 'active');
  });

  it('NOT_STARTED on PARTNER_DEPENDENT returns partner_required', () => {
    const copy = getDealerStatusCopy(autotrader, 'NOT_STARTED');
    assert.equal(copy.statusLabel, 'partner_required');
  });

  it('NOT_STARTED on FEEDABLE returns not_started', () => {
    const copy = getDealerStatusCopy(google, 'NOT_STARTED');
    assert.equal(copy.statusLabel, 'not_started');
  });

  it('DEALER_ACTION_NEEDED returns needs_action', () => {
    const copy = getDealerStatusCopy(cargurus, 'DEALER_ACTION_NEEDED', 'Upload your dealer license.');
    assert.equal(copy.statusLabel, 'needs_action');
  });

  it('PLATFORM_REVIEWING returns reviewing', () => {
    const copy = getDealerStatusCopy(cargurus, 'PLATFORM_REVIEWING');
    assert.equal(copy.statusLabel, 'reviewing');
  });

  it('REJECTED returns rejected', () => {
    const copy = getDealerStatusCopy(google, 'REJECTED', 'Fix VIN attribute violations.');
    assert.equal(copy.statusLabel, 'rejected');
  });
});

describe('getDealerStatusCopy — copy content', () => {
  it('ACTIVE owned channel headline includes platform name', () => {
    const copy = getDealerStatusCopy(storefront, 'ACTIVE');
    assert.ok(copy.headline.includes(storefront.name));
  });

  it('ACTIVE owned channel detail mentions leads', () => {
    const copy = getDealerStatusCopy(storefront, 'ACTIVE');
    assert.ok(copy.detail.toLowerCase().includes('lead'));
  });

  it('DEALER_ACTION_NEEDED detail uses the provided dealerAction', () => {
    const action = 'Upload your dealer license to CarGurus.';
    const copy = getDealerStatusCopy(cargurus, 'DEALER_ACTION_NEEDED', action);
    assert.equal(copy.detail, action);
  });

  it('PLATFORM_REVIEWING detail includes review time estimate', () => {
    const copy = getDealerStatusCopy(cargurus, 'PLATFORM_REVIEWING');
    assert.ok(copy.detail.includes('3–5 business days'));
  });

  it('PARTNER_DEPENDENT not_started has a non-null cta', () => {
    const copy = getDealerStatusCopy(autotrader, 'NOT_STARTED');
    assert.ok(copy.cta !== null);
  });

  it('ACTIVE status has null cta', () => {
    const copy = getDealerStatusCopy(google, 'ACTIVE');
    assert.equal(copy.cta, null);
  });

  it('result always has platformSlug, platformName, integrationClass', () => {
    const copy = getDealerStatusCopy(google, 'SUBMITTED');
    assert.equal(copy.platformSlug, 'google-vehicle-ads');
    assert.equal(copy.platformName, 'Google Vehicle Ads');
    assert.equal(copy.integrationClass, 'FEEDABLE');
  });
});

describe('getDealerStatusCopy — all platforms compile without error', () => {
  it('generates valid copy for every platform across key statuses', () => {
    const statuses = ['NOT_STARTED', 'ACTIVE', 'DEALER_ACTION_NEEDED', 'REJECTED', 'PLATFORM_REVIEWING'] as const;
    for (const platform of platformProfiles) {
      for (const status of statuses) {
        const copy = getDealerStatusCopy(platform, status);
        assert.ok(copy.headline.length > 0, `${platform.slug}/${status} missing headline`);
        assert.ok(copy.detail.length > 0, `${platform.slug}/${status} missing detail`);
      }
    }
  });
});

describe('getDealerStatusBadge', () => {
  it('returns emoji-prefixed badge strings', () => {
    assert.ok(getDealerStatusBadge('active').includes('Active'));
    assert.ok(getDealerStatusBadge('needs_action').includes('Needs action'));
    assert.ok(getDealerStatusBadge('partner_required').includes('Partner required'));
  });
});

describe('integrationClassLabel', () => {
  it('returns readable labels for all four classes', () => {
    assert.equal(integrationClassLabel('OWNED'), 'Owned channel');
    assert.equal(integrationClassLabel('FEEDABLE'), 'Self-serve feed');
    assert.equal(integrationClassLabel('ASSISTED'), 'Assisted onboarding');
    assert.equal(integrationClassLabel('PARTNER_DEPENDENT'), 'Partner agreement required');
  });
});
