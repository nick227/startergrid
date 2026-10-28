import type { VehicleListItem } from '@/lib/types.ts';
import type { InventoryGridRowDto } from '@/types/inventoryDto.ts';
import { inventorySearchMatch, inventorySearchMatchLabel } from '@/lib/inventoryAssetOps.ts';

export type LotSegment = 'on_lot' | 'needs_fix' | 'sold';
export type BrowseDensity = 'cards' | 'list';

export type BrowseUnit = {
  id: string;
  vehicle: VehicleListItem;
  row: InventoryGridRowDto;
  title: string;
  mileageLabel: string | null;
  statusLabel: string;
  matchLabel: string | null;
  placeLabel: string | null;
};

export function readSortValue(row: InventoryGridRowDto, path: string): unknown {
  let value: unknown = row;
  for (const part of path.split('.')) {
    if (value == null || typeof value !== 'object') return undefined;
    value = (value as Record<string, unknown>)[part];
  }
  return value;
}

export function readBrowseDensity(): BrowseDensity {
  const stored = localStorage.getItem('inventoryViewMode');
  if (stored === 'list' || stored === 'table') return 'list';
  return 'cards';
}

export function vehicleNeedsFix(vehicle: VehicleListItem, hasReprice: boolean): boolean {
  if (vehicle.lifecycleState === 'SOLD' || vehicle.lifecycleState === 'REMOVED') return false;
  return vehicle.readiness === 'BLOCKED'
    || vehicle.issues.length > 0
    || vehicle.mediaCount === 0
    || vehicle.priceCents <= 0
    || hasReprice;
}

export function vehicleLotPlace(vehicle: VehicleListItem, hasReprice: boolean): LotSegment {
  if (vehicle.lifecycleState === 'SOLD' || vehicle.lifecycleState === 'REMOVED') return 'sold';
  if (vehicleNeedsFix(vehicle, hasReprice)) return 'needs_fix';
  return 'on_lot';
}

export function lotPlaceLabel(place: LotSegment): string {
  if (place === 'needs_fix') return 'Needs a fix';
  if (place === 'sold') return 'Sold';
  return 'On the lot';
}

export function catalogStatusLabel(vehicle: VehicleListItem): string {
  if (vehicle.lifecycleState === 'SOLD') return 'Sold';
  if (vehicle.lifecycleState === 'REMOVED') return 'Removed';
  if (vehicle.mediaCount === 0) return 'Needs photos';
  if (vehicle.readiness === 'BLOCKED' || vehicle.priceCents <= 0) return 'Cannot list';
  if (vehicle.readiness === 'WARNING') return 'Needs details';
  return 'Ready to send';
}

export function browseCountLabel(segment: LotSegment, count: number): string {
  if (segment === 'needs_fix') return `${count} need a fix`;
  if (segment === 'sold') return `${count} sold or removed`;
  return `${count} on the lot`;
}

export function formatCatalogPrice(cents: number): string {
  if (cents <= 0) return '—';
  return `$${(cents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}

export function isAgingVehicle(daysOnline: number, hasReprice: boolean): boolean {
  return daysOnline >= 30 || hasReprice;
}

export function changedThisWeek(vehicle: VehicleListItem, now = Date.now()): boolean {
  const cutoff = now - 7 * 24 * 60 * 60 * 1000;
  return new Date(vehicle.updatedAt).getTime() >= cutoff;
}

export function buildBrowseUnits(
  rows: InventoryGridRowDto[],
  byId: Map<string, VehicleListItem>,
  search: string,
  repriceIds: Set<string>,
  titleFor: (vehicle: VehicleListItem) => string,
  mileageFor: (vehicle: VehicleListItem) => string | null,
): BrowseUnit[] {
  const searching = search.trim() !== '';
  const units: BrowseUnit[] = [];
  for (const row of rows) {
    const vehicle = byId.get(row.id);
    if (!vehicle) continue;
    const match = searching ? inventorySearchMatch(vehicle, search) : null;
    const place = vehicleLotPlace(vehicle, repriceIds.has(vehicle.id));
    units.push({
      id: vehicle.id,
      vehicle,
      row,
      title: titleFor(vehicle),
      mileageLabel: mileageFor(vehicle),
      statusLabel: catalogStatusLabel(vehicle),
      matchLabel: match ? inventorySearchMatchLabel(match) : null,
      placeLabel: searching ? lotPlaceLabel(place) : null,
    });
  }
  return units;
}
