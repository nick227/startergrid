import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildPlatformRowsFromEvents,
  buildVehiclePerformanceRows,
  type SyncSubmissionEvent,
  type VehiclePerfInput,
} from '../services/performance/performanceAggregator.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const NOW = new Date('2026-06-05T12:00:00.000Z');

function days(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}

const BASE_VEHICLE: VehiclePerfInput = {
  id:          'v1',
  stockNumber: 'S001',
  make:        'Toyota',
  model:       'Camry',
  year:        2022,
  priceCents:  2_500_000,
  condition:   'USED',
  createdAt:   days(30),
  soldAt:      null,
  removedAt:   null,
};

// ── buildPlatformRowsFromEvents ───────────────────────────────────────────────

describe('buildPlatformRowsFromEvents', () => {
  it('returns empty array when there are no submissions', () => {
    const rows = buildPlatformRowsFromEvents([BASE_VEHICLE], [], [], [], NOW);
    assert.equal(rows.length, 0);
  });

  it('skips events with null vehicleId or platformSlug', () => {
    const bad: SyncSubmissionEvent[] = [
      { vehicleId: null,  platformSlug: 'autotrader', createdAt: days(20) },
      { vehicleId: 'v1',  platformSlug: null,         createdAt: days(20) },
    ];
    const rows = buildPlatformRowsFromEvents([BASE_VEHICLE], bad, [], [], NOW);
    assert.equal(rows.length, 0);
  });

  it('creates one row per distinct platform slug', () => {
    const subs: SyncSubmissionEvent[] = [
      { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(25) },
      { vehicleId: 'v1', platformSlug: 'cars.com',   createdAt: days(20) },
    ];
    const rows = buildPlatformRowsFromEvents([BASE_VEHICLE], subs, [], [], NOW);
    const slugs = rows.map(r => r.platformSlug).sort();
    assert.deepEqual(slugs, ['autotrader', 'cars.com']);
  });

  it('sets vehiclesListed to the count of distinct vehicles listed on the platform', () => {
    const v2: VehiclePerfInput = { ...BASE_VEHICLE, id: 'v2', stockNumber: 'S002' };
    const subs: SyncSubmissionEvent[] = [
      { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(25) },
      { vehicleId: 'v2', platformSlug: 'autotrader', createdAt: days(20) },
    ];
    const rows = buildPlatformRowsFromEvents([BASE_VEHICLE, v2], subs, [], [], NOW);
    assert.equal(rows[0]!.vehiclesListed, 2);
  });

  it('deduplicates multiple SUBMISSION_SENT events for the same vehicle+platform', () => {
    const subs: SyncSubmissionEvent[] = [
      { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(25) },
      { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(10) },
      { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(5)  },
    ];
    const rows = buildPlatformRowsFromEvents([BASE_VEHICLE], subs, [], [], NOW);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.vehiclesListed, 1);
  });

  it('uses first submission date (not subsequent) when computing avgDaysToMove', () => {
    // Vehicle created 30 days ago, first submitted 25 days ago, re-submitted 10 days ago
    // Vehicle sold 15 days ago → daysToMove from first submit = 25 - 15 = 10 days
    const soldVehicle: VehiclePerfInput = { ...BASE_VEHICLE, soldAt: days(15) };
    const subs: SyncSubmissionEvent[] = [
      { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(25) },
      { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(10) },
    ];
    const rows = buildPlatformRowsFromEvents([soldVehicle], subs, [], [], NOW);
    assert.equal(rows[0]!.vehiclesSold, 1);
    assert.equal(rows[0]!.avgDaysToMove, 10);
  });

  it('counts vehiclesSold = 0 when no listed vehicle has soldAt set', () => {
    const subs: SyncSubmissionEvent[] = [
      { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(25) },
    ];
    const rows = buildPlatformRowsFromEvents([BASE_VEHICLE], subs, [], [], NOW);
    assert.equal(rows[0]!.vehiclesSold, 0);
    assert.equal(rows[0]!.avgDaysToMove, null);
    assert.equal(rows[0]!.medianDaysToMove, null);
  });

  it('derives INSUFFICIENT confidence with 0 sold vehicles', () => {
    const subs: SyncSubmissionEvent[] = [
      { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(25) },
    ];
    const rows = buildPlatformRowsFromEvents([BASE_VEHICLE], subs, [], [], NOW);
    assert.equal(rows[0]!.confidence, 'INSUFFICIENT');
  });

  it('derives LOW confidence with 3 sold vehicles', () => {
    const vehicles = ['v1', 'v2', 'v3'].map((id, i) => ({
      ...BASE_VEHICLE, id, stockNumber: `S00${i + 1}`, soldAt: days(5),
    }));
    const subs: SyncSubmissionEvent[] = vehicles.map(v => ({
      vehicleId: v.id, platformSlug: 'autotrader', createdAt: days(20),
    }));
    const rows = buildPlatformRowsFromEvents(vehicles, subs, [], [], NOW);
    assert.equal(rows[0]!.confidence, 'LOW');
    assert.equal(rows[0]!.sampleSize, 3);
  });

  it('computes avgDaysToMove and medianDaysToMove for multiple sold vehicles', () => {
    // v1: first submit 20 days ago, sold 10 days ago → 10 days
    // v2: first submit 25 days ago, sold 5 days ago  → 20 days
    const v1 = { ...BASE_VEHICLE, id: 'v1', soldAt: days(10) };
    const v2 = { ...BASE_VEHICLE, id: 'v2', stockNumber: 'S002', soldAt: days(5) };
    const subs: SyncSubmissionEvent[] = [
      { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(20) },
      { vehicleId: 'v2', platformSlug: 'autotrader', createdAt: days(25) },
    ];
    const rows = buildPlatformRowsFromEvents([v1, v2], subs, [], [], NOW);
    assert.equal(rows[0]!.avgDaysToMove, 15);     // (10 + 20) / 2
    assert.equal(rows[0]!.medianDaysToMove, 15);  // median of [10, 20]
  });

  it('counts leads per platform correctly', () => {
    const subs: SyncSubmissionEvent[] = [
      { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(25) },
    ];
    const leads = [
      { platformSlug: 'autotrader' },
      { platformSlug: 'autotrader' },
      { platformSlug: 'cars.com'   },
    ];
    const rows = buildPlatformRowsFromEvents([BASE_VEHICLE], subs, leads, [], NOW);
    const at = rows.find(r => r.platformSlug === 'autotrader')!;
    assert.equal(at.totalLeads, 2);
    assert.equal(at.leadsPerVehicle, 2);  // 2 leads / 1 listed vehicle
  });

  it('leadsPerVehicle is null when vehiclesListed is 0 (guard against division by zero)', () => {
    // No listed vehicles but pass a lead anyway (edge case: platform slug with no submissions)
    const rows = buildPlatformRowsFromEvents([], [], [{ platformSlug: 'autotrader' }], [], NOW);
    assert.equal(rows.length, 0); // no submissions → no rows
  });

  it('does not include platforms from leads that have no SUBMISSION_SENT events', () => {
    // Lead from cars.com but no submissions → cars.com should not appear in rows
    const subs: SyncSubmissionEvent[] = [
      { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(25) },
    ];
    const leads = [{ platformSlug: 'cars.com' }];
    const rows = buildPlatformRowsFromEvents([BASE_VEHICLE], subs, leads, [], NOW);
    assert.ok(!rows.some(r => r.platformSlug === 'cars.com'));
    assert.ok(rows.some(r => r.platformSlug === 'autotrader'));
  });

  it('sampleSize equals vehiclesSold', () => {
    const soldVehicle: VehiclePerfInput = { ...BASE_VEHICLE, soldAt: days(5) };
    const subs: SyncSubmissionEvent[] = [
      { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(15) },
    ];
    const rows = buildPlatformRowsFromEvents([soldVehicle], subs, [], [], NOW);
    assert.equal(rows[0]!.sampleSize, rows[0]!.vehiclesSold);
  });

  it('vehicle that is removed (removedAt set) is still counted in vehiclesListed but not sold', () => {
    const removedVehicle: VehiclePerfInput = { ...BASE_VEHICLE, removedAt: days(5) };
    const subs: SyncSubmissionEvent[] = [
      { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(15) },
    ];
    const rows = buildPlatformRowsFromEvents([removedVehicle], subs, [], [], NOW);
    assert.equal(rows[0]!.vehiclesListed, 1);
    assert.equal(rows[0]!.vehiclesSold, 0);
  });

  it('is additive across multiple platforms — each platform is independent', () => {
    const soldV: VehiclePerfInput = { ...BASE_VEHICLE, soldAt: days(5) };
    const subs: SyncSubmissionEvent[] = [
      { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(20) },
      { vehicleId: 'v1', platformSlug: 'cars.com',   createdAt: days(18) },
    ];
    const rows = buildPlatformRowsFromEvents([soldV], subs, [], [], NOW);
    assert.equal(rows.length, 2);
    // Each platform independently counted the vehicle
    for (const row of rows) {
      assert.equal(row.vehiclesListed, 1);
      assert.equal(row.vehiclesSold, 1);
    }
    // But avgDaysToMove differs because first-submit date differs
    const at = rows.find(r => r.platformSlug === 'autotrader')!;
    const cc = rows.find(r => r.platformSlug === 'cars.com')!;
    assert.equal(at.avgDaysToMove, 15);  // days from 20 days ago to 5 days ago
    assert.equal(cc.avgDaysToMove, 13);  // days from 18 days ago to 5 days ago
  });
});

