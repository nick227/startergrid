import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { propagateVehicleUpdate, summarizeUpdatePropagations } from '../services/inventory/vehicleUpdateService.js';
import { validatePriceUpdate, validatePhotoUpdate } from '../services/inventory/inventoryUpdateService.js';
import { platformProfiles } from '../data/platformProfiles.js';
import type { VehicleUpdateEvent } from '../lib/types.js';

const baseEvent: VehicleUpdateEvent = {
  vehicleId: 'v-001',
  stockNumber: 'PRM-24001',
  dealershipId: 'dealer-001',
  kind: 'PRICE_CHANGE',
  previousValue: { priceCents: 2399500 },
  newValue: { priceCents: 2199500 }
};

const allPlatforms = platformProfiles;
const partnerPlatforms = allPlatforms.filter(p => p.integrationClass === 'PARTNER_DEPENDENT');
const assistedPlatforms = allPlatforms.filter(p => p.integrationClass === 'ASSISTED');
const feedablePlatforms = allPlatforms.filter(p => p.integrationClass === 'FEEDABLE');
const ownedPlatforms = allPlatforms.filter(p => p.integrationClass === 'OWNED');

describe('PARTNER_DEPENDENT routing', () => {
  it('PARTNER_DEPENDENT platforms get PARTNER_FOLLOWUP on price change', () => {
    const result = propagateVehicleUpdate(baseEvent, partnerPlatforms);
    assert.ok(partnerPlatforms.length >= 1);
    assert.ok(result.every(r => r.action === 'PARTNER_FOLLOWUP'),
      `expected all PARTNER_FOLLOWUP, got: ${result.map(r => r.action).join(', ')}`);
  });

  it('PARTNER_FOLLOWUP payload includes operation PARTNER_FOLLOWUP_REQUIRED', () => {
    const result = propagateVehicleUpdate(baseEvent, partnerPlatforms);
    assert.ok(result.every(r => r.payload['operation'] === 'PARTNER_FOLLOWUP_REQUIRED'));
  });

  it('PARTNER_FOLLOWUP note mentions partner follow-up', () => {
    const result = propagateVehicleUpdate(baseEvent, partnerPlatforms);
    assert.ok(result.every(r => r.notes.toLowerCase().includes('partner')));
  });

  it('PARTNER_DEPENDENT still gets REMOVE_LISTING on SOLD', () => {
    const soldEvent = { ...baseEvent, kind: 'SOLD' as const };
    const result = propagateVehicleUpdate(soldEvent, partnerPlatforms);
    assert.ok(result.every(r => r.action === 'REMOVE_LISTING'));
  });
});

describe('ASSISTED routing', () => {
  it('ASSISTED platforms get UPDATE_PACKET (not PARTNER_FOLLOWUP) on price change', () => {
    const result = propagateVehicleUpdate(baseEvent, assistedPlatforms);
    assert.ok(assistedPlatforms.length >= 1);
    assert.ok(result.every(r => r.action === 'UPDATE_PACKET'));
  });

  it('ASSISTED and PARTNER_DEPENDENT actions are distinct', () => {
    const assistedResult = propagateVehicleUpdate(baseEvent, assistedPlatforms);
    const partnerResult = propagateVehicleUpdate(baseEvent, partnerPlatforms);
    const assistedAction = assistedResult[0]!.action;
    const partnerAction = partnerResult[0]!.action;
    assert.notEqual(assistedAction, partnerAction,
      `ASSISTED and PARTNER_DEPENDENT should have different actions`);
  });
});

describe('PHOTO_CHANGE propagation', () => {
  const photoEvent: VehicleUpdateEvent = {
    ...baseEvent,
    kind: 'PHOTO_CHANGE',
    previousValue: { mediaCount: 3 },
    newValue: { photoUrls: ['https://example.com/a.jpg'] }
  };

  it('OWNED gets DELTA_UPDATE on photo change', () => {
    const result = propagateVehicleUpdate(photoEvent, ownedPlatforms);
    assert.ok(result.every(r => r.action === 'DELTA_UPDATE'));
  });

  it('FEEDABLE gets FEED_REFRESH on photo change', () => {
    const result = propagateVehicleUpdate(photoEvent, feedablePlatforms);
    assert.ok(result.every(r => r.action === 'FEED_REFRESH'));
  });

  it('ASSISTED gets UPDATE_PACKET on photo change', () => {
    const result = propagateVehicleUpdate(photoEvent, assistedPlatforms);
    assert.ok(result.every(r => r.action === 'UPDATE_PACKET'));
  });

  it('PARTNER_DEPENDENT gets PARTNER_FOLLOWUP on photo change', () => {
    const result = propagateVehicleUpdate(photoEvent, partnerPlatforms);
    assert.ok(result.every(r => r.action === 'PARTNER_FOLLOWUP'));
  });
});

