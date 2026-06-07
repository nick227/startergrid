// Consumer Marketplace Platform integration tests.
//
// Proves that:
//   1. consumer-marketplace is in the platform registry with correct properties
//   2. Platform count is now 19
//   3. VIN is never present in the feed artifact or its nested structures
//   4. Feed filters priceCents=0 vehicles (marketplace eligibility)
//   5. Operator publish-state logic treats it correctly as OWNED/Active
//   6. Sync policy and queue status follow REAL_TIME / OWNED rules
//   7. Marketplace boundary: no operator internals in the artifact

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { platformProfiles } from '../data/platformProfiles.js';
import { generateFeedForPlatform } from '../services/publishing/feedGeneratorService.js';
import { derivePublishState, needsInitialQueueItem } from '../services/publishing/prepareAndPublishService.js';
import { defaultSyncMode, resolveQueueStatus } from '../services/publishing/syncPolicyService.js';
import type { DealershipPayload, VehiclePayload } from '../lib/types.js';

// ── Fixture data ──────────────────────────────────────────────────────────────

const DEALER: DealershipPayload = {
  legalName: 'Prairie Ridge Motors LLC',
  dbaName:   'Prairie Ridge Motors',
  rooftopAddress: { city: 'Springfield', state: 'IL', postalCode: '62701' },
  websiteUrl: 'https://prairieridge.example.com',
  primaryContact: { email: 'contact@prairieridge.example.com', phone: '+12175550100' },
  desiredChannels: ['consumer-marketplace'],
};

function makeVehicle(overrides: Partial<VehiclePayload> = {}): VehiclePayload {
  return {
    stockNumber:  'PR-001',
    vin:          '1HGCM82633A004352',   // included in payload, must NOT appear in output
    year:         2022,
    make:         'Toyota',
    model:        'Camry',
    trim:         'SE',
    mileage:      18_000,
    priceCents:   2_499_900,
    condition:    'USED',
    exteriorColor: 'Midnight Black',
    media:        [{ url: 'https://cdn.example.com/img1.jpg', kind: 'IMAGE', sortOrder: 0 }],
    ...overrides,
  };
}

// ── Platform registry contract ────────────────────────────────────────────────

describe('consumer-marketplace platform registry', () => {
  it('consumer-marketplace is in the platform registry', () => {
    const p = platformProfiles.find(p => p.slug === 'consumer-marketplace');
    assert.ok(p, 'consumer-marketplace must be in platformProfiles');
  });

  it('has kind MARKETPLACE', () => {
    const p = platformProfiles.find(p => p.slug === 'consumer-marketplace')!;
    assert.equal(p.kind, 'MARKETPLACE');
  });

  it('has integrationClass OWNED', () => {
    const p = platformProfiles.find(p => p.slug === 'consumer-marketplace')!;
    assert.equal(p.integrationClass, 'OWNED');
  });

  it('has outputFormat MARKETPLACE_LISTING_JSON', () => {
    const p = platformProfiles.find(p => p.slug === 'consumer-marketplace')!;
    assert.equal(p.outputFormat, 'MARKETPLACE_LISTING_JSON');
  });

  it('platform registry now has 24 entries', () => {
    assert.equal(platformProfiles.length, 24, 'expected 24 platforms after Phase 3A trailer stubs');
  });

  it('vin is NOT in requiredVehicleFields', () => {
    const p = platformProfiles.find(p => p.slug === 'consumer-marketplace')!;
    const hasVin = (p.requiredVehicleFields ?? []).some(f =>
      f.toLowerCase().includes('vin')
    );
    assert.ok(!hasVin, 'consumer-marketplace must not require VIN');
  });

  it('requires stockNumber, year, make, model, priceCents, condition', () => {
    const p = platformProfiles.find(p => p.slug === 'consumer-marketplace')!;
    const required = new Set(p.requiredVehicleFields ?? []);
    for (const field of ['stockNumber', 'year', 'make', 'model', 'priceCents', 'condition']) {
      assert.ok(required.has(field), `consumer-marketplace must require field: ${field}`);
    }
  });

  it('is the only OWNED MARKETPLACE platform', () => {
    const ownedMarketplaces = platformProfiles.filter(
      p => p.kind === 'MARKETPLACE' && p.integrationClass === 'OWNED',
    );
    assert.equal(ownedMarketplaces.length, 1);
    assert.equal(ownedMarketplaces[0]?.slug, 'consumer-marketplace');
  });

  it('OWNED platforms now include consumer-marketplace', () => {
    const owned = platformProfiles.filter(p => p.integrationClass === 'OWNED');
    assert.ok(owned.some(p => p.slug === 'consumer-marketplace'));
  });
});