// ── buildVehiclePerformanceRows — benchmark fields ────────────────────────────

describe('buildVehiclePerformanceRows — medianComparableDays and benchmarkConfidence', () => {
  it('returns null medianComparableDays and INSUFFICIENT confidence when no comparables', () => {
    const rows = buildVehiclePerformanceRows([BASE_VEHICLE], [], NOW);
    assert.equal(rows[0]!.medianComparableDays, null);
    assert.equal(rows[0]!.benchmarkConfidence, 'INSUFFICIENT');
  });

  it('returns INSUFFICIENT confidence with 2 sold comparables (threshold is < 3)', () => {
    const comp1: VehiclePerfInput = { ...BASE_VEHICLE, id: 'v2', stockNumber: 'S002', soldAt: days(10) };
    const comp2: VehiclePerfInput = { ...BASE_VEHICLE, id: 'v3', stockNumber: 'S003', soldAt: days(20) };
    const rows = buildVehiclePerformanceRows([BASE_VEHICLE, comp1, comp2], [], NOW);
    const active = rows.find(r => r.vehicleId === 'v1')!;
    assert.equal(active.benchmarkConfidence, 'INSUFFICIENT');
    assert.equal(active.medianComparableDays, 15);  // median of [10, 20]
  });

  it('returns LOW confidence with exactly 3 sold comparables', () => {
    const comps: VehiclePerfInput[] = [
      { ...BASE_VEHICLE, id: 'v2', stockNumber: 'S002', soldAt: days(10) },
      { ...BASE_VEHICLE, id: 'v3', stockNumber: 'S003', soldAt: days(20) },
      { ...BASE_VEHICLE, id: 'v4', stockNumber: 'S004', soldAt: days(30) },
    ];
    const rows = buildVehiclePerformanceRows([BASE_VEHICLE, ...comps], [], NOW);
    const active = rows.find(r => r.vehicleId === 'v1')!;
    assert.equal(active.benchmarkConfidence, 'LOW');
    assert.equal(active.comparableCount, 3);
  });

  it('medianComparableDays differs from avgComparableDays on skewed samples', () => {
    // 3 comparables: 5, 10, 90 days → avg = 35, median = 10
    const comps: VehiclePerfInput[] = [
      { ...BASE_VEHICLE, id: 'v2', stockNumber: 'S002', createdAt: days(40), soldAt: days(35) },   // 5 days
      { ...BASE_VEHICLE, id: 'v3', stockNumber: 'S003', createdAt: days(50), soldAt: days(40) },   // 10 days
      { ...BASE_VEHICLE, id: 'v4', stockNumber: 'S004', createdAt: days(120), soldAt: days(30) },  // 90 days
    ];
    const rows = buildVehiclePerformanceRows([BASE_VEHICLE, ...comps], [], NOW);
    const active = rows.find(r => r.vehicleId === 'v1')!;
    assert.equal(active.comparableCount, 3);
    assert.ok(Math.abs(active.avgComparableDays! - 35) < 0.01, `avg should be ~35, got ${active.avgComparableDays}`);
    assert.equal(active.medianComparableDays, 10);
  });

  it('medianComparableDays is set even for INSUFFICIENT benchmark (1 comparable)', () => {
    const comp: VehiclePerfInput = { ...BASE_VEHICLE, id: 'v2', stockNumber: 'S002', createdAt: days(25), soldAt: days(15) };
    const rows = buildVehiclePerformanceRows([BASE_VEHICLE, comp], [], NOW);
    const active = rows.find(r => r.vehicleId === 'v1')!;
    assert.equal(active.comparableCount, 1);
    assert.equal(active.medianComparableDays, 10);  // single comparable: 10 days
    assert.equal(active.benchmarkConfidence, 'INSUFFICIENT');
  });

  it('benchmarkConfidence is MEDIUM with 10 sold comparables', () => {
    const comps: VehiclePerfInput[] = Array.from({ length: 10 }, (_, i) => ({
      ...BASE_VEHICLE, id: `v${i + 2}`, stockNumber: `S00${i + 2}`, soldAt: days(5 + i),
    }));
    const rows = buildVehiclePerformanceRows([BASE_VEHICLE, ...comps], [], NOW);
    const active = rows.find(r => r.vehicleId === 'v1')!;
    assert.equal(active.benchmarkConfidence, 'MEDIUM');
    assert.equal(active.comparableCount, 10);
  });

  it('benchmarkConfidence is HIGH with 30+ sold comparables', () => {
    const comps: VehiclePerfInput[] = Array.from({ length: 30 }, (_, i) => ({
      ...BASE_VEHICLE, id: `v${i + 2}`, stockNumber: `S0${String(i + 2).padStart(2, '0')}`, soldAt: days(5 + i),
    }));
    const rows = buildVehiclePerformanceRows([BASE_VEHICLE, ...comps], [], NOW);
    const active = rows.find(r => r.vehicleId === 'v1')!;
    assert.equal(active.benchmarkConfidence, 'HIGH');
    assert.equal(active.comparableCount, 30);
  });

  it('sold vehicles are excluded from active rows but still count as comparables for others', () => {
    const soldComp: VehiclePerfInput = { ...BASE_VEHICLE, id: 'v2', stockNumber: 'S002', soldAt: days(20) };
    const comp2: VehiclePerfInput    = { ...BASE_VEHICLE, id: 'v3', stockNumber: 'S003', soldAt: days(10) };
    const comp3: VehiclePerfInput    = { ...BASE_VEHICLE, id: 'v4', stockNumber: 'S004', soldAt: days(30) };
    const rows = buildVehiclePerformanceRows([BASE_VEHICLE, soldComp, comp2, comp3], [], NOW);
    assert.equal(rows.length, 1);  // only BASE_VEHICLE is active
    assert.equal(rows[0]!.vehicleId, 'v1');
    assert.equal(rows[0]!.comparableCount, 3);
    assert.equal(rows[0]!.benchmarkConfidence, 'LOW');
  });
});

