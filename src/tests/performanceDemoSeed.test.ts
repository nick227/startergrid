import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildVehiclePerformanceRows, type VehiclePerfInput } from '../services/performance/performanceAggregator.js';

const NOW = new Date('2026-06-05T12:00:00.000Z');

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}

function sold(
  id: string,
  make: string,
  model: string,
  year: number,
  priceCents: number,
  listedDaysAgo: number,
  soldDaysAgo: number,
): VehiclePerfInput {
  return {
    id,
    stockNumber: id,
    make,
    model,
    year,
    priceCents,
    condition: 'USED',
    createdAt: daysAgo(listedDaysAgo),
    soldAt: daysAgo(soldDaysAgo),
    removedAt: null,
  };
}

function active(
  id: string,
  make: string,
  model: string,
  year: number,
  priceCents: number,
  listedDaysAgo: number,
): VehiclePerfInput {
  return {
    id,
    stockNumber: id,
    make,
    model,
    year,
    priceCents,
    condition: 'USED',
    createdAt: daysAgo(listedDaysAgo),
    soldAt: null,
    removedAt: null,
  };
}

describe('performanceDemoSeed movement signals', () => {
  it('yields FAST, SLOW, and STALE on pristine demo targets', () => {
    const vehicles: VehiclePerfInput[] = [
      active('a1', 'Honda', 'Accord', 2021, 2_399_500, 12),
      active('a2', 'Tesla', 'Model 3', 2022, 3_299_500, 40),
      active('a3', 'Ford', 'F-150', 2021, 3_699_500, 50),
      sold('s1', 'Honda', 'Accord', 2020, 2_329_500, 38, 20),
      sold('s2', 'Honda', 'Accord', 2022, 2_419_500, 42, 20),
      sold('s3', 'Honda', 'Accord', 2021, 2_389_500, 36, 16),
      sold('s4', 'Honda', 'Accord', 2019, 2_279_500, 45, 22),
      sold('s5', 'Tesla', 'Model 3', 2021, 3_199_500, 40, 15),
      sold('s6', 'Tesla', 'Model 3', 2022, 3_349_500, 44, 18),
      sold('s7', 'Tesla', 'Model 3', 2023, 3_289_500, 38, 13),
      sold('s8', 'Ford', 'F-150', 2020, 3_599_500, 35, 14),
      sold('s9', 'Ford', 'F-150', 2021, 3_719_500, 40, 17),
      sold('s10', 'Ford', 'F-150', 2022, 3_649_500, 33, 12),
    ];

    const rows = buildVehiclePerformanceRows(vehicles, [], NOW);
    const byStock = new Map(rows.map(r => [r.stockNumber, r]));

    assert.equal(byStock.get('a1')?.movementSignal, 'FAST');
    assert.equal(byStock.get('a2')?.movementSignal, 'SLOW');
    assert.equal(byStock.get('a3')?.movementSignal, 'STALE');
    assert.ok((byStock.get('a1')?.comparableCount ?? 0) >= 3);
  });
});
