import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  exposureEndDate,
  isExposureOpen,
  listingStartDate,
  resolveVehicleLifecycleState,
  shouldApplyLifecycleTransition,
} from '../services/inventory/vehicleLifecycle.js';
import {
  buildPlatformRowsFromEvents,
  buildVehiclePerformanceRows,
  type SyncSubmissionEvent,
  type VehiclePerfInput,
} from '../services/performance/performanceAggregator.js';

const NOW = new Date('2026-06-05T12:00:00.000Z');

function daysAgo(n: number): Date {
  return new Date(NOW.getTime() - n * 24 * 60 * 60 * 1000);
}

const BASE: VehiclePerfInput = {
  id: 'v1',
  stockNumber: 'S001',
  make: 'Honda',
  model: 'Accord',
  year: 2021,
  priceCents: 2_000_000,
  condition: 'USED',
  createdAt: daysAgo(30),
  soldAt: null,
  removedAt: null,
};

describe('resolveVehicleLifecycleState', () => {
  it('maps soldAt, removedAt, and reactivatedAt', () => {
    assert.equal(resolveVehicleLifecycleState({ soldAt: daysAgo(1), removedAt: null }), 'SOLD');
    assert.equal(resolveVehicleLifecycleState({ soldAt: null, removedAt: daysAgo(1) }), 'REMOVED');
    assert.equal(resolveVehicleLifecycleState({ soldAt: null, removedAt: null, reactivatedAt: daysAgo(2) }), 'REACTIVATED');
    assert.equal(resolveVehicleLifecycleState({ soldAt: null, removedAt: null }), 'AVAILABLE');
  });
});

describe('lifecycle transitions', () => {
  it('detects active → sold', () => {
    assert.equal(
      shouldApplyLifecycleTransition({ soldAt: null, removedAt: null }, 'SOLD'),
      true,
    );
  });

  it('detects active → removed', () => {
    assert.equal(
      shouldApplyLifecycleTransition({ soldAt: null, removedAt: null }, 'REMOVED'),
      true,
    );
  });

  it('detects sold → reactivated', () => {
    assert.equal(
      shouldApplyLifecycleTransition({ soldAt: daysAgo(3), removedAt: null }, 'REACTIVATED'),
      true,
    );
  });

  it('skips when already in target state', () => {
    assert.equal(
      shouldApplyLifecycleTransition({ soldAt: daysAgo(3), removedAt: null }, 'SOLD'),
      false,
    );
  });
});

describe('days online stops at sold/removed', () => {
  const subs: SyncSubmissionEvent[] = [
    { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: daysAgo(20) },
  ];

  it('active vehicle accumulates to now from listing start', () => {
    const rows = buildVehiclePerformanceRows([BASE], [], NOW, subs);
    assert.equal(rows.length, 1);
    assert.equal(rows[0]!.daysOnline, 20);
  });

  it('sold vehicle is excluded from active performance rows', () => {
    const sold: VehiclePerfInput = { ...BASE, soldAt: daysAgo(5) };
    const rows = buildVehiclePerformanceRows([sold], [], NOW, subs);
    assert.equal(rows.length, 0);
  });

  it('removed vehicle is excluded from active performance rows', () => {
    const removed: VehiclePerfInput = { ...BASE, removedAt: daysAgo(5) };
    const rows = buildVehiclePerformanceRows([removed], [], NOW, subs);
    assert.equal(rows.length, 0);
  });

  it('reactivated vehicle counts days from reactivatedAt', () => {
    const reactivated: VehiclePerfInput = {
      ...BASE,
      reactivatedAt: daysAgo(7),
    };
    const rows = buildVehiclePerformanceRows([reactivated], [], NOW, subs);
    assert.equal(rows[0]!.daysOnline, 7);
  });
});

describe('platform exposure windows', () => {
  const subs: SyncSubmissionEvent[] = [
    { vehicleId: 'v1', platformSlug: 'autotrader', createdAt: daysAgo(25) },
  ];

  it('sold after platform submission uses submit → sold for avgDaysToMove', () => {
    const sold: VehiclePerfInput = { ...BASE, soldAt: daysAgo(5) };
    const rows = buildPlatformRowsFromEvents([sold], subs, [], [], NOW);
    assert.equal(rows[0]!.vehiclesSold, 1);
    assert.equal(rows[0]!.vehiclesListed, 0);
    assert.equal(rows[0]!.avgDaysToMove, 20);
  });

  it('removed before sale closes exposure with avgDaysOnPlatform', () => {
    const removed: VehiclePerfInput = { ...BASE, removedAt: daysAgo(8) };
    const rows = buildPlatformRowsFromEvents([removed], subs, [], [], NOW);
    assert.equal(rows[0]!.vehiclesRemoved, 1);
    assert.equal(rows[0]!.vehiclesListed, 0);
    assert.equal(rows[0]!.vehiclesSold, 0);
    assert.equal(rows[0]!.avgDaysOnPlatform, 17);
  });

  it('active vehicle with submission counts as listed', () => {
    const rows = buildPlatformRowsFromEvents([BASE], subs, [], [], NOW);
    assert.equal(rows[0]!.vehiclesListed, 1);
    assert.equal(rows[0]!.vehiclesSold, 0);
    assert.equal(rows[0]!.vehiclesRemoved, 0);
  });

  it('removed before sale does not count as sold', () => {
    const removed: VehiclePerfInput = { ...BASE, removedAt: daysAgo(4) };
    const rows = buildPlatformRowsFromEvents([removed], subs, [], [], NOW);
    assert.equal(rows[0]!.vehiclesSold, 0);
    assert.equal(exposureEndDate(removed)?.getTime(), removed.removedAt!.getTime());
    assert.equal(isExposureOpen(removed), false);
  });

  it('listing start uses submission date when present', () => {
    const lateCreate: VehiclePerfInput = { ...BASE, createdAt: daysAgo(10) };
    const start = listingStartDate(lateCreate, daysAgo(25));
    assert.equal(start.getTime(), daysAgo(25).getTime());
  });
});
