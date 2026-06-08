import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  deriveMarketplaceAvailabilityStatus,
  marketplaceCardAvailabilityStatus,
} from '../services/marketplace/marketplaceAvailability.js';

describe('deriveMarketplaceAvailabilityStatus', () => {
  it('returns AVAILABLE when soldAt/removedAt are missing', () => {
    assert.equal(deriveMarketplaceAvailabilityStatus({}), 'AVAILABLE');
    assert.equal(deriveMarketplaceAvailabilityStatus({ soldAt: null, removedAt: null }), 'AVAILABLE');
  });

  it('returns SOLD when soldAt is present', () => {
    assert.equal(deriveMarketplaceAvailabilityStatus({ soldAt: new Date(), removedAt: null }), 'SOLD');
  });

  it('returns SOLD when removedAt is present', () => {
    assert.equal(deriveMarketplaceAvailabilityStatus({ soldAt: null, removedAt: new Date() }), 'SOLD');
  });
});

describe('marketplaceCardAvailabilityStatus', () => {
  it('omits AVAILABLE on cards', () => {
    assert.equal(marketplaceCardAvailabilityStatus({ soldAt: null, removedAt: null }), undefined);
  });

  it('returns SOLD when soldAt is present', () => {
    assert.equal(marketplaceCardAvailabilityStatus({ soldAt: new Date(), removedAt: null }), 'SOLD');
  });
});

