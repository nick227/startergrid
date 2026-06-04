import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  isValidHttpUrl,
  validateMediaUrls,
  validateListingUrls,
  checkPlatformStaleness
} from '../services/mediaValidationService.js';
import { pristineApiDealership, pristineApiVehicles } from '../fixtures/pristineApiValidation.fixture.js';
import { platformProfiles } from '../data/platformProfiles.js';
import type { VehiclePayload } from '../lib/types.js';

describe('isValidHttpUrl', () => {
  it('accepts a real HTTPS URL', () => {
    assert.ok(isValidHttpUrl('https://cdn.prairieridge-motors.com/vehicles/photo.jpg'));
  });

  it('accepts HTTP URL', () => {
    assert.ok(isValidHttpUrl('http://cdn.dealer.com/image.jpg'));
  });

  it('rejects empty string', () => {
    assert.ok(!isValidHttpUrl(''));
  });

  it('rejects URL without scheme', () => {
    assert.ok(!isValidHttpUrl('cdn.dealer.com/image.jpg'));
  });

  it('rejects localhost', () => {
    assert.ok(!isValidHttpUrl('http://localhost:3000/image.jpg'));
  });

  it('rejects placeholder URL with example.com', () => {
    assert.ok(!isValidHttpUrl('https://example.com/image.jpg'));
  });

  it('rejects placeholder keyword in URL', () => {
    assert.ok(!isValidHttpUrl('https://cdn.dealer.com/placeholder.jpg'));
  });

  it('rejects 127.0.0.1', () => {
    assert.ok(!isValidHttpUrl('http://127.0.0.1/image.jpg'));
  });
});

describe('validateMediaUrls', () => {
  it('returns only WARN (not FAIL) issues for pristine fixture URLs', () => {
    // Pristine fixture intentionally uses example.com placeholder URLs —
    // validator flags them as WARN, never FAIL.
    const issues = validateMediaUrls(pristineApiVehicles);
    const failIssues = issues.filter(i => i.severity === 'FAIL');
    assert.equal(failIssues.length, 0, 'media URL issues must be WARN, not FAIL');
  });

  it('returns MEDIA_URL_INVALID for a placeholder URL', () => {
    const vehicles: VehiclePayload[] = [{
      stockNumber: 'TEST-001',
      vin: '1HGCV1F30JA000001',
      year: 2021,
      make: 'Honda',
      model: 'Accord',
      trim: null,
      mileage: 10000,
      priceCents: 2000000,
      condition: 'USED',
      exteriorColor: 'White',
      media: [{ url: 'https://example.com/photo.jpg', kind: 'IMAGE', sortOrder: 0 }]
    }];
    const issues = validateMediaUrls(vehicles);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.code, 'MEDIA_URL_INVALID');
    assert.equal(issues[0]!.severity, 'WARN');
  });

  it('ignores non-IMAGE media kinds', () => {
    const vehicles: VehiclePayload[] = [{
      stockNumber: 'TEST-002',
      vin: '1HGCV1F30JA000002',
      year: 2021,
      make: 'Honda',
      model: 'Civic',
      trim: null,
      mileage: 5000,
      priceCents: 1800000,
      condition: 'USED',
      exteriorColor: 'Black',
      media: [{ url: 'https://example.com/video.mp4', kind: 'VIDEO', sortOrder: 0 }]
    }];
    const issues = validateMediaUrls(vehicles);
    assert.equal(issues.length, 0);
  });

  it('returns no issues when vehicles have no media', () => {
    const vehicles: VehiclePayload[] = [{ ...pristineApiVehicles[0]!, media: [] }];
    const issues = validateMediaUrls(vehicles);
    assert.equal(issues.length, 0);
  });

  it('returns one issue per invalid URL', () => {
    const vehicles: VehiclePayload[] = [{
      stockNumber: 'TEST-003',
      vin: '1HGCV1F30JA000003',
      year: 2020,
      make: 'Toyota',
      model: 'Camry',
      trim: null,
      mileage: 20000,
      priceCents: 1900000,
      condition: 'USED',
      exteriorColor: 'Silver',
      media: [
        { url: 'https://example.com/a.jpg', kind: 'IMAGE', sortOrder: 0 },
        { url: 'https://example.com/b.jpg', kind: 'IMAGE', sortOrder: 1 }
      ]
    }];
    const issues = validateMediaUrls(vehicles);
    assert.equal(issues.length, 2);
  });
});

