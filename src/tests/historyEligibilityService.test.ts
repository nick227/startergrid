import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  filterDealerHistoryEvents,
  isOutboundPlatformHistoryKind,
  isPlatformHistoryEligible,
  isSyncEventVisibleForDealer,
  type DealerOutboundContext,
} from '../services/publishing/historyEligibilityService.js';
import { platformProfiles } from '../data/platformProfiles.js';

const AUTOMOTIVE = 'AUTOMOTIVE';

function makeCtx(overrides: Partial<DealerOutboundContext> = {}): DealerOutboundContext {
  const carsProfile = platformProfiles.find(p => p.slug === 'cars-com')!;
  return {
    dealershipId: 'dealer-1',
    businessCategory: AUTOMOTIVE,
    desiredChannels: ['cars-com'],
    siteAvailability: new Map([['cars-com', true]]),
    accountBySlug: new Map([
      ['cars-com', { state: 'ACTIVE', dealerEnabled: true, autoSyncReadyInventory: true }],
    ]),
    liveOAuth: new Set(),
    deselectedKeys: new Set(),
    eligibleVehicleCountByPlatform: new Map([['cars-com', 3]]),
    profileBySlug: new Map([['cars-com', carsProfile]]),
    ...overrides,
  };
}

describe('isOutboundPlatformHistoryKind', () => {
  it('classifies dispatch and approval kinds as outbound platform history', () => {
    assert.equal(isOutboundPlatformHistoryKind('SUBMISSION_SENT'), true);
    assert.equal(isOutboundPlatformHistoryKind('DISPATCH_CLAIMED'), true);
    assert.equal(isOutboundPlatformHistoryKind('APPROVAL_REQUESTED'), true);
    assert.equal(isOutboundPlatformHistoryKind('INVENTORY_CHANGE'), false);
  });
});

describe('isPlatformHistoryEligible', () => {
  it('requires ACTIVE connected account for outbound history', () => {
    const ctx = makeCtx();
    assert.equal(isPlatformHistoryEligible(ctx, 'cars-com', 'veh-1'), true);
    assert.equal(
      isPlatformHistoryEligible(
        makeCtx({
          accountBySlug: new Map([
            ['cars-com', { state: 'ACCOUNT_NEEDED', dealerEnabled: true, autoSyncReadyInventory: true }],
          ]),
        }),
        'cars-com',
        'veh-1',
      ),
      false,
    );
  });

  it('requires dealer platform enabled', () => {
    const ctx = makeCtx({
      accountBySlug: new Map([
        ['cars-com', { state: 'ACTIVE', dealerEnabled: false, autoSyncReadyInventory: true }],
      ]),
      desiredChannels: [],
    });
    assert.equal(isPlatformHistoryEligible(ctx, 'cars-com', 'veh-1'), false);
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

  it('hides outbound platform events for ineligible channels', () => {
    const ctx = makeCtx({
      accountBySlug: new Map([
        ['cars-com', { state: 'ACCOUNT_NEEDED', dealerEnabled: false, autoSyncReadyInventory: true }],
      ]),
      desiredChannels: [],
    });
    assert.equal(
      isSyncEventVisibleForDealer(
        { kind: 'SUBMISSION_SENT', platformSlug: 'cars-com', vehicleId: 'v1' },
        ctx,
      ),
      false,
    );
    assert.equal(
      isSyncEventVisibleForDealer(
        { kind: 'APPROVAL_REQUESTED', platformSlug: 'cars-com', vehicleId: 'v1' },
        ctx,
      ),
      false,
    );
  });
});

describe('filterDealerHistoryEvents', () => {
  it('keeps inventory rows and drops fake sends for unconnected platforms', () => {
    const ctx = makeCtx({
      accountBySlug: new Map(),
      desiredChannels: [],
      eligibleVehicleCountByPlatform: new Map(),
    });
    const events = [
      { id: '1', kind: 'INVENTORY_CHANGE', platformSlug: null, vehicleId: 'v1' },
      { id: '2', kind: 'SUBMISSION_SENT', platformSlug: 'google-business-profile', vehicleId: 'v1' },
      { id: '3', kind: 'APPROVAL_REQUESTED', platformSlug: 'carfax-for-dealers', vehicleId: 'v1' },
    ];
    const filtered = filterDealerHistoryEvents(events, ctx);
    assert.deepEqual(filtered.map(e => e.id), ['1']);
  });
});
