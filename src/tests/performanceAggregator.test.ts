import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildVehiclePerformanceRows } from '../services/performance/performanceAggregator.js';

describe('performanceAggregator', () => {
  it('builds vehicle rows with movement signal and platform assists', () => {
    const now = new Date('2026-06-05T12:00:00.000Z');
    const rows = buildVehiclePerformanceRows(
      [{
        id: 'v1',
        stockNumber: 'A1',
        make: 'Honda',
        model: 'Civic',
        year: 2022,
        priceCents: 2_000_000,
        condition: 'USED',
        createdAt: new Date('2026-05-01T12:00:00.000Z'),
        soldAt: null,
        removedAt: null,
      }],
      [{ vehicleId: 'v1', platformSlug: 'dealer-storefront' }],
      now
    );

    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.daysOnline, 35);
    assert.equal(rows[0]!.platformAssistsJson['dealer-storefront']?.leads, 1);
  });
});
