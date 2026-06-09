import { GoogleMerchantClient, type GoogleProduct } from '../GoogleMerchantClient.js';
import type { CatalogSyncBridge, CatalogItem, CatalogSyncResult, DistributionContext } from '../catalogTypes.js';
import type { ContentPackage } from '../../distribution/types.js';

// Google product IDs must be prefixed with channel:contentLanguage:targetCountry
function productId(offerId: string): string {
  return `online:en:US:${offerId}`;
}

function googleCondition(condition: string): 'new' | 'used' | 'refurbished' {
  const c = condition.toLowerCase();
  if (c === 'new') return 'new';
  if (c === 'cpo' || c === 'certified') return 'refurbished';
  return 'used';
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

export class GoogleVehicleAdsBridge implements CatalogSyncBridge {
  readonly platformSlug = 'google-vehicle-ads';
  readonly oauthProvider = 'google';

  buildItem(pkg: ContentPackage, _ctx: DistributionContext): CatalogItem {
    const sd = pkg.structuredData as VehicleStructuredData;
    const [primaryImage, ...additionalImages] = pkg.imageUrls;

    const product: GoogleProduct = {
      offerId: sd.stockNumber,
      title: pkg.headline,
      description: pkg.body,
      link: pkg.link,
      imageLink: primaryImage ?? '',
      ...(additionalImages.length ? { additionalImageLinks: additionalImages } : {}),
      contentLanguage: 'en',
      targetCountry: 'US',
      channel: 'online',
      availability: 'in stock',
      condition: googleCondition(sd.condition),
      price: {
        value: ((pkg.price ?? 0) / 100).toFixed(2),
        currency: 'USD',
      },
      brand: sd.make,
      customAttributes: [
        { name: 'make', value: sd.make },
        { name: 'model', value: sd.model },
        { name: 'year', value: String(sd.year) },
        { name: 'mileage', value: String(sd.mileage) },
        ...(sd.vin ? [{ name: 'vin', value: sd.vin }] : []),
        ...(sd.trim ? [{ name: 'trim', value: sd.trim }] : []),
        ...(sd.exteriorColor ? [{ name: 'color', value: sd.exteriorColor }] : []),
      ],
    };

    return { id: sd.stockNumber, fields: product as unknown as Record<string, unknown> };
  }

  async upsertItems(token: string, catalogId: string, items: CatalogItem[]): Promise<CatalogSyncResult> {
    const entries = items.map((item, i) => ({
      batchId: i + 1,
      merchantId: catalogId,
      method: 'insert' as const,
      product: item.fields as GoogleProduct,
    }));

    const res = await GoogleMerchantClient.batchProducts(token, entries);

    const failedEntries = (res.entries ?? []).filter(e => e.errors?.errors?.length);
    const rejected = failedEntries.length;

    return {
      accepted: items.length - rejected,
      rejected,
      ...(rejected > 0 ? {
        rejectedItems: failedEntries.map(e => ({
          itemId: String(e.batchId),
          errors: (e.errors?.errors ?? []).map(err => err.message),
        })),
      } : {}),
    };
  }

  async deleteItem(token: string, catalogId: string, itemId: string): Promise<void> {
    await GoogleMerchantClient.deleteProduct(token, catalogId, productId(itemId));
  }
}
