import { MOVEMENT_SIGNAL_SORT_ORDER, movementSignalVisual } from './statusRegistry.ts';
import type { CleanupFilter } from '../components/inventory/inventoryConfig.tsx';
import type { MovementSignal, VehicleListItem, VehiclePerformanceItem } from './types.ts';

export type MovementFilter = 'ALL' | MovementSignal;

export type InventorySortKey =
  | 'stockNumber'
  | 'vehicle'
  | 'daysOnline'
  | 'movementSignal'
  | 'price'
  | 'readiness';

export type SortDirection = 'asc' | 'desc';

export type InventoryListQuery = {
  search: string;
  cleanupFilter: CleanupFilter;
  movementFilter: MovementFilter;
  sortKey: InventorySortKey;
  sortDirection: SortDirection;
};

type CleanupPredicate = (vehicle: VehicleListItem, filter: CleanupFilter) => boolean;

const READINESS_ORDER: Record<VehicleListItem['readiness'], number> = {
  BLOCKED: 0,
  WARNING: 1,
  READY: 2,
};

export function matchesInventorySearch(vehicle: VehicleListItem, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    vehicle.stockNumber.toLowerCase().includes(q)
    || vehicle.vin.toLowerCase().includes(q)
    || vehicle.make.toLowerCase().includes(q)
    || vehicle.model.toLowerCase().includes(q)
  );
}

export function passesInventoryFilters(
  vehicle: VehicleListItem,
  perfMap: Map<string, VehiclePerformanceItem>,
  query: Pick<InventoryListQuery, 'search' | 'cleanupFilter' | 'movementFilter'>,
  applyCleanup: CleanupPredicate,
): boolean {
  if (!applyCleanup(vehicle, query.cleanupFilter)) return false;
  if (!matchesInventorySearch(vehicle, query.search)) return false;
  if (!applyMovementFilter(vehicle, perfMap, query.movementFilter)) return false;
  return true;
}

/** Filter order: readiness/issue chips → search → movement → sort. */
export function composeInventoryList(
  vehicles: VehicleListItem[],
  perfMap: Map<string, VehiclePerformanceItem>,
  query: InventoryListQuery,
  applyCleanup: CleanupPredicate,
): VehicleListItem[] {
  const filtered = vehicles.filter(v => passesInventoryFilters(v, perfMap, query, applyCleanup));
  return sortInventoryVehicles(filtered, perfMap, query.sortKey, query.sortDirection);
}

export function movementFilterCounts(
  vehicles: VehicleListItem[],
  perfMap: Map<string, VehiclePerformanceItem>,
): Record<MovementFilter, number> {
  const counts: Record<MovementFilter, number> = {
    ALL: vehicles.length,
    FAST: 0,
    ON_TRACK: 0,
    SLOW: 0,
    STALE: 0,
    LOW_DATA: 0,
  };
  for (const v of vehicles) {
    const signal = perfMap.get(v.stockNumber)?.movementSignal ?? 'LOW_DATA';
    counts[signal] += 1;
  }
  return counts;
}

/** Movement chip counts scoped to vehicles matching readiness + search (before movement filter). */
export function movementFilterCountsScoped(
  vehicles: VehicleListItem[],
  perfMap: Map<string, VehiclePerformanceItem>,
  query: Pick<InventoryListQuery, 'search' | 'cleanupFilter'>,
  applyCleanup: CleanupPredicate,
): Record<MovementFilter, number> {
  const scoped = vehicles.filter(v => {
    if (!applyCleanup(v, query.cleanupFilter)) return false;
    if (!matchesInventorySearch(v, query.search)) return false;
    return true;
  });
  return movementFilterCounts(scoped, perfMap);
}

export function applyMovementFilter(
  vehicle: VehicleListItem,
  perfMap: Map<string, VehiclePerformanceItem>,
  filter: MovementFilter,
): boolean {
  if (filter === 'ALL') return true;
  const signal = perfMap.get(vehicle.stockNumber)?.movementSignal ?? 'LOW_DATA';
  return signal === filter;
}

function compareStrings(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' });
}

export function sortInventoryVehicles(
  vehicles: VehicleListItem[],
  perfMap: Map<string, VehiclePerformanceItem>,
  sortKey: InventorySortKey,
  direction: SortDirection,
): VehicleListItem[] {
  const dir = direction === 'asc' ? 1 : -1;
  return [...vehicles].sort((a, b) => {
    let cmp = 0;
    switch (sortKey) {
      case 'stockNumber':
        cmp = compareStrings(a.stockNumber, b.stockNumber);
        break;
      case 'vehicle':
        cmp = compareStrings(`${a.year} ${a.make} ${a.model}`, `${b.year} ${b.make} ${b.model}`);
        break;
      case 'price':
        cmp = a.priceCents - b.priceCents;
        break;
      case 'readiness':
        cmp = READINESS_ORDER[a.readiness] - READINESS_ORDER[b.readiness];
        break;
      case 'daysOnline': {
        const da = perfMap.get(a.stockNumber)?.daysOnline ?? -1;
        const db = perfMap.get(b.stockNumber)?.daysOnline ?? -1;
        cmp = da - db;
        break;
      }
      case 'movementSignal': {
        const sa = perfMap.get(a.stockNumber)?.movementSignal ?? 'LOW_DATA';
        const sb = perfMap.get(b.stockNumber)?.movementSignal ?? 'LOW_DATA';
        cmp = MOVEMENT_SIGNAL_SORT_ORDER[sa] - MOVEMENT_SIGNAL_SORT_ORDER[sb];
        if (cmp === 0) {
          cmp = (perfMap.get(a.stockNumber)?.daysOnline ?? 0) - (perfMap.get(b.stockNumber)?.daysOnline ?? 0);
        }
        break;
      }
    }
    return cmp * dir;
  });
}

export function movementFilterLabel(filter: MovementFilter): string {
  if (filter === 'ALL') return 'All signals';
  return movementSignalVisual(filter).label;
}
