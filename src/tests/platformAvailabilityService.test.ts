import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  defaultAutoSyncReadyInventory,
  filterOfferedPlatformProfiles,
  parseDesiredChannels,
  resolveAutoSyncReadyInventory,
  resolveDealerPlatformEnabled,
  resolveSiteEnabled,
} from '../services/platform/platformAvailabilityService.js';

describe('resolveSiteEnabled', () => {
  it('defaults to enabled when no row', () => {
    assert.equal(resolveSiteEnabled('cars-com', new Map()), true);
  });

  it('respects explicit disable', () => {
    assert.equal(resolveSiteEnabled('cars-com', new Map([['cars-com', false]])), false);
  });
});

describe('filterOfferedPlatformProfiles', () => {
  it('removes admin-disabled platforms from dealer-facing profile lists', () => {
    const profiles = [
      { slug: 'consumer-marketplace', name: 'Marketplace' },
      { slug: 'cars-com', name: 'Cars.com' },
    ];
    const filtered = filterOfferedPlatformProfiles(
      profiles,
      new Map([['cars-com', false]]),
    );
    assert.deepEqual(filtered.map(p => p.slug), ['consumer-marketplace']);
  });
});

describe('resolveDealerPlatformEnabled', () => {
  it('honors explicit dealer toggle off', () => {
    assert.equal(resolveDealerPlatformEnabled(false, ['cars-com'], 'cars-com'), false);
  });

  it('honors explicit dealer toggle on', () => {
    assert.equal(resolveDealerPlatformEnabled(true, [], 'cars-com'), true);
  });

  it('falls back to desired channels when unset', () => {
    assert.equal(resolveDealerPlatformEnabled(null, ['cars-com'], 'cars-com'), true);
    assert.equal(resolveDealerPlatformEnabled(undefined, ['google-vehicle-ads'], 'cars-com'), false);
  });
});

describe('resolveAutoSyncReadyInventory', () => {
  it('defaults marketplace to on', () => {
    assert.equal(resolveAutoSyncReadyInventory('consumer-marketplace', null), true);
    assert.equal(defaultAutoSyncReadyInventory('consumer-marketplace'), true);
  });

  it('non-auto-sync platforms always true', () => {
    assert.equal(resolveAutoSyncReadyInventory('cars-com', false), true);
  });
});

describe('parseDesiredChannels', () => {
  it('filters non-strings', () => {
    assert.deepEqual(parseDesiredChannels(['a', 1, 'b']), ['a', 'b']);
  });
});
