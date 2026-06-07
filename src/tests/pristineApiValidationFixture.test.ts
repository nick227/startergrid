import assert from 'node:assert/strict';
import test from 'node:test';
import { platformProfiles } from '../data/platformProfiles.js';
import { pristineApiDealership, pristineApiVehicles } from '../fixtures/scenarios/pristineApiValidation.fixture.js';
import { validatePlatformReadiness, validatePlatformReadinessStrict } from '../validators/platform/platformReadinessValidator.js';

test('pristine API fixture passes baseline readiness for every automotive platform', () => {
  const automotivePlatforms = platformProfiles.filter(platform =>
    platform.supportedCategories.includes('AUTOMOTIVE'),
  );
  const failing = automotivePlatforms
    .map((platform) => ({ platform, report: validatePlatformReadiness(platform, pristineApiDealership, pristineApiVehicles) }))
    .filter(({ report }) => report.readiness !== 'GREEN' || report.issues.length > 0);

  assert.deepEqual(
    failing.map(({ platform, report }) => ({ platformSlug: platform.slug, readiness: report.readiness, issues: report.issues })),
    []
  );
});

test('pristine API fixture produces strict readiness without RED automotive platforms', () => {
  const automotivePlatforms = platformProfiles.filter(platform =>
    platform.supportedCategories.includes('AUTOMOTIVE'),
  );
  const red = automotivePlatforms
    .map((platform) => ({ platform, report: validatePlatformReadinessStrict(platform, pristineApiDealership, pristineApiVehicles) }))
    .filter(({ report }) => report.readiness === 'RED');

  assert.deepEqual(
    red.map(({ platform, report }) => ({ platformSlug: platform.slug, issues: report.issues })),
    []
  );
});

test('pristine API fixture carries documentation-grade dealer and inventory fields', () => {
  const dealerChannels = new Set(pristineApiDealership.desiredChannels);
  for (const platform of platformProfiles) {
    if (platform.supportedCategories.includes('AUTOMOTIVE')) {
      assert.ok(dealerChannels.has(platform.slug), `missing desired channel ${platform.slug}`);
    }
  }
  assert.equal(pristineApiVehicles.length >= 3, true);

  for (const vehicle of pristineApiVehicles) {
    assert.match(vehicle.vin ?? '', /^[A-HJ-NPR-Z0-9]{17}$/);
    assert.equal((vehicle.media ?? []).filter((item) => item.kind === 'IMAGE').length >= 4, true);
    assert.equal((vehicle.priceCents ?? 0) > 100000, true);
    assert.ok(vehicle.trim);
    assert.ok(vehicle.bodyStyle);
  }
});