describe('DETAILS_CHANGE propagation', () => {
  it('follows same routing as PRICE_CHANGE', () => {
    const detailsEvent = { ...baseEvent, kind: 'DETAILS_CHANGE' as const };
    const priceResult = propagateVehicleUpdate(baseEvent, allPlatforms);
    const detailsResult = propagateVehicleUpdate(detailsEvent, allPlatforms);
    const priceActions = priceResult.map(r => `${r.platformSlug}:${r.action}`).sort();
    const detailsActions = detailsResult.map(r => `${r.platformSlug}:${r.action}`).sort();
    assert.deepEqual(priceActions, detailsActions);
  });
});

describe('summarizeUpdatePropagations with PARTNER_FOLLOWUP', () => {
  it('partnerFollowup count matches PARTNER_DEPENDENT platform count on price change', () => {
    const result = propagateVehicleUpdate(baseEvent, allPlatforms);
    const summary = summarizeUpdatePropagations(result);
    assert.equal(summary.partnerFollowup, partnerPlatforms.length);
  });

  it('total of all summary buckets equals platform count', () => {
    const result = propagateVehicleUpdate(baseEvent, allPlatforms);
    const s = summarizeUpdatePropagations(result);
    const total = s.immediate + s.feedRefresh + s.manualRequired + s.partnerFollowup + s.removed;
    assert.equal(total, allPlatforms.length);
  });

  it('partnerFollowup is 0 on SOLD (all become REMOVE_LISTING)', () => {
    const soldResult = propagateVehicleUpdate({ ...baseEvent, kind: 'SOLD' as const }, allPlatforms);
    const summary = summarizeUpdatePropagations(soldResult);
    assert.equal(summary.partnerFollowup, 0);
    assert.equal(summary.removed, allPlatforms.length);
  });
});

describe('validatePriceUpdate', () => {
  it('accepts a valid positive integer priceCents', () => {
    const r = validatePriceUpdate({ priceCents: 1999900 });
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.priceCents, 1999900);
  });

  it('rejects zero', () => {
    assert.ok(!validatePriceUpdate({ priceCents: 0 }).ok);
  });

  it('rejects negative', () => {
    assert.ok(!validatePriceUpdate({ priceCents: -500 }).ok);
  });

  it('rejects float', () => {
    assert.ok(!validatePriceUpdate({ priceCents: 19999.99 }).ok);
  });

  it('rejects string', () => {
    assert.ok(!validatePriceUpdate({ priceCents: '19999' }).ok);
  });

  it('rejects missing priceCents', () => {
    assert.ok(!validatePriceUpdate({}).ok);
  });

  it('rejects null body', () => {
    assert.ok(!validatePriceUpdate(null).ok);
  });
});

describe('validatePhotoUpdate', () => {
  it('accepts a non-empty array of URLs', () => {
    const r = validatePhotoUpdate({ photoUrls: ['https://example.com/photo.jpg'] });
    assert.ok(r.ok);
    if (r.ok) assert.equal(r.photoUrls.length, 1);
  });

  it('rejects empty array', () => {
    assert.ok(!validatePhotoUpdate({ photoUrls: [] }).ok);
  });

  it('rejects non-array', () => {
    assert.ok(!validatePhotoUpdate({ photoUrls: 'https://example.com/photo.jpg' }).ok);
  });

  it('rejects array with empty string', () => {
    assert.ok(!validatePhotoUpdate({ photoUrls: [''] }).ok);
  });

  it('rejects missing photoUrls', () => {
    assert.ok(!validatePhotoUpdate({}).ok);
  });
});