// ── Feed artifact — VIN boundary ──────────────────────────────────────────────

describe('generateFeedForPlatform — consumer-marketplace VIN boundary', () => {
  const mp = platformProfiles.find(p => p.slug === 'consumer-marketplace')!;

  it('feed artifact does not contain the VIN field', () => {
    const artifact = generateFeedForPlatform(mp, DEALER, [makeVehicle()]);
    const parsed = JSON.parse(artifact.content) as Record<string, unknown>;
    assert.ok(!('vin' in parsed), 'top-level vin must not appear');

    const listings = parsed['listings'] as Array<Record<string, unknown>>;
    assert.ok(Array.isArray(listings));
    for (const listing of listings) {
      assert.ok(!('vin' in listing), `listing must not have vin field: ${JSON.stringify(listing)}`);
    }
  });

  it('feed artifact does not contain VIN value in serialized JSON', () => {
    const vin = '1HGCM82633A004352';
    const artifact = generateFeedForPlatform(mp, DEALER, [makeVehicle({ vin })]);
    assert.ok(!artifact.content.includes(vin), 'VIN value must not appear in serialized marketplace artifact');
  });

  it('artifact format and filename are correct', () => {
    const artifact = generateFeedForPlatform(mp, DEALER, [makeVehicle()]);
    assert.equal(artifact.platformSlug, 'consumer-marketplace');
    assert.equal(artifact.format, 'MARKETPLACE_LISTING_JSON');
    assert.equal(artifact.filename, 'marketplace-listings.json');
  });
});

// ── Feed artifact — no operator internals ────────────────────────────────────

describe('generateFeedForPlatform — consumer-marketplace operator boundary', () => {
  const mp = platformProfiles.find(p => p.slug === 'consumer-marketplace')!;

  it('artifact contains no operator-internal keys', () => {
    const artifact = generateFeedForPlatform(mp, DEALER, [makeVehicle()]);
    const json = artifact.content;
    const FORBIDDEN = [
      'syncEvents', 'publishQueue', 'performanceCache', 'movementSignal',
      'platformAccounts', 'applications', 'subscription', 'credentialRefs',
      'readinessRuns', 'notifications', 'syncPolicies', 'leadCaptureUrl',
    ];
    for (const key of FORBIDDEN) {
      assert.ok(!json.includes(`"${key}"`), `Operator field "${key}" must not appear in marketplace artifact`);
    }
  });

  it('each listing uses listingId (stockNumber), not VIN', () => {
    const v = makeVehicle({ stockNumber: 'PR-42', vin: 'VIN-SHOULD-NOT-APPEAR' });
    const artifact = generateFeedForPlatform(mp, DEALER, [v]);
    const parsed = JSON.parse(artifact.content) as { listings: Array<{ listingId: string }> };
    assert.equal(parsed.listings[0]!.listingId, 'PR-42');
  });

  it('artifact includes dealerName, dealerCity, dealerState', () => {
    const artifact = generateFeedForPlatform(mp, DEALER, [makeVehicle()]);
    const parsed = JSON.parse(artifact.content) as { listings: Array<Record<string, unknown>> };
    const listing = parsed.listings[0]!;
    assert.ok('dealerName'  in listing);
    assert.ok('dealerCity'  in listing);
    assert.ok('dealerState' in listing);
    assert.ok(!('vin'       in listing));
  });
});

