import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { propagateVehicleUpdate, summarizeUpdatePropagations } from '../services/vehicleUpdateService.js';
import { platformProfiles } from '../data/platformProfiles.js';
import type { VehicleUpdateEvent } from '../lib/types.js';

const baseEvent: VehicleUpdateEvent = {
  vehicleId: 'vehicle-001',
  stockNumber: 'LS-1001',
  dealershipId: 'dealer-001',
  kind: 'PRICE_CHANGE',
  previousValue: { priceCents: 1899500 },
  newValue: { priceCents: 1799500 }
};

const activePlatforms = platformProfiles;

describe('propagateVehicleUpdate', () => {
  it('returns one propagation per active platform', () => {
    const result = propagateVehicleUpdate(baseEvent, activePlatforms);
    assert.equal(result.length, activePlatforms.length);
  });

  it('OWNED platform gets DELTA_UPDATE on price change', () => {
    const result = propagateVehicleUpdate(baseEvent, activePlatforms);
    const owned = result.find(r => r.integrationClass === 'OWNED');
    assert.ok(owned);
    assert.equal(owned.action, 'DELTA_UPDATE');
  });

  it('FEEDABLE platform gets FEED_REFRESH on price change', () => {
    const result = propagateVehicleUpdate(baseEvent, activePlatforms);
    const feedable = result.filter(r => r.integrationClass === 'FEEDABLE');
    assert.ok(feedable.length > 0);
    assert.ok(feedable.every(r => r.action === 'FEED_REFRESH'));
  });

  it('ASSISTED platform gets UPDATE_PACKET on price change', () => {
    const result = propagateVehicleUpdate(baseEvent, activePlatforms);
    const assisted = result.filter(r => r.integrationClass === 'ASSISTED');
    assert.ok(assisted.length > 0);
    assert.ok(assisted.every(r => r.action === 'UPDATE_PACKET'));
  });

  it('SOLD event produces REMOVE_LISTING on all platforms', () => {
    const soldEvent = { ...baseEvent, kind: 'SOLD' as const };
    const result = propagateVehicleUpdate(soldEvent, activePlatforms);
    assert.ok(result.every(r => r.action === 'REMOVE_LISTING'));
  });

  it('REMOVED event produces REMOVE_LISTING on all platforms', () => {
    const removedEvent = { ...baseEvent, kind: 'REMOVED' as const };
    const result = propagateVehicleUpdate(removedEvent, activePlatforms);
    assert.ok(result.every(r => r.action === 'REMOVE_LISTING'));
  });

  it('REMOVE_LISTING payload includes availability: out_of_stock', () => {
    const soldEvent = { ...baseEvent, kind: 'SOLD' as const };
    const result = propagateVehicleUpdate(soldEvent, activePlatforms);
    assert.ok(result.every(r => r.payload['availability'] === 'out_of_stock'));
  });

  it('DELTA_UPDATE payload includes the new values', () => {
    const result = propagateVehicleUpdate(baseEvent, activePlatforms);
    const owned = result.find(r => r.integrationClass === 'OWNED')!;
    const changes = owned.payload['changes'] as Record<string, unknown>;
    assert.equal(changes['priceCents'], 1799500);
  });

  it('every propagation has a non-empty notes field', () => {
    const result = propagateVehicleUpdate(baseEvent, activePlatforms);
    assert.ok(result.every(r => r.notes.length > 0));
  });
});

describe('summarizeUpdatePropagations', () => {
  it('correctly counts each action type across all classes', () => {
    const result = propagateVehicleUpdate(baseEvent, activePlatforms);
    const summary = summarizeUpdatePropagations(result);
    const total = summary.immediate + summary.feedRefresh + summary.manualRequired + summary.partnerFollowup + summary.removed;
    assert.equal(total, activePlatforms.length);
    assert.equal(summary.immediate, activePlatforms.filter(p => p.integrationClass === 'OWNED').length);
    assert.equal(summary.partnerFollowup, activePlatforms.filter(p => p.integrationClass === 'PARTNER_DEPENDENT').length);
    assert.equal(summary.manualRequired, activePlatforms.filter(p => p.integrationClass === 'ASSISTED').length);
  });

  it('all actions are REMOVE_LISTING on SOLD', () => {
    const soldEvent = { ...baseEvent, kind: 'SOLD' as const };
    const result = propagateVehicleUpdate(soldEvent, activePlatforms);
    const summary = summarizeUpdatePropagations(result);
    assert.equal(summary.removed, activePlatforms.length);
    assert.equal(summary.immediate + summary.feedRefresh + summary.manualRequired + summary.partnerFollowup, 0);
  });
});
