import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateRequiredPaths, validateMediaRules } from '../validators/pathValidator.js';
import type { VehiclePayload } from '../lib/types.js';

const makeVehicle = (overrides: Partial<VehiclePayload>): VehiclePayload => ({
  stockNumber: 'V-001',
  ...overrides
});

describe('validateRequiredPaths', () => {
  it('returns no issues when all required paths are present', () => {
    const source = { name: 'Acme', address: { city: 'Austin' } };
    assert.equal(validateRequiredPaths(source, ['name', 'address.city'], 'Test').length, 0);
  });

  it('returns FAIL for undefined field', () => {
    const issues = validateRequiredPaths({}, ['name'], 'Test');
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'FAIL');
    assert.equal(issues[0].path, 'name');
  });

  it('returns FAIL for null field', () => {
    const issues = validateRequiredPaths({ name: null }, ['name'], 'Test');
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'FAIL');
  });

  it('returns FAIL for empty string', () => {
    const issues = validateRequiredPaths({ name: '' }, ['name'], 'Test');
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'FAIL');
  });

  it('resolves nested dot-notation paths', () => {
    const source = { address: { city: 'Austin' } };
    const issues = validateRequiredPaths(source, ['address.city', 'address.state'], 'Test');
    assert.equal(issues.length, 1);
    assert.equal(issues[0].path, 'address.state');
  });

  it('includes the label in the error message', () => {
    const issues = validateRequiredPaths({}, ['vin'], 'Vehicle STOCK-1');
    assert.ok(issues[0].message.includes('Vehicle STOCK-1'));
  });
});

describe('validateMediaRules', () => {
  it('returns no issues when media rules are satisfied', () => {
    const vehicles = [
      makeVehicle({ media: [{ kind: 'IMAGE', url: 'https://example.com/img.jpg', width: 800, height: 600 }] })
    ];
    const issues = validateMediaRules(vehicles, { minImages: 1, minWidth: 640, minHeight: 480 });
    assert.equal(issues.length, 0);
  });

  it('returns FAIL when image count is below minImages', () => {
    const issues = validateMediaRules([makeVehicle({ media: [] })], { minImages: 3 });
    assert.equal(issues.length, 1);
    assert.equal(issues[0].severity, 'FAIL');
  });

  it('returns FAIL when image width is below minWidth', () => {
    const vehicles = [
      makeVehicle({ media: [{ kind: 'IMAGE', url: 'https://example.com/img.jpg', width: 320, height: 600 }] })
    ];
    const issues = validateMediaRules(vehicles, { minImages: 1, minWidth: 640 });
    assert.equal(issues.length, 1);
    assert.ok(issues[0].message.includes('width'));
  });

  it('returns FAIL when image height is below minHeight', () => {
    const vehicles = [
      makeVehicle({ media: [{ kind: 'IMAGE', url: 'https://example.com/img.jpg', width: 800, height: 240 }] })
    ];
    const issues = validateMediaRules(vehicles, { minImages: 1, minHeight: 480 });
    assert.equal(issues.length, 1);
    assert.ok(issues[0].message.includes('height'));
  });

  it('does not count non-IMAGE media toward minImages', () => {
    const vehicles = [
      makeVehicle({ media: [{ kind: 'VIDEO', url: 'https://example.com/v.mp4' }] })
    ];
    const issues = validateMediaRules(vehicles, { minImages: 1 });
    assert.equal(issues.length, 1);
  });
});
