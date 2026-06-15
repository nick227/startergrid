import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  canCreateInitialPublishQueueItem,
  CHANNEL_NOT_CONNECTED,
  ineligibleReasonForQueueItem,
  isPlatformOutboundEligible,
  isQueueItemOutboundEligible,
  OAUTH_NOT_CONNECTED,
  OPERATOR_QUEUE_EXCLUDED_SLUGS,
  vehicleChannelKey,
} from '../services/publishing/queueEligibilityService.js';

const AUTOMOTIVE = 'AUTOMOTIVE';

const FEEDABLE_CTX = {
  platformSlug: 'cars-com',
  integrationClass: 'FEEDABLE' as const,
  businessCategory: AUTOMOTIVE,
  accountState: 'ACTIVE',
  desiredChannels: ['cars-com'],
  oauthProvider: null,
  oauthConnected: true,
};

describe('isPlatformOutboundEligible', () => {
  it('requires ACTIVE account state', () => {
    assert.equal(
      isPlatformOutboundEligible({ ...FEEDABLE_CTX, accountState: 'SUBMITTED' }),
      false,
    );
    assert.equal(isPlatformOutboundEligible(FEEDABLE_CTX), true);
  });

  it('requires platform in desiredChannels when not yet connected', () => {
    assert.equal(
      isPlatformOutboundEligible({
        ...FEEDABLE_CTX,
        accountState: 'CREDENTIALS_NEEDED',
        desiredChannels: ['google-vehicle-ads'],
      }),
      false,
    );
  });

  it('requires oauth when platform uses oauth', () => {
    assert.equal(
      isPlatformOutboundEligible({
        platformSlug: 'facebook-business-page',
        integrationClass: 'OWNED',
        businessCategory: AUTOMOTIVE,
        accountState: 'ACTIVE',
        desiredChannels: ['facebook-business-page'],
        oauthProvider: 'facebook-business-page',
        oauthConnected: false,
      }),
      false,
    );
  });

  it('excludes legacy dealer-storefront from operator queue', () => {
    assert.equal(OPERATOR_QUEUE_EXCLUDED_SLUGS.has('dealer-storefront'), true);
    assert.equal(
      isPlatformOutboundEligible({
        platformSlug: 'dealer-storefront',
        integrationClass: 'OWNED',
        businessCategory: AUTOMOTIVE,
        accountState: 'ACTIVE',
        desiredChannels: ['dealer-storefront'],
        oauthProvider: null,
        oauthConnected: true,
      }),
      false,
    );
  });
});

describe('canCreateInitialPublishQueueItem', () => {
  const base = {
    integrationClass: 'FEEDABLE' as const,
    platformSlug: 'cars-com',
    businessCategory: AUTOMOTIVE,
    accountState: 'ACTIVE',
    desiredChannels: ['cars-com'],
    eligibleVehicleCount: 3,
    activeQueueItemStatus: null,
    oauthProvider: null,
    oauthConnected: true,
  };

  it('does not create for unconnected account', () => {
    assert.equal(canCreateInitialPublishQueueItem({ ...base, accountState: 'ACCOUNT_NEEDED' }), false);
  });

  it('does not create without eligible inventory', () => {
    assert.equal(canCreateInitialPublishQueueItem({ ...base, eligibleVehicleCount: 0 }), false);
  });

  it('creates for ACTIVE connected platform with inventory', () => {
    assert.equal(canCreateInitialPublishQueueItem(base), true);
  });
});

describe('isQueueItemOutboundEligible', () => {
  const base = {
    platformSlug: 'cars-com',
    integrationClass: 'FEEDABLE' as const,
    businessCategory: AUTOMOTIVE,
    accountState: 'ACTIVE',
    desiredChannels: ['cars-com'],
    eligibleVehicleCountForPlatform: 2,
    deselectedKeys: new Set<string>(),
    oauthProvider: null,
    oauthConnected: true,
  };

  it('vehicle item blocked when deselected for channel', () => {
    const vehicleId = 'veh-1';
    const deselectedKeys = new Set([vehicleChannelKey(vehicleId, 'cars-com')]);
    assert.equal(isQueueItemOutboundEligible({ ...base, vehicleId, deselectedKeys }), false);
  });

  it('oauth-required platform without token is ineligible', () => {
    assert.equal(
      ineligibleReasonForQueueItem({
        ...base,
        vehicleId: 'veh-1',
        platformSlug: 'facebook-business-page',
        integrationClass: 'OWNED',
        oauthProvider: 'facebook-business-page',
        oauthConnected: false,
      }),
      OAUTH_NOT_CONNECTED,
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
