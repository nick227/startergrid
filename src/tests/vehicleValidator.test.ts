import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateVehiclePayloads } from '../validators/vehicle/vehiclePayloadValidator.js';
import type { VehiclePayload } from '../lib/types.js';

const baseVehicle: VehiclePayload = {
  vin: '1HGBH41JXMN109186',
  stockNumber: 'S-001',
  year: 2022,
  make: 'Honda',
  model: 'Civic',
  priceCents: 2500000,
  condition: 'USED',
  exteriorColor: 'White',
  media: [{ kind: 'IMAGE', url: 'https://example.com/img.jpg', width: 800, height: 600 }]
};

describe('validateVehiclePayloads', () => {
  it('returns no issues for valid vehicles', () => {
    const issues = validateVehiclePayloads([baseVehicle], ['vin', 'stockNumber', 'make', 'model'], {});
    assert.equal(issues.length, 0);
  });

  it('returns FAIL for a missing required field', () => {
    const vehicle = { ...baseVehicle, make: '' };
    const issues = validateVehiclePayloads([vehicle], ['make'], {});
    assert.ok(issues.some(i => i.path === 'make' && i.severity === 'FAIL'));
  });

  it('returns FAIL for VIN with invalid characters', () => {
    const vehicle = { ...baseVehicle, vin: 'BADVIN###' };
    const issues = validateVehiclePayloads([vehicle], [], {});
    assert.ok(issues.some(i => i.path.includes('vin') && i.severity === 'FAIL'));
  });

  it('returns FAIL for VIN containing the reserved character I', () => {
    const vehicle = { ...baseVehicle, vin: '1HGBI41JXMN109186' };
    const issues = validateVehiclePayloads([vehicle], [], {});
    assert.ok(issues.some(i => i.path.includes('vin') && i.severity === 'FAIL'));
  });

  it('returns FAIL for VIN shorter than 10 characters', () => {
    const vehicle = { ...baseVehicle, vin: 'SHORT' };
    const issues = validateVehiclePayloads([vehicle], [], {});
    assert.ok(issues.some(i => i.path.includes('vin') && i.severity === 'FAIL'));
  });

  it('does not warn about low price for digital distribution categories', () => {
    const vehicle = { ...baseVehicle, priceCents: 999 };
    const issues = validateVehiclePayloads([vehicle], [], {}, { businessCategory: 'SONGS' });
    assert.equal(issues.filter(i => i.code === 'PRICE_SUSPICIOUS').length, 0);
  });

  it('returns WARN when priceCents is below $1000 (100000 cents)', () => {
    const vehicle = { ...baseVehicle, priceCents: 95000 };
    const issues = validateVehiclePayloads([vehicle], [], {});
    assert.ok(issues.some(i => i.path.includes('priceCents') && i.severity === 'WARN'));
  });

  it('does not warn about price at exactly $1000', () => {
    const vehicle = { ...baseVehicle, priceCents: 100000 };
    const issues = validateVehiclePayloads([vehicle], [], {});
    assert.equal(issues.filter(i => i.path.includes('priceCents')).length, 0);
  });

  it('returns FAIL when media count is below platform minImages', () => {
    const vehicle = { ...baseVehicle, media: [] };
    const issues = validateVehiclePayloads([vehicle], [], { minImages: 3 });
    assert.ok(issues.some(i => i.severity === 'FAIL' && i.message.includes('images')));
  });

  it('validates each vehicle independently', () => {
    const good = baseVehicle;
    const bad = { ...baseVehicle, stockNumber: 'S-002', vin: 'BADVIN###' };
    const issues = validateVehiclePayloads([good, bad], [], {});
    assert.ok(issues.every(i => i.path.includes('S-002')));
  });
});
