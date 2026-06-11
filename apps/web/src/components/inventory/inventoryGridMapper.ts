import type { VehicleListItem, VehiclePerformanceItem } from '../../lib/types.ts';
import type { InventoryGridRowDto } from '../../types/inventoryDto.ts';

export function mapLegacyVehicleToGridRow(
  vehicle: VehicleListItem,
  perf: VehiclePerformanceItem | undefined
): InventoryGridRowDto {
  return {
    id: vehicle.id,
    category: 'AUTOMOTIVE', // Assuming all mapped vehicles are automotive in the legacy system
    identity: {
      id: vehicle.id,
      primaryIdentifier: vehicle.vin,
      stockNumber: vehicle.stockNumber,
      category: 'AUTOMOTIVE',
    },
    specs: {
      make: vehicle.make,
      model: vehicle.model,
      trim: vehicle.trim ?? '',
      year: vehicle.year,
      mileage: vehicle.mileage,
      exteriorColor: vehicle.exteriorColor,
      interiorColor: '', // not in VehicleListItem
      condition: vehicle.condition,
    },
    pricing: {
      priceCents: vehicle.priceCents,
    },
    media: {
      thumbnailUrl: null, // we don't have thumbnail url in VehicleListItem directly, might need to extract elsewhere or leave null
      photoCount: vehicle.mediaCount,
      requiredShotsCoverage: '0/0', // not computed yet
      missingRequiredShots: vehicle.issues.filter(i => i.path === 'media').length,
    },
    readiness: {
      status: vehicle.readiness,
      nextAction: vehicle.issues.length > 0 ? vehicle.issues[0].message : null,
      missingFields: vehicle.issues.map(i => i.path),
    },
    publishing: {
      // Mocked up for now since it's not fully in VehicleListItem (requires platform perf data or distribution summary)
      severity: vehicle.readiness === 'BLOCKED' ? 100 : (vehicle.readiness === 'WARNING' ? 50 : 0),
      liveCount: 0,
      queuedCount: 0,
      failedCount: 0,
      blockedCount: 0,
      notLiveCount: 1,
      totalPlatforms: 1,
      nextAction: null,
      statusText: 'Not live',
    },
    performance: {
      daysOnline: perf?.daysOnline ?? 0,
      messages: Object.values(perf?.platformAssists ?? {}).reduce((acc, p) => acc + p.leads, 0),
      views: 0, // not in perf directly
      saves: 0, // not in perf directly
    },
    sales: {
      isSold: vehicle.lifecycleState === 'SOLD',
      soldDate: vehicle.soldAt,
      soldPlatform: null,
      soldPriceCents: null,
      daysToSale: null,
    },
    status: {
      lifecycle: vehicle.lifecycleState === 'AVAILABLE' ? 'ACTIVE' : vehicle.lifecycleState === 'REMOVED' ? 'REMOVED' : 'SOLD',
      addedAt: vehicle.updatedAt, // fallback
      lastUpdatedAt: vehicle.updatedAt,
      lastSyncAt: null,
    },
  };
}
