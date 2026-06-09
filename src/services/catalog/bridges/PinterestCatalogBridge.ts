import { PinterestCatalogClient, type PinterestItemAttributes } from '../PinterestCatalogClient.js';
import type { CatalogSyncBridge, CatalogItem, CatalogSyncResult, DistributionContext } from '../catalogTypes.js';
import type { ContentPackage } from '../../distribution/types.js';

function pinterestCondition(condition: string): 'NEW' | 'USED' | 'REFURBISHED' {
  const c = condition.toLowerCase();
  if (c === 'new') return 'NEW';
  if (c === 'cpo' || c === 'certified') return 'REFURBISHED';
  return 'USED';
}

type VehicleStructuredData = {
  year: number; make: string; model: string; trim: string | null;
  condition: string; mileage: number; exteriorColor: string;
  stockNumber: string; vin: string | null;
};

export class PinterestCatalogBridge implements CatalogSyncBridge {
  readonly platformSlug = 'pinterest-shopping-ads';
  readonly oauthProvider = 'pinterest';

  buildItem(pkg: ContentPackage, _ctx: DistributionContext): CatalogItem {
    const sd = pkg.structuredData as VehicleStructuredData;

    const attributes: PinterestItemAttributes = {
      title: pkg.headline,
      description: pkg.body,
      link: pkg.link,
      image_link: pkg.imageUrls[0] ?? '',
      price: ((pkg.price ?? 0) / 100).toFixed(2),
      currency: 'USD',
      availability: 'IN_STOCK',
      condition: pinterestCondition(sd.condition),
      brand: sd.make,
      google_product_category: 'Vehicles & Parts > Vehicles > Motor Vehicles',
      custom_label_0: sd.make,
      custom_label_1: sd.model,
      custom_label_2: String(sd.year),
      custom_label_3: String(sd.mileage),
      ...(sd.vin ? { custom_label_4: sd.vin } : {}),
    };

    return { id: sd.stockNumber, fields: { item_id: sd.stockNumber, attributes } as unknown as Record<string, unknown> };
  }

  async upsertItems(token: string, catalogId: string, items: CatalogItem[]): Promise<CatalogSyncResult> {
    const batchItems = items.map(i => i.fields as { item_id: string; attributes: PinterestItemAttributes });
    const res = await PinterestCatalogClient.upsertItems(token, catalogId, batchItems);

    // Pinterest batch is async (returns batch_id); count accepted as all items
    const failedItems = (res.items ?? []).filter(i => i.errors?.length);
    const rejected = failedItems.length;

    return {
      accepted: items.length - rejected,
      rejected,
      handles: res.batch_id ? [res.batch_id] : undefined,
      ...(rejected > 0 ? {
        rejectedItems: failedItems.map(i => ({
          itemId: i.item_id,
          errors: (i.errors ?? []).flatMap(e => e.error_messages),
        })),
      } : {}),
    };
  }

  async deleteItem(token: string, catalogId: string, itemId: string): Promise<void> {
    await PinterestCatalogClient.deleteItems(token, catalogId, [itemId]);
  }
}
