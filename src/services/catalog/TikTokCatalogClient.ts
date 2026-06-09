// TikTok for Business Catalog API v1.3
// Docs: https://ads.tiktok.com/marketing_api/docs?id=1740306752953346
//
// catalogId convention: "{bcId}:{catalogId}" — colon-separated Business Center ID
// and Catalog ID, both from TikTok Ads Manager → Assets → Catalogs.

const TIKTOK_API_BASE = 'https://business-api.tiktok.com/open_api/v1.3';

async function tikTokRequest<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${TIKTOK_API_BASE}${path}`, {
    method,
    headers: {
      'Access-Token': token,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json() as { code: number; message: string; data: T };
  if (json.code !== 0) throw new Error(`TikTok API ${json.code}: ${json.message}`);
  return json.data;
}

export type TikTokProduct = {
  item_id: string;
  title: string;
  description: string;
  link: string;
  image_link: string;
  price: number;          // major currency units (e.g. 28999.00)
  currency: string;       // e.g. "USD"
  availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'PREORDER';
  condition: 'NEW' | 'USED' | 'REFURBISHED';
  brand: string;
  custom_label_0?: string; // e.g. "make:Toyota"
  custom_label_1?: string; // e.g. "model:Camry"
  custom_label_2?: string; // e.g. "year:2022"
  custom_label_3?: string; // e.g. "mileage:18400"
  custom_label_4?: string; // e.g. "vin:..."
};

type BatchCreateResponse = {
  success_list?: Array<{ item_id: string }>;
  fail_list?: Array<{ item_id: string; fail_reason: string }>;
};

export function parseCatalogId(encoded: string): { bcId: string; catalogId: string } {
  const colon = encoded.indexOf(':');
  if (colon === -1) throw new Error(`TikTok catalogId must be "{bcId}:{catalogId}", got: ${encoded}`);
  return { bcId: encoded.slice(0, colon), catalogId: encoded.slice(colon + 1) };
}

export const TikTokCatalogClient = {
  async batchCreate(
    token: string,
    bcId: string,
    catalogId: string,
    products: TikTokProduct[],
  ): Promise<BatchCreateResponse> {
    return tikTokRequest('POST', '/catalog/product/batch_create/', token, {
      bc_id: bcId,
      catalog_id: catalogId,
      products,
    });
  },

  async deleteProduct(
    token: string,
    bcId: string,
    catalogId: string,
    itemId: string,
  ): Promise<void> {
    await tikTokRequest('POST', '/catalog/product/delete/', token, {
      bc_id: bcId,
      catalog_id: catalogId,
      item_ids: [itemId],
    });
  },
};
