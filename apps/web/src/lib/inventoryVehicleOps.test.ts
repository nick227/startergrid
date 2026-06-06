import { describe, it, expect } from 'vitest';
import {
  composeInventoryList,
  matchesInventorySearch,
  movementFilterCountsScoped,
  type InventoryListQuery,
} from './inventoryVehicleOps.ts';
import type { VehicleListItem, VehiclePerformanceItem } from './types.ts';

const applyCleanup = (v: VehicleListItem, filter: string) => {
  if (filter === 'ALL') return true;
  if (filter === 'READY') return v.readiness === 'READY';
  if (filter === 'BLOCKED') return v.readiness === 'BLOCKED';
  return true;
};

const vehicles: VehicleListItem[] = [
  {
    id: '1', stockNumber: 'A-1', vin: 'VIN001', year: 2021, make: 'Honda', model: 'Accord',
    trim: null, mileage: 100, priceCents: 100, condition: 'USED', exteriorColor: 'Gray',
    mediaCount: 1, readiness: 'READY', issues: [], updatedAt: '',
  },
  {
    id: '2', stockNumber: 'B-2', vin: 'VIN002', year: 2022, make: 'Tesla', model: 'Model 3',
    trim: null, mileage: 100, priceCents: 100, condition: 'USED', exteriorColor: 'Gray',
    mediaCount: 1, readiness: 'BLOCKED', issues: [], updatedAt: '',
  },
  {
    id: '3', stockNumber: 'C-3', vin: 'VIN003', year: 2020, make: 'Ford', model: 'F-150',
    trim: null, mileage: 100, priceCents: 100, condition: 'USED', exteriorColor: 'Gray',
    mediaCount: 1, readiness: 'READY', issues: [], updatedAt: '',
  },
];

const perfMap = new Map<string, VehiclePerformanceItem>([
  ['A-1', { stockNumber: 'A-1', movementSignal: 'FAST' } as VehiclePerformanceItem],
  ['B-2', { stockNumber: 'B-2', movementSignal: 'STALE' } as VehiclePerformanceItem],
  ['C-3', { stockNumber: 'C-3', movementSignal: 'SLOW' } as VehiclePerformanceItem],
]);

describe('inventory list composition', () => {
  it('matches search across stock, vin, make, and model', () => {
    expect(matchesInventorySearch(vehicles[0]!, 'honda')).toBe(true);
    expect(matchesInventorySearch(vehicles[0]!, 'vin001')).toBe(true);
    expect(matchesInventorySearch(vehicles[0]!, 'nomatch')).toBe(false);
  });

  it('applies readiness then movement filters together', () => {
    const query: InventoryListQuery = {
      search: '',
      cleanupFilter: 'READY',
      movementFilter: 'SLOW',
      sortKey: 'stockNumber',
      sortDirection: 'asc',
    };
    const result = composeInventoryList(vehicles, perfMap, query, applyCleanup);
    expect(result.map(v => v.stockNumber)).toEqual(['C-3']);
  });

  it('scopes movement counts to readiness + search before movement chip selection', () => {
    const query: InventoryListQuery = {
      search: 'honda',
      cleanupFilter: 'ALL',
      movementFilter: 'ALL',
      sortKey: 'stockNumber',
      sortDirection: 'asc',
    };
    const counts = movementFilterCountsScoped(vehicles, perfMap, query, applyCleanup);
    expect(counts.ALL).toBe(1);
    expect(counts.FAST).toBe(1);
    expect(counts.STALE).toBe(0);
  });
});
