import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateBody, jsonIngestSchema } from '../server/requestValidation.js';
import { DEFAULT_JSON_SOURCE } from '../services/inventory/ingressService.js';
import type { IngestVehicleInput, JsonIngestResult } from '../services/inventory/importService.js';

// ── DEFAULT_JSON_SOURCE constant ──────────────────────────────────────────────

describe('DEFAULT_JSON_SOURCE', () => {
  it('has slug json-manual', () => {
    assert.equal(DEFAULT_JSON_SOURCE.slug, 'json-manual');
  });
  it('has kind JSON', () => {
    assert.equal(DEFAULT_JSON_SOURCE.kind, 'JSON');
  });
  it('has a non-empty label', () => {
    assert.ok(DEFAULT_JSON_SOURCE.label.length > 0);
  });
});

// ── jsonIngestSchema validation ───────────────────────────────────────────────

const minimalVehicle = {
  stockNumber:   'A001',
  vin:           '1HGCM82633A123456',
  year:          2023,
  make:          'Honda',
  model:         'Accord',
  mileage:       10000,
  priceCents:    2500000,
  condition:     'USED',
  exteriorColor: 'Silver',
};

describe('jsonIngestSchema — valid inputs', () => {
  it('accepts a minimal payload with one vehicle', () => {
    const r = validateBody(jsonIngestSchema, { vehicles: [minimalVehicle] });
    assert.ok(r.ok);
  });

  it('accepts full optional metadata', () => {
    const r = validateBody(jsonIngestSchema, {
      sourceSlug:  'dealer-feed',
      sourceLabel: 'Dealer DMS Feed',
      mode:        'upsert',
      vehicles:    [minimalVehicle],
    });
    assert.ok(r.ok);
  });

  it('accepts all optional vehicle fields', () => {
    const r = validateBody(jsonIngestSchema, {
      vehicles: [{
        ...minimalVehicle,
        trim:          'EX-L',
        bodyStyle:     'Sedan',
        interiorColor: 'Black',
        drivetrain:    'FWD',
        fuelType:      'GAS',
        transmission:  'AUTOMATIC',
        photoUrls:     ['https://example.com/photo.jpg'],
      }],
    });
    assert.ok(r.ok);
  });

  it('accepts multiple vehicles', () => {
    const r = validateBody(jsonIngestSchema, {
      vehicles: [
        minimalVehicle,
        { ...minimalVehicle, stockNumber: 'A002', vin: '1HGCM82633A654321' },
      ],
    });
    assert.ok(r.ok);
  });

  it('condition NEW accepted', () => {
    const r = validateBody(jsonIngestSchema, { vehicles: [{ ...minimalVehicle, condition: 'NEW' }] });
    assert.ok(r.ok);
  });

  it('condition CPO accepted', () => {
    const r = validateBody(jsonIngestSchema, { vehicles: [{ ...minimalVehicle, condition: 'CPO' }] });
    assert.ok(r.ok);
  });
});

