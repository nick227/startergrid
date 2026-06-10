import { TikTokShopClient, TIKTOK_SHOP_AUTOMOTIVE_CATEGORY_ID, type TikTokShopProduct } from '../TikTokShopClient.js';
import type { CatalogSyncBridge, CatalogItem, CatalogSyncResult, DistributionContext } from '../catalogTypes.js';
import type { ContentPackage } from '../../distribution/types.js';

function shopCondition(condition: string): string {
  const c = condition.toLowerCase();
  if (c === 'new') return 'New';
  if (c === 'cpo' || c === 'certified') return 'Certified Pre-Owned';
  return 'Used';
}

type VehicleStructuredData = {
  year: number; make: string; model: string; trim: string | null;
  condition: string; mileage: number; exteriorColor: string;
  stockNumber: string; vin: string | null;
};

export class TikTokShopBridge implements CatalogSyncBridge {
  readonly platformSlug = 'tiktok-shop';
  readonly oauthProvider = 'tiktok-shop';

  buildItem(pkg: ContentPackage, _ctx: DistributionContext): CatalogItem {
    const sd = pkg.structuredData as VehicleStructuredData;

    const descriptionLines = [
      pkg.body,
      `Condition: ${shopCondition(sd.condition)}`,
      `Mileage: ${sd.mileage.toLocaleString()} miles`,
      `Color: ${sd.exteriorColor}`,
      ...(sd.vin ? [`VIN: ${sd.vin}`] : []),
    ];

    const product: TikTokShopProduct = {
      title: pkg.headline,
      description: descriptionLines.join('\n'),
      category_id: TIKTOK_SHOP_AUTOMOTIVE_CATEGORY_ID,
      images: pkg.imageUrls.slice(0, 9).map(uri => ({ uri })),
      skus: [{
        seller_sku: sd.stockNumber,
        price: {
          amount: ((pkg.price ?? 0) / 100).toFixed(2),
          currency: 'USD',
        },
        inventory: [{ quantity: 1 }],
        sales_attributes: [
          { name: 'Year', value: String(sd.year) },
          { name: 'Make', value: sd.make },
          { name: 'Model', value: sd.model },
          ...(sd.trim ? [{ name: 'Trim', value: sd.trim }] : []),
          { name: 'Color', value: sd.exteriorColor },
        ],
      }],
    };

    return { id: sd.stockNumber, fields: product as unknown as Record<string, unknown> };
  }

  // TikTok Shop has no batch endpoint — products are created individually.
  async upsertItems(token: string, _catalogId: string, items: CatalogItem[]): Promise<CatalogSyncResult> {
    let accepted = 0;
    const rejectedItems: Array<{ itemId: string; errors: string[] }> = [];

    for (const item of items) {
      try {
        await TikTokShopClient.createProduct(token, _catalogId, item.fields as TikTokShopProduct);
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

  async deleteItem(token: string, _catalogId: string, itemId: string): Promise<void> {
    const search = await TikTokShopClient.searchProductsBySku(token, [itemId]);
    const product = search.data?.products?.[0];
    if (!product) return; // already gone
    await TikTokShopClient.deleteProduct(token, product.id);
  }
}