// ── buildVehiclePerformanceRows — LOW_DATA edge cases ────────────────────────

describe('buildVehiclePerformanceRows — stale and low-data edge cases', () => {
  it('active vehicle with no sold comparables gets LOW_DATA signal', () => {
    const rows = buildVehiclePerformanceRows([BASE_VEHICLE], [], NOW);
    assert.equal(rows[0]!.movementSignal, 'LOW_DATA');
    assert.equal(rows[0]!.comparableCount, 0);
    assert.equal(rows[0]!.avgComparableDays, null);
  });

  it('active vehicle with only 2 sold comparables still gets LOW_DATA (threshold is 3)', () => {
    const comp1: VehiclePerfInput = { ...BASE_VEHICLE, id: 'v2', stockNumber: 'S002', soldAt: days(10) };
    const comp2: VehiclePerfInput = { ...BASE_VEHICLE, id: 'v3', stockNumber: 'S003', soldAt: days(15) };
    const rows = buildVehiclePerformanceRows([BASE_VEHICLE, comp1, comp2], [], NOW);
    const activeRow = rows.find(r => r.vehicleId === 'v1')!;
    assert.equal(activeRow.movementSignal, 'LOW_DATA');
  });

  it('vehicle online much longer than 3 comparables gets STALE when ratio > 2', () => {
    // Active vehicle: 90 days online
    const stale: VehiclePerfInput = { ...BASE_VEHICLE, createdAt: days(90) };
    // 3 sold comparables, each sold after ~20 days → avg = 20
    const comps: VehiclePerfInput[] = [
      { ...BASE_VEHICLE, id: 'v2', stockNumber: 'S002', createdAt: days(40), soldAt: days(20) },
      { ...BASE_VEHICLE, id: 'v3', stockNumber: 'S003', createdAt: days(35), soldAt: days(15) },
      { ...BASE_VEHICLE, id: 'v4', stockNumber: 'S004', createdAt: days(30), soldAt: days(10) },
    ];
    const rows = buildVehiclePerformanceRows([stale, ...comps], [], NOW);
    const staleRow = rows.find(r => r.vehicleId === 'v1')!;
    assert.equal(staleRow.movementSignal, 'STALE');
    assert.ok(staleRow.daysOnline >= 90);
  });

  it('sold vehicles are excluded from the active rows output', () => {
    const soldVehicle: VehiclePerfInput = { ...BASE_VEHICLE, soldAt: days(5) };
    const rows = buildVehiclePerformanceRows([soldVehicle], [], NOW);
    assert.equal(rows.length, 0);
  });

  it('removed vehicles are excluded from the active rows output', () => {
    const removedVehicle: VehiclePerfInput = { ...BASE_VEHICLE, removedAt: days(5) };
    const rows = buildVehiclePerformanceRows([removedVehicle], [], NOW);
    assert.equal(rows.length, 0);
  });

  it('accumulates platform assists from leads for the active vehicle', () => {
    const leads = [
      { vehicleId: 'v1', platformSlug: 'autotrader' },
      { vehicleId: 'v1', platformSlug: 'autotrader' },
      { vehicleId: 'v1', platformSlug: 'cars.com'   },
    ];
    const rows = buildVehiclePerformanceRows([BASE_VEHICLE], leads, NOW);
    assert.equal(rows[0]!.platformAssistsJson['autotrader']?.leads, 2);
    assert.equal(rows[0]!.platformAssistsJson['cars.com']?.leads, 1);
  });

  it('vehicle with no leads has empty platformAssistsJson', () => {
    const rows = buildVehiclePerformanceRows([BASE_VEHICLE], [], NOW);
    assert.deepEqual(rows[0]!.platformAssistsJson, {});
  });

  it('daysOnline equals 0 for a vehicle added today', () => {
    const freshVehicle: VehiclePerfInput = { ...BASE_VEHICLE, createdAt: NOW };
    const rows = buildVehiclePerformanceRows([freshVehicle], [], NOW);
    assert.equal(rows[0]!.daysOnline, 0);
  });

  it('FAST signal when online 7 days vs comparable avg of 30 (ratio < 0.7)', () => {
    const activeVehicle: VehiclePerfInput = { ...BASE_VEHICLE, createdAt: days(7) };
    const comps: VehiclePerfInput[] = [
      { ...BASE_VEHICLE, id: 'v2', stockNumber: 'S002', createdAt: days(60), soldAt: days(30) },
      { ...BASE_VEHICLE, id: 'v3', stockNumber: 'S003', createdAt: days(55), soldAt: days(25) },
      { ...BASE_VEHICLE, id: 'v4', stockNumber: 'S004', createdAt: days(65), soldAt: days(35) },
    ];
    const rows = buildVehiclePerformanceRows([activeVehicle, ...comps], [], NOW);
    const row = rows.find(r => r.vehicleId === 'v1')!;
    assert.equal(row.movementSignal, 'FAST');
  });
});

// ── Job language contract ─────────────────────────────────────────────────────

describe('platform row language contract', () => {
  it('confidence field on platform row is never a sales claim string', () => {
    const soldV: VehiclePerfInput = { ...BASE_VEHICLE, soldAt: days(10) };
    const subs: SyncSubmissionEvent[] = [
      { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: days(20) },
    ];
    const rows = buildPlatformRowsFromEvents([soldV], subs, [], [], NOW);
    const validConfidence = new Set(['INSUFFICIENT', 'LOW', 'MEDIUM', 'HIGH']);
    for (const row of rows) {
      assert.ok(validConfidence.has(row.confidence), `unexpected confidence: ${row.confidence}`);
    }
  });

  it('movementSignal on vehicle row uses only valid signal values', () => {
    const validSignals = new Set(['FAST', 'ON_TRACK', 'SLOW', 'STALE', 'LOW_DATA']);
    const rows = buildVehiclePerformanceRows([BASE_VEHICLE], [], NOW);
    for (const row of rows) {
      assert.ok(validSignals.has(row.movementSignal), `unexpected signal: ${row.movementSignal}`);
    }
  });
});