describe('validateListingUrls', () => {
  it('pristine dealer websiteUrl is HTTPS (example.com placeholder only causes WARN)', () => {
    // Pristine fixture uses example.com — correctly flagged as WARN, not FAIL.
    const issues = validateListingUrls(pristineApiDealership, pristineApiVehicles);
    assert.ok(issues.every(i => i.severity === 'WARN'), 'listing URL issues must be WARN only');
  });

  it('returns LISTING_URL_INVALID when websiteUrl is missing', () => {
    const dealer = { ...pristineApiDealership, websiteUrl: null };
    const issues = validateListingUrls(dealer, pristineApiVehicles);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.code, 'LISTING_URL_INVALID');
  });

  it('returns LISTING_URL_INVALID when websiteUrl is example.com', () => {
    const dealer = { ...pristineApiDealership, websiteUrl: 'https://example.com' };
    const issues = validateListingUrls(dealer, pristineApiVehicles);
    assert.equal(issues.length, 1);
    assert.equal(issues[0]!.code, 'LISTING_URL_INVALID');
  });

  it('all listing issues carry LISTING_URL_INVALID code', () => {
    const dealer = { ...pristineApiDealership, websiteUrl: null };
    const issues = validateListingUrls(dealer, pristineApiVehicles);
    assert.ok(issues.every(i => i.code === 'LISTING_URL_INVALID'));
  });
});

describe('checkPlatformStaleness', () => {
  it('returns one entry per platform', () => {
    const results = checkPlatformStaleness(platformProfiles);
    assert.equal(results.length, platformProfiles.length);
  });

  it('fresh platforms have stale=false', () => {
    const freshPlatform = { ...platformProfiles[0]!, lastVerifiedAt: new Date().toISOString() };
    const results = checkPlatformStaleness([freshPlatform]);
    assert.ok(!results[0]!.stale);
  });

  it('old platforms have stale=true', () => {
    const oldDate = new Date(Date.now() - 200 * 24 * 60 * 60 * 1000).toISOString();
    const stalePlatform = { ...platformProfiles[0]!, lastVerifiedAt: oldDate };
    const results = checkPlatformStaleness([stalePlatform], 180);
    assert.ok(results[0]!.stale);
  });

  it('daysSinceVerified is a non-negative integer', () => {
    const results = checkPlatformStaleness(platformProfiles);
    assert.ok(results.every(r => Number.isInteger(r.daysSinceVerified) && r.daysSinceVerified >= 0));
  });

  it('respects custom threshold', () => {
    const oneDayAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
    const p = { ...platformProfiles[0]!, lastVerifiedAt: oneDayAgo };
    assert.ok(!checkPlatformStaleness([p], 30)[0]!.stale);
    assert.ok(checkPlatformStaleness([p], 1)[0]!.stale);
  });
});

describe('ValidationIssue named codes — backfilled in validators', () => {
  it('INVALID_VIN code is emitted by vehiclePayloadValidator', async () => {
    const { validateVehiclePayloads } = await import('../validators/vehiclePayloadValidator.js');
    const vehicles: VehiclePayload[] = [{ ...pristineApiVehicles[0]!, vin: 'BAD-VIN!!!' }];
    const issues = validateVehiclePayloads(vehicles, [], {});
    const vinIssue = issues.find(i => i.code === 'INVALID_VIN');
    assert.ok(vinIssue, 'expected INVALID_VIN issue');
    assert.equal(vinIssue!.severity, 'FAIL');
  });

  it('PRICE_SUSPICIOUS code is emitted by vehiclePayloadValidator', async () => {
    const { validateVehiclePayloads } = await import('../validators/vehiclePayloadValidator.js');
    const vehicles: VehiclePayload[] = [{ ...pristineApiVehicles[0]!, priceCents: 500 }];
    const issues = validateVehiclePayloads(vehicles, [], {});
    const priceIssue = issues.find(i => i.code === 'PRICE_SUSPICIOUS');
    assert.ok(priceIssue, 'expected PRICE_SUSPICIOUS issue');
    assert.equal(priceIssue!.severity, 'WARN');
  });

  it('MEDIA_MISSING code is emitted when minImages not met', async () => {
    const { validateVehiclePayloads } = await import('../validators/vehiclePayloadValidator.js');
    const vehicles: VehiclePayload[] = [{ ...pristineApiVehicles[0]!, media: [] }];
    const issues = validateVehiclePayloads(vehicles, [], { minImages: 3 });
    const mediaIssue = issues.find(i => i.code === 'MEDIA_MISSING');
    assert.ok(mediaIssue, 'expected MEDIA_MISSING issue');
    assert.equal(mediaIssue!.severity, 'FAIL');
  });
});
