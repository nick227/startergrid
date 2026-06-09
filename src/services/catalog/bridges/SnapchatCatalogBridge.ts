import { SnapchatCatalogClient, type SnapchatProduct } from '../SnapchatCatalogClient.js';
import type { CatalogSyncBridge, CatalogItem, CatalogSyncResult, DistributionContext } from '../catalogTypes.js';
import type { ContentPackage } from '../../distribution/types.js';

function snapchatCondition(condition: string): 'new' | 'used' | 'refurbished' {
  const c = condition.toLowerCase();
  if (c === 'new') return 'new';
  if (c === 'cpo' || c === 'certified') return 'refurbished';
  return 'used';
}

type VehicleStructuredData = {
  year: number; make: string; model: string; trim: string | null;
  condition: string; mileage: number; exteriorColor: string;
  stockNumber: string; vin: string | null;
};

export class SnapchatCatalogBridge implements CatalogSyncBridge {
  readonly platformSlug = 'snapchat-dynamic-product-ads';
  readonly oauthProvider = 'snapchat';

  buildItem(pkg: ContentPackage, _ctx: DistributionContext): CatalogItem {
    const sd = pkg.structuredData as VehicleStructuredData;

    const product: SnapchatProduct = {
      id: sd.stockNumber,
      name: pkg.headline,
      description: pkg.body,
      url: pkg.link,
      image_url: pkg.imageUrls[0] ?? '',
      price: ((pkg.price ?? 0) / 100).toFixed(2),
      currency: 'USD',
      availability: 'in_stock',
      condition: snapchatCondition(sd.condition),
      brand: sd.make,
      custom_label_0: sd.make,
      custom_label_1: sd.model,
      custom_label_2: String(sd.year),
      custom_label_3: String(sd.mileage),
    };

    return { id: sd.stockNumber, fields: product as unknown as Record<string, unknown> };
  }

  // Snapchat does not have a native batch endpoint — products are sent individually
  async upsertItems(token: string, catalogId: string, items: CatalogItem[]): Promise<CatalogSyncResult> {
    let accepted = 0;
    const rejectedItems: Array<{ itemId: string; errors: string[] }> = [];

    for (const item of items) {
      try {
        await SnapchatCatalogClient.createProduct(token, catalogId, item.fields as SnapchatProduct);
        accepted++;
      } catch (err) {
        rejectedItems.push({
          itemId: item.id,
          errors: [err instanceof Error ? err.message : String(err)],
        });
      }
    }

    return {
      accepted,
      rejected: rejectedItems.length,
      ...(rejectedItems.length > 0 ? { rejectedItems } : {}),
    };
  }

  async deleteItem(token: string, catalogId: string, itemId: string): Promise<void> {
    await SnapchatCatalogClient.deleteProduct(token, catalogId, itemId);
  }
}
