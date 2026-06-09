import { RedditCatalogClient, type RedditProduct } from '../RedditCatalogClient.js';
import type { CatalogSyncBridge, CatalogItem, CatalogSyncResult, DistributionContext } from '../catalogTypes.js';
import type { ContentPackage } from '../../distribution/types.js';

type VehicleStructuredData = {
  year: number; make: string; model: string; trim: string | null;
  condition: string; mileage: number; exteriorColor: string;
  stockNumber: string; vin: string | null;
};

function redditCondition(condition: string): 'new' | 'used' | 'refurbished' {
  const c = condition.toLowerCase();
  if (c === 'new') return 'new';
  if (c === 'cpo' || c === 'certified') return 'refurbished';
  return 'used';
}

export class RedditCatalogBridge implements CatalogSyncBridge {
  readonly platformSlug = 'reddit-dynamic-product-ads';
  readonly oauthProvider = 'reddit';

  buildItem(pkg: ContentPackage, _ctx: DistributionContext): CatalogItem {
    const sd = pkg.structuredData as VehicleStructuredData;

    const product: RedditProduct = {
      item_id: sd.stockNumber,
      title: pkg.headline,
      description: pkg.body,
      link: pkg.link,
      image_link: pkg.imageUrls[0] ?? '',
      price: ((pkg.price ?? 0) / 100).toFixed(2),
      currency: 'USD',
      availability: 'IN_STOCK',
      condition: redditCondition(sd.condition),
      brand: sd.make,
      custom_label_0: sd.make,
      custom_label_1: sd.model,
      custom_label_2: String(sd.year),
      custom_label_3: String(sd.mileage),
    };

    return { id: sd.stockNumber, fields: product as unknown as Record<string, unknown> };
  }

  async upsertItems(token: string, catalogId: string, items: CatalogItem[]): Promise<CatalogSyncResult> {
    const products = items.map(i => i.fields as RedditProduct);
    const res = await RedditCatalogClient.batchUpsert(token, catalogId, products);

    const failedItems = (res.items ?? []).filter(i => i.errors?.length);
    const rejected = failedItems.length;

    return {
      accepted: items.length - rejected,
      rejected,
      handles: res.batch_id ? [res.batch_id] : undefined,
      ...(rejected > 0 ? {
        rejectedItems: failedItems.map(i => ({
          itemId: i.item_id,
          errors: (i.errors ?? []).map(e => e.message),
        })),
      } : {}),
    };
  }

  async deleteItem(token: string, catalogId: string, itemId: string): Promise<void> {
    await RedditCatalogClient.deleteItem(token, catalogId, itemId);
  }
}
