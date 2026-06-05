import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { SourceCheckResult } from '../services/inventory/sourceCheckService.js';
import { validateBody, jsonIngestSchema } from '../server/requestValidation.js';

// ── SourceCheckResult type shape ──────────────────────────────────────────────

describe('SourceCheckResult type', () => {
  it('represents a successful check', () => {
    const r: SourceCheckResult = {
      success:      true,
      vehicleCount: 3,
      created:      2,
      updated:      1,
      skipped:      0,
      errors:       0,
      ingressRunId: 'run-abc',
      checkedAt:    new Date().toISOString(),
    };
    assert.ok(r.success);
    assert.equal(r.vehicleCount, 3);
    assert.equal(r.error, undefined);
  });

  it('represents a failed check', () => {
    const r: SourceCheckResult = {
      success:   false,
      error:     'Feed returned HTTP 404 Not Found',
      checkedAt: new Date().toISOString(),
    };
    assert.ok(!r.success);
    assert.ok(r.error?.includes('404'));
    assert.equal(r.vehicleCount, undefined);
  });

  it('represents a validation failure', () => {
    const r: SourceCheckResult = {
      success:   false,
      error:     'Feed validation failed: vehicles: Required',
      checkedAt: new Date().toISOString(),
    };
    assert.ok(!r.success);
    assert.ok(r.error?.includes('validation failed'));
  });
});

// ── Feed payload validation (what checkApiInventorySource validates) ──────────

const validVehicle = {
  stockNumber: 'T001', vin: '1HGCM82633A004352',
  year: 2023, make: 'Honda', model: 'Accord',
  mileage: 5000, priceCents: 2500000,
  condition: 'USED', exteriorColor: 'Silver',
};

describe('feed payload validation', () => {
  it('accepts a valid vehicles array', () => {
    const r = validateBody(jsonIngestSchema, { vehicles: [validVehicle] });
    assert.ok(r.ok);
  });

  it('rejects a non-object payload', () => {
    const r = validateBody(jsonIngestSchema, [validVehicle]);
    assert.ok(!r.ok);
  });

  it('rejects a payload missing vehicles key', () => {
    const r = validateBody(jsonIngestSchema, { data: [] });
    assert.ok(!r.ok);
  });

  it('rejects a payload with empty vehicles array', () => {
    const r = validateBody(jsonIngestSchema, { vehicles: [] });
    assert.ok(!r.ok);
  });

  it('rejects a vehicle with invalid condition', () => {
    const r = validateBody(jsonIngestSchema, {
      vehicles: [{ ...validVehicle, condition: 'FLEET' }],
    });
    assert.ok(!r.ok);
  });

  it('accepts sourceSlug / sourceLabel passthrough from feed', () => {
    const r = validateBody(jsonIngestSchema, {
      sourceSlug: 'upstream-dms',
      vehicles: [validVehicle],
    });
    assert.ok(r.ok);
  });
});

// ── Constants ─────────────────────────────────────────────────────────────────

describe('sourceCheckService exports', () => {
  it('exports SourceCheckResult type (compile-time only check)', () => {
    const dummy: SourceCheckResult = { success: false, checkedAt: new Date().toISOString() };
    assert.equal(typeof dummy.success, 'boolean');
    assert.equal(typeof dummy.checkedAt, 'string');
  });
});
