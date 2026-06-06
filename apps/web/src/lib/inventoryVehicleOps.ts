import { MOVEMENT_SIGNAL_SORT_ORDER, movementSignalVisual } from './statusRegistry.ts';
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

const READINESS_ORDER: Record<VehicleListItem['readiness'], number> = {
  BLOCKED: 0,
  WARNING: 1,
  READY: 2,
};

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