describe('jsonIngestSchema — invalid inputs', () => {
  it('rejects empty vehicles array', () => {
    const r = validateBody(jsonIngestSchema, { vehicles: [] });
    assert.ok(!r.ok);
  });

  it('rejects missing vehicles key', () => {
    const r = validateBody(jsonIngestSchema, { sourceSlug: 'x' });
    assert.ok(!r.ok);
  });

  it('rejects unknown top-level keys (strict)', () => {
    const r = validateBody(jsonIngestSchema, { vehicles: [minimalVehicle], extra: 'oops' });
    assert.ok(!r.ok);
  });

  it('rejects unknown vehicle keys (strict)', () => {
    const r = validateBody(jsonIngestSchema, {
      vehicles: [{ ...minimalVehicle, unknownField: 'oops' }],
    });
    assert.ok(!r.ok);
  });

  it('rejects invalid condition', () => {
    const r = validateBody(jsonIngestSchema, { vehicles: [{ ...minimalVehicle, condition: 'LEASED' }] });
    assert.ok(!r.ok);
  });

  it('rejects invalid mode', () => {
    const r = validateBody(jsonIngestSchema, { vehicles: [minimalVehicle], mode: 'replace' });
    assert.ok(!r.ok);
  });

  it('rejects priceCents of 0', () => {
    const r = validateBody(jsonIngestSchema, { vehicles: [{ ...minimalVehicle, priceCents: 0 }] });
    assert.ok(!r.ok);
  });

  it('rejects year below 1900', () => {
    const r = validateBody(jsonIngestSchema, { vehicles: [{ ...minimalVehicle, year: 1899 }] });
    assert.ok(!r.ok);
  });

  it('rejects year above 2100', () => {
    const r = validateBody(jsonIngestSchema, { vehicles: [{ ...minimalVehicle, year: 2101 }] });
    assert.ok(!r.ok);
  });

  it('rejects missing stockNumber', () => {
    const { stockNumber: _, ...noStock } = minimalVehicle;
    const r = validateBody(jsonIngestSchema, { vehicles: [noStock] });
    assert.ok(!r.ok);
  });

  it('rejects missing vin', () => {
    const { vin: _, ...noVin } = minimalVehicle;
    const r = validateBody(jsonIngestSchema, { vehicles: [noVin] });
    assert.ok(!r.ok);
  });

  it('rejects non-https photoUrl', () => {
    const r = validateBody(jsonIngestSchema, {
      vehicles: [{ ...minimalVehicle, photoUrls: ['not-a-url'] }],
    });
    assert.ok(!r.ok);
  });
});

// ── Type shape coverage ───────────────────────────────────────────────────────

describe('IngestVehicleInput type', () => {
  it('accepts a fully specified vehicle', () => {
    const v: IngestVehicleInput = {
      stockNumber:   'A001',
      vin:           '1HGCM82633A123456',
      year:          2024,
      make:          'Honda',
      model:         'Accord',
      trim:          'EX-L',
      mileage:       5000,
      priceCents:    2800000,
      condition:     'NEW',
      exteriorColor: 'White',
      interiorColor: 'Black',
      bodyStyle:     'Sedan',
      drivetrain:    'FWD',
      fuelType:      'GAS',
      transmission:  'AUTOMATIC',
      photoUrls:     ['https://example.com/photo.jpg'],
    };
    assert.equal(v.condition, 'NEW');
    assert.equal(v.priceCents, 2800000);
  });

  it('accepts a minimal vehicle (optional fields omitted)', () => {
    const v: IngestVehicleInput = {
      stockNumber: 'B001', vin: '1HGCM82633A000001',
      year: 2022, make: 'Toyota', model: 'Camry',
      mileage: 0, priceCents: 3000000, condition: 'NEW', exteriorColor: 'Black',
    };
    assert.equal(v.trim, undefined);
    assert.equal(v.photoUrls, undefined);
  });
});

describe('JsonIngestResult type', () => {
  it('represents a COMMITTED result', () => {
    const r: JsonIngestResult = {
      status: 'COMMITTED', created: 5, updated: 2, skipped: 1,
      errors: 0, vehicleCount: 8, ingressRunId: 'run-1', batchId: 'evt-1',
    };
    assert.equal(r.status, 'COMMITTED');
    assert.equal(r.vehicleCount, 8);
  });

  it('represents a PARTIAL result', () => {
    const r: JsonIngestResult = {
      status: 'PARTIAL', created: 3, updated: 0, skipped: 0,
      errors: 2, vehicleCount: 5, ingressRunId: 'run-2', batchId: 'evt-2',
    };
    assert.equal(r.status, 'PARTIAL');
    assert.equal(r.errors, 2);
  });

  it('represents a FAILED result', () => {
    const r: JsonIngestResult = {
      status: 'FAILED', created: 0, updated: 0, skipped: 0,
      errors: 3, vehicleCount: 3, ingressRunId: 'run-3', batchId: 'evt-3',
    };
    assert.equal(r.status, 'FAILED');
  });
});