// ── Marketplace eligibility filter in feed ────────────────────────────────────

describe('generateFeedForPlatform — consumer-marketplace eligibility', () => {
  const mp = platformProfiles.find(p => p.slug === 'consumer-marketplace')!;

  it('vehicles with priceCents=0 are excluded from the listing artifact', () => {
    const vehicles = [
      makeVehicle({ stockNumber: 'PRICED',    priceCents: 2_499_900 }),
      makeVehicle({ stockNumber: 'FREE',       priceCents: 0 }),
      makeVehicle({ stockNumber: 'ALSO-FREE',  priceCents: null }),
    ];
    const artifact = generateFeedForPlatform(mp, DEALER, vehicles);
    const parsed = JSON.parse(artifact.content) as { eligibleCount: number; listings: Array<{ stockNumber: string }> };
    assert.equal(parsed.eligibleCount, 1, 'only priced vehicles should be listed');
    assert.equal(parsed.listings.length, 1);
    assert.equal(parsed.listings[0]!.stockNumber, 'PRICED');
  });

  it('returns empty listings when no eligible vehicles', () => {
    const artifact = generateFeedForPlatform(mp, DEALER, []);
    const parsed = JSON.parse(artifact.content) as { eligibleCount: number };
    assert.equal(parsed.eligibleCount, 0);
  });

  it('mediaUrls is capped at 8 images', () => {
    const manyMedia = Array.from({ length: 12 }, (_, i) => ({
      url: `https://cdn.example.com/img${i}.jpg`, kind: 'IMAGE', sortOrder: i
    }));
    const artifact = generateFeedForPlatform(mp, DEALER, [makeVehicle({ media: manyMedia })]);
    const parsed = JSON.parse(artifact.content) as { listings: Array<{ mediaUrls: string[] }> };
    assert.equal(parsed.listings[0]!.mediaUrls.length, 8);
  });
});

// ── Publish state and sync policy ────────────────────────────────────────────

describe('consumer-marketplace publish state (OWNED)', () => {
  const mp = platformProfiles.find(p => p.slug === 'consumer-marketplace')!;

  it('OWNED + applicationStatus=ACTIVE → state is Active', () => {
    const state = derivePublishState({
      platform: mp,
      readiness: 'GREEN',
      applicationStatus: 'ACTIVE',
      latestQueueItemStatus: null,
      hasSubmissionAttempt: false,
    });
    assert.equal(state, 'Active');
  });

  it('OWNED + applicationStatus=null → state is Ready (not Blocked)', () => {
    const state = derivePublishState({
      platform: mp,
      readiness: 'GREEN',
      applicationStatus: null,
      latestQueueItemStatus: null,
      hasSubmissionAttempt: false,
    });
    assert.equal(state, 'Ready');
  });

  it('needsInitialQueueItem is false for OWNED', () => {
    const needs = needsInitialQueueItem({
      integrationClass: 'OWNED',
      applicationStatus: 'ACTIVE',
      activeQueueItemStatus: null,
    });
    assert.equal(needs, false, 'OWNED platforms use application status, not queue items');
  });

  it('defaultSyncMode for OWNED is REAL_TIME', () => {
    assert.equal(defaultSyncMode('OWNED'), 'REAL_TIME');
  });

  it('REAL_TIME + SOLD (urgent) → queue status READY', () => {
    const status = resolveQueueStatus('REAL_TIME', 'SOLD', true);
    assert.equal(status, 'READY');
  });

  it('REAL_TIME + PRICE_CHANGE (non-urgent) → queue status READY', () => {
    const status = resolveQueueStatus('REAL_TIME', 'PRICE_CHANGE', false);
    assert.equal(status, 'READY');
  });

  it('REAL_TIME + REMOVED (urgent) → queue status READY', () => {
    const status = resolveQueueStatus('REAL_TIME', 'REMOVED', true);
    assert.equal(status, 'READY');
  });
});
