import { MetaCatalogClient, type MetaVehicleData } from '../MetaCatalogClient.js';
import type { CatalogSyncBridge, CatalogItem, CatalogSyncResult, DistributionContext } from '../catalogTypes.js';
import type { ContentPackage } from '../../distribution/types.js';

function stateOfVehicle(condition: string): 'NEW' | 'USED' | 'CPO' {
  const c = condition.toLowerCase();
  if (c === 'new') return 'NEW';
  if (c === 'cpo' || c === 'certified') return 'CPO';
  return 'USED';
}

function metaCondition(condition: string): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'OTHER' {
  const c = condition.toLowerCase();
  if (c === 'new' || c === 'cpo' || c === 'certified') return 'EXCELLENT';
  return 'GOOD';
}

type VehicleStructuredData = {
  year: number;
  make: string;
  model: string;
  trim: string | null;
  condition: string;
  mileage: number;
  exteriorColor: string;
  stockNumber: string;
  vin: string | null;
};

export class MetaCatalogBridge implements CatalogSyncBridge {
  readonly platformSlug = 'meta-automotive-ads';
  readonly oauthProvider = 'meta-catalog-ads';

  buildItem(pkg: ContentPackage, _ctx: DistributionContext): CatalogItem {
    const sd = pkg.structuredData as VehicleStructuredData;

    const data: MetaVehicleData = {
      year: sd.year,
      make: sd.make,
      model: sd.model,
      description: pkg.body,
      price: `${((pkg.price ?? 0) / 100).toFixed(2)} USD`,
      mileage: { value: sd.mileage, unit: 'MI' },
      image: pkg.imageUrls.map(url => ({ url })),
      url: pkg.link,
      availability: 'IN_STOCK',
      state_of_vehicle: stateOfVehicle(sd.condition),
      condition: metaCondition(sd.condition),
      ...(sd.vin ? { vin: sd.vin } : {}),
      ...(sd.trim ? { trim: sd.trim } : {}),
      ...(sd.exteriorColor ? { exterior_color: sd.exteriorColor } : {}),
    };

    return { id: sd.stockNumber, fields: data as unknown as Record<string, unknown> };
  }

  async upsertItems(token: string, catalogId: string, items: CatalogItem[]): Promise<CatalogSyncResult> {
    const requests = items.map(item => ({
      method: 'UPDATE' as const,
      item_id: item.id,
      data: item.fields as MetaVehicleData,
    }));

    const res = await MetaCatalogClient.upsertItems(token, catalogId, requests);
    return { accepted: items.length, rejected: 0, handles: res.handles };
  }

  async deleteItem(token: string, catalogId: string, itemId: string): Promise<void> {
    await MetaCatalogClient.deleteItem(token, catalogId, itemId);
  }
}
