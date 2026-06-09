import { TikTokCatalogClient, parseCatalogId, type TikTokProduct } from '../TikTokCatalogClient.js';
import type { CatalogSyncBridge, CatalogItem, CatalogSyncResult, DistributionContext } from '../catalogTypes.js';
import type { ContentPackage } from '../../distribution/types.js';

function tikTokCondition(condition: string): 'NEW' | 'USED' | 'REFURBISHED' {
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

export class TikTokCatalogBridge implements CatalogSyncBridge {
  readonly platformSlug = 'tiktok-automotive-ads';
  readonly oauthProvider = 'tiktok';

  buildItem(pkg: ContentPackage, _ctx: DistributionContext): CatalogItem {
    const sd = pkg.structuredData as VehicleStructuredData;

    const product: TikTokProduct = {
      item_id: sd.stockNumber,
      title: pkg.headline,
      description: pkg.body,
      link: pkg.link,
      image_link: pkg.imageUrls[0] ?? '',
      price: (pkg.price ?? 0) / 100,
      currency: 'USD',
      availability: 'IN_STOCK',
      condition: tikTokCondition(sd.condition),
      brand: sd.make,
      custom_label_0: `make:${sd.make}`,
      custom_label_1: `model:${sd.model}`,
      custom_label_2: `year:${sd.year}`,
      custom_label_3: `mileage:${sd.mileage}`,
      ...(sd.vin ? { custom_label_4: `vin:${sd.vin}` } : {}),
    };

    return { id: sd.stockNumber, fields: product as unknown as Record<string, unknown> };
  }

  async upsertItems(token: string, catalogId: string, items: CatalogItem[]): Promise<CatalogSyncResult> {
    const { bcId, catalogId: catId } = parseCatalogId(catalogId);
    const products = items.map(i => i.fields as TikTokProduct);
    const res = await TikTokCatalogClient.batchCreate(token, bcId, catId, products);
    const rejected = res.fail_list?.length ?? 0;
    return {
      accepted: (res.success_list?.length ?? items.length) - (rejected > 0 ? 0 : 0),
      rejected,
      ...(rejected > 0 ? {
        rejectedItems: (res.fail_list ?? []).map(f => ({ itemId: f.item_id, errors: [f.fail_reason] })),
      } : {}),
    };
  }

  async deleteItem(token: string, catalogId: string, itemId: string): Promise<void> {
    const { bcId, catalogId: catId } = parseCatalogId(catalogId);
    await TikTokCatalogClient.deleteProduct(token, bcId, catId, itemId);
  }
}
