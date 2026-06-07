import type { VehicleListItem, VehiclePerformanceItem } from './types.ts';
import { VEHICLE_READINESS_REGISTRY, type VehicleReadinessKey } from './statusRegistry.ts';
import { movementBenchmarkParts, hasSimilarBenchmark } from './movementBenchmark.ts';
import { LIFECYCLE_STATE_LABELS } from './lifecycleDisplay.ts';
import { inventoryLabels } from './copy/index.ts';

import type { OpsRowField } from './opsRowPresentation.ts';

export type { OpsRowField as AssetDesktopField };

function formatPrice(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 0 })}`;
}

function formatMileage(mi: number): string {
  return `${mi.toLocaleString()} mi`;
}

export function assetTitle(vehicle: VehicleListItem): string {
  const parts = [
    vehicle.year > 0 ? String(vehicle.year) : null,
    vehicle.make || null,
    vehicle.model || null,
  ].filter((p): p is string => p !== null);
  if (parts.length === 0) return vehicle.stockNumber || 'Unknown asset';
  const base = parts.join(' ');
  return vehicle.trim ? `${base} · ${vehicle.trim}` : base;
}

export function assetReadinessVisual(readiness: VehicleReadinessKey): { label: string; pill: string } {
  const meta = VEHICLE_READINESS_REGISTRY[readiness];
  return { label: meta.label, pill: meta.pill };
}

export function assetMovementSummary(perf: VehiclePerformanceItem | null | undefined): string | null {
  if (!perf) return null;
  const p = movementBenchmarkParts(perf);
  if (!hasSimilarBenchmark(perf)) {
    return `${p.daysOnline} days · Low comparable data`;
  }
  return `${p.daysOnline} days · Similar avg ${p.similarAvg} · ${p.signalLabel}`;
}

export function assetSecondaryMeta(vehicle: VehicleListItem): string {
  const labels = inventoryLabels();
  const parts: string[] = [];
  if (vehicle.stockNumber) parts.push(`${labels.refColumn} ${vehicle.stockNumber}`);
  if (vehicle.vin) parts.push(`${labels.canonicalId} ${vehicle.vin}`);
  if (vehicle.exteriorColor) parts.push(vehicle.exteriorColor);
  if (vehicle.condition) parts.push(vehicle.condition);
  return parts.join(' · ');
}

export function assetDesktopFields(
  vehicle: VehicleListItem,
  perf: VehiclePerformanceItem | null | undefined,
  showLifecycle: boolean
): OpsRowField[] {
  const labels = inventoryLabels();
  const fields: OpsRowField[] = [
    { label: labels.refColumn, value: vehicle.stockNumber },
    {
      label: 'Price',
      value: vehicle.priceCents > 0 ? formatPrice(vehicle.priceCents) : '—',
    },
    {
      label: 'Media',
      value: `${vehicle.mediaCount} photo${vehicle.mediaCount !== 1 ? 's' : ''}`,
    },
  ];

  if (vehicle.mileage > 0) {
    fields.splice(2, 0, { label: 'Usage', value: formatMileage(vehicle.mileage) });
  }

  const movement = assetMovementSummary(perf);
  if (movement) {
    fields.push({ label: 'Days / Signal', value: movement });
  }

  if (showLifecycle && vehicle.lifecycleState !== 'AVAILABLE') {
    fields.push({ label: 'Lifecycle', value: LIFECYCLE_STATE_LABELS[vehicle.lifecycleState] });
  }

  return fields;
}
