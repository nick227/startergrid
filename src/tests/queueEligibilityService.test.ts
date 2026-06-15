import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canCreateInitialPublishQueueItem,
  CHANNEL_NOT_CONNECTED,
  ineligibleReasonForQueueItem,
  isPlatformOutboundEligible,
  isQueueItemOutboundEligible,
  vehicleChannelKey,
} from '../services/publishing/queueEligibilityService.js';

const AUTOMOTIVE = 'AUTOMOTIVE';

describe('isPlatformOutboundEligible', () => {
  it('requires ACTIVE account state', () => {
    assert.equal(
      isPlatformOutboundEligible({
        platformSlug: 'google-vehicle-ads',
        businessCategory: AUTOMOTIVE,
        accountState: 'SUBMITTED',
        desiredChannels: ['google-vehicle-ads'],
      }),
      false,
    );
    assert.equal(
      isPlatformOutboundEligible({
        platformSlug: 'google-vehicle-ads',
        businessCategory: AUTOMOTIVE,
        accountState: 'ACTIVE',
        desiredChannels: ['google-vehicle-ads'],
      }),
      true,
    );
  });

  it('requires platform in desiredChannels when list is non-empty', () => {
    assert.equal(
      isPlatformOutboundEligible({
        platformSlug: 'cars-com',
        businessCategory: AUTOMOTIVE,
        accountState: 'ACTIVE',
        desiredChannels: ['google-vehicle-ads'],
      }),
      false,
    );
  });

  it('rejects cross-category platforms', () => {
    assert.equal(
      isPlatformOutboundEligible({
        platformSlug: 'ebay-motors',
        businessCategory: 'EBOOKS',
        accountState: 'ACTIVE',
        desiredChannels: ['ebay-motors'],
      }),
      false,
    );
  });
});

describe('canCreateInitialPublishQueueItem', () => {
  const base = {
    integrationClass: 'FEEDABLE' as const,
    platformSlug: 'google-vehicle-ads',
    businessCategory: AUTOMOTIVE,
    accountState: 'ACTIVE',
    desiredChannels: ['google-vehicle-ads'],
    eligibleVehicleCount: 3,
    activeQueueItemStatus: null,
  };

  it('does not create for SUBMITTED-only account (not ACTIVE)', () => {
    assert.equal(
      canCreateInitialPublishQueueItem({ ...base, accountState: 'ACCOUNT_NEEDED' }),
      false,
    );
  });

  it('does not create without eligible inventory', () => {
    assert.equal(
      canCreateInitialPublishQueueItem({ ...base, eligibleVehicleCount: 0 }),
      false,
    );
  });

  it('does not create when an active queue item already exists', () => {
    assert.equal(
      canCreateInitialPublishQueueItem({ ...base, activeQueueItemStatus: 'SCHEDULED' }),
      false,
    );
  });

  it('creates for ACTIVE connected platform with inventory', () => {
    assert.equal(canCreateInitialPublishQueueItem(base), true);
  });

  it('never creates for OWNED integration class', () => {
    assert.equal(
      canCreateInitialPublishQueueItem({ ...base, integrationClass: 'OWNED' }),
      false,
    );
  });
});

describe('isQueueItemOutboundEligible', () => {
  const base = {
    platformSlug: 'google-vehicle-ads',
    businessCategory: AUTOMOTIVE,
    accountState: 'ACTIVE',
    desiredChannels: ['google-vehicle-ads'],
    eligibleVehicleCountForPlatform: 2,
    deselectedKeys: new Set<string>(),
  };

  it('platform-level INITIAL_PUBLISH needs eligible inventory', () => {
    assert.equal(
      isQueueItemOutboundEligible({ ...base, vehicleId: null, eligibleVehicleCountForPlatform: 0 }),
      false,
    );
    assert.equal(
      isQueueItemOutboundEligible({ ...base, vehicleId: null }),
      true,
    );
  });

  it('vehicle item blocked when deselected for channel', () => {
    const vehicleId = 'veh-1';
    const deselectedKeys = new Set([vehicleChannelKey(vehicleId, 'google-vehicle-ads')]);
    assert.equal(
      isQueueItemOutboundEligible({ ...base, vehicleId, deselectedKeys }),
      false,
    );
    assert.equal(
      ineligibleReasonForQueueItem({ ...base, vehicleId, deselectedKeys }),
      'Asset not selected for this channel',
    );
  });

  it('legacy unconnected platform rows are ineligible', () => {
    assert.equal(
      ineligibleReasonForQueueItem({
        ...base,
        vehicleId: null,
        accountState: 'ACCOUNT_NEEDED',
      }),
      CHANNEL_NOT_CONNECTED,
    );
  });
});
