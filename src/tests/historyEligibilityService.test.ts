import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CONSUMER_MARKETPLACE_SLUG,
  filterDealerHistoryEvents,
  isOperatorAttestedChannelForHistory,
  isOutboundPlatformHistoryKind,
  isSyncEventVisibleForDealer,
  type DealerOutboundContext,
} from '../services/publishing/historyEligibilityService.js';
import { platformProfiles } from '../data/platformProfiles.js';

const AUTOMOTIVE = 'AUTOMOTIVE';

function makeCtx(overrides: Partial<DealerOutboundContext> = {}): DealerOutboundContext {
  const carsProfile = platformProfiles.find(p => p.slug === 'cars-com')!;
  const consumerProfile = platformProfiles.find(p => p.slug === CONSUMER_MARKETPLACE_SLUG)!;
  const googleProfile = platformProfiles.find(p => p.slug === 'google-business-profile')!;
  return {
    dealershipId: 'dealer-1',
    businessCategory: AUTOMOTIVE,
    desiredChannels: ['cars-com'],
    siteAvailability: new Map([[CONSUMER_MARKETPLACE_SLUG, true], ['google-business-profile', true]]),
    accountBySlug: new Map([
      ['cars-com', { state: 'ACTIVE', dealerEnabled: true, autoSyncReadyInventory: true }],
      [CONSUMER_MARKETPLACE_SLUG, { state: 'ACTIVE', dealerEnabled: true, autoSyncReadyInventory: true }],
      ['google-business-profile', { state: 'ACTIVE', dealerEnabled: true, autoSyncReadyInventory: true }],
    ]),
    applicationStatusBySlug: new Map([
      ['cars-com', 'ACTIVE'],
      [CONSUMER_MARKETPLACE_SLUG, 'ACTIVE'],
      ['google-business-profile', 'ACTIVE'],
    ]),
    liveOAuth: new Set(),
    deselectedKeys: new Set(),
    eligibleVehicleCountByPlatform: new Map([['cars-com', 3]]),
    activeMarketplaceVehicleIds: new Set(),
    profileBySlug: new Map([
      ['cars-com', carsProfile],
      [CONSUMER_MARKETPLACE_SLUG, consumerProfile],
      ['google-business-profile', googleProfile],
    ]),
    ...overrides,
  };
}

describe('isOutboundPlatformHistoryKind', () => {
  it('classifies dispatch and approval kinds as outbound platform history', () => {
    assert.equal(isOutboundPlatformHistoryKind('SUBMISSION_SENT'), true);
    assert.equal(isOutboundPlatformHistoryKind('INVENTORY_CHANGE'), false);
  });
});

describe('isOperatorAttestedChannelForHistory', () => {
  it('requires oauth for oauth-owned channels even when application is ACTIVE', () => {
    const ctx = makeCtx();
    assert.equal(
      isOperatorAttestedChannelForHistory(ctx, 'google-business-profile', 'veh-1'),
      false,
    );
  });

  it('requires dealerEnabled for external channels', () => {
    const ctx = makeCtx({
      accountBySlug: new Map([
        ['cars-com', { state: 'ACTIVE', dealerEnabled: false, autoSyncReadyInventory: true }],
      ]),
      applicationStatusBySlug: new Map([['cars-com', 'ACTIVE']]),
    });
    assert.equal(isOperatorAttestedChannelForHistory(ctx, 'cars-com', 'veh-1'), false);
  });

  it('rejects assisted channels stuck in SUBMITTED application state', () => {
    const ctx = makeCtx({
      accountBySlug: new Map([
        ['carfax-for-dealers', { state: 'ACTIVE', dealerEnabled: true, autoSyncReadyInventory: true }],
      ]),
      applicationStatusBySlug: new Map([['carfax-for-dealers', 'SUBMITTED']]),
      profileBySlug: new Map([
        ['carfax-for-dealers', platformProfiles.find(p => p.slug === 'carfax-for-dealers')!],
      ]),
    });
    assert.equal(isOperatorAttestedChannelForHistory(ctx, 'carfax-for-dealers', 'veh-1'), false);
  });

  it('allows consumer marketplace when vehicle has an active listing', () => {
    const ctx = makeCtx({
      activeMarketplaceVehicleIds: new Set(['veh-mp']),
      accountBySlug: new Map([
        [CONSUMER_MARKETPLACE_SLUG, { state: 'READY', dealerEnabled: false, autoSyncReadyInventory: true }],
      ]),
    });
    assert.equal(
      isOperatorAttestedChannelForHistory(ctx, CONSUMER_MARKETPLACE_SLUG, 'veh-mp'),
      true,
    );
  });
});

describe('isSyncEventVisibleForDealer', () => {
  it('always shows inventory events without a platform', () => {
    const ctx = makeCtx();
    assert.equal(
      isSyncEventVisibleForDealer({ kind: 'INVENTORY_CHANGE', platformSlug: null, vehicleId: 'v1' }, ctx),
      true,
    );
  });

  it('shows marketplace listing publishes regardless of oauth', () => {
    const ctx = makeCtx();
    assert.equal(
      isSyncEventVisibleForDealer({
        kind: 'SUBMISSION_SENT',
        platformSlug: CONSUMER_MARKETPLACE_SLUG,
        vehicleId: 'veh-1',
        payload: { source: 'marketplace_listing' },
      }, ctx),
      true,
    );
  });

  it('hides fake sends for unattested external platforms', () => {
    const ctx = makeCtx({
      accountBySlug: new Map(),
      applicationStatusBySlug: new Map(),
    });
    assert.equal(
      isSyncEventVisibleForDealer(
        { kind: 'SUBMISSION_SENT', platformSlug: 'snapchat-dynamic-product-ads', vehicleId: 'v1' },
        ctx,
      ),
      false,
    );
  });
});

describe('filterDealerHistoryEvents', () => {
  it('keeps inventory and marketplace listing rows, drops unattested sends', () => {
    const ctx = makeCtx({
      accountBySlug: new Map(),
      applicationStatusBySlug: new Map(),
    });
    const events = [
      { id: '1', kind: 'INVENTORY_CHANGE', platformSlug: null, vehicleId: 'v1' },
      {
        id: '2',
        kind: 'SUBMISSION_SENT',
        platformSlug: CONSUMER_MARKETPLACE_SLUG,
        vehicleId: 'v1',
        payload: { source: 'marketplace_listing' },
      },
      { id: '3', kind: 'SUBMISSION_SENT', platformSlug: 'google-business-profile', vehicleId: 'v1' },
    ];
    const filtered = filterDealerHistoryEvents(events, ctx);
    assert.deepEqual(filtered.map(e => e.id), ['1', '2']);
  });
});
