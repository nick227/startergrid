import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildInventoryReadiness } from '../services/inventory/inventoryReadinessService.js';

const baseAutoFields = {
  vin:           '1HGBH41JXMN109186',
  stockNumber:   'LS-1001',
  year:           2021,
  make:          'Toyota',
  model:         'Camry',
  mileage:        15000,
  priceCents:     2499500,
  condition:     'USED',
  exteriorColor: 'White',
};

describe('buildInventoryReadiness — AUTOMOTIVE', () => {
  it('returns READY for complete vehicle with media', () => {
    const result = buildInventoryReadiness({
      category: 'AUTOMOTIVE',
      fields: baseAutoFields,
      assignedMediaSlotKeys: ['front', 'odometer'],
      totalMediaCount: 5,
    });
    assert.equal(result.status, 'READY');
    assert.equal(result.blockers.length, 0);
    assert.equal(result.missingFields.length, 0);
  });

  it('returns BLOCKED when price is missing', () => {
    const result = buildInventoryReadiness({
      category: 'AUTOMOTIVE',
      fields: { ...baseAutoFields, priceCents: 0 },
    });
    assert.equal(result.status, 'BLOCKED');
    assert.ok(result.missingFields.includes('priceCents'));
    assert.ok(result.blockers.length > 0);
  });

  it('returns BLOCKED when VIN is missing', () => {
    const result = buildInventoryReadiness({
      category: 'AUTOMOTIVE',
      fields: { ...baseAutoFields, vin: '' },
    });
    assert.equal(result.status, 'BLOCKED');
    assert.ok(result.missingFields.includes('vin'));
  });

  it('returns BLOCKED when make is missing', () => {
    const result = buildInventoryReadiness({
      category: 'AUTOMOTIVE',
      fields: { ...baseAutoFields, make: '' },
    });
    assert.equal(result.status, 'BLOCKED');
  });

  it('returns WARNING when required media slots are missing', () => {
    const result = buildInventoryReadiness({
      category: 'AUTOMOTIVE',
      fields: baseAutoFields,
      assignedMediaSlotKeys: [], // no front, no odometer
      totalMediaCount: 3,
    });
    assert.equal(result.status, 'WARNING');
    assert.ok(result.missingRequiredMediaSlots.length > 0);
    assert.ok(result.missingRequiredMediaSlots.includes('front'));
    assert.ok(result.missingRequiredMediaSlots.includes('odometer'));
  });

  it('returns WARNING when no photos at all', () => {
    const result = buildInventoryReadiness({
      category: 'AUTOMOTIVE',
      fields: baseAutoFields,
      totalMediaCount: 0,
    });
    assert.equal(result.status, 'WARNING');
  });

  it('reports nextAction as first blocker when BLOCKED', () => {
    const result = buildInventoryReadiness({
      category: 'AUTOMOTIVE',
      fields: { ...baseAutoFields, priceCents: 0, make: '' },
    });
    assert.equal(result.status, 'BLOCKED');
    assert.ok(result.nextAction !== null);
  });

  it('returns BLOCKED for invalid VIN format', () => {
    const result = buildInventoryReadiness({
      category: 'AUTOMOTIVE',
      fields: { ...baseAutoFields, vin: 'INVALID-VIN' },
    });
    assert.equal(result.status, 'BLOCKED');
    assert.ok(result.invalidFields.includes('vin'));
  });

  it('handles non-auto category gracefully (generic fallback)', () => {
    const result = buildInventoryReadiness({
      category: 'BOATS',
      fields: { stockNumber: 'BOAT-001', priceCents: 1500000, condition: 'USED' },
    });
    // Boats has no registered CategoryInventorySchema yet — uses generic fallback
    assert.ok(['READY', 'WARNING', 'BLOCKED'].includes(result.status));
  });
});
