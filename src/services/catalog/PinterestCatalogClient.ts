// Pinterest Catalog API v5
// Docs: https://developers.pinterest.com/docs/api/v5/#tag/catalogs
// Auth: Authorization: Bearer {token}
// catalogId = Pinterest catalog_id (from Pinterest Business Hub → Catalogs)

const PINTEREST_API_BASE = 'https://api.pinterest.com/v5';

async function pinterestRequest<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${PINTEREST_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json() as T & { code?: number; message?: string };
  if (!res.ok) {
    const msg = (json as { message?: string }).message ?? `HTTP ${res.status}`;
    throw new Error(`Pinterest API ${res.status}: ${msg}`);
  }
  return json;
}

export type PinterestItemAttributes = {
  title: string;
  description: string;
  link: string;
  image_link: string;
  price: string;          // "28999.00"
  currency: string;       // "USD"
  availability: 'IN_STOCK' | 'OUT_OF_STOCK' | 'PREORDER';
  condition: 'NEW' | 'USED' | 'REFURBISHED';
  brand?: string;
  google_product_category?: string;
  custom_label_0?: string;  // make
  custom_label_1?: string;  // model
  custom_label_2?: string;  // year
  custom_label_3?: string;  // mileage
  custom_label_4?: string;  // vin
};

export type PinterestBatchItem = {
  item_id: string;
  attributes?: PinterestItemAttributes;
};

export type PinterestBatchResponse = {
  batch_id: string;
  created_time?: string;
  completed_time?: string;
  status?: string;
  items?: Array<{ item_id: string; errors?: Array<{ attribute: string; error_messages: string[] }> }>;
};

export const PinterestCatalogClient = {
  async upsertItems(
    token: string,
    catalogId: string,
    items: PinterestBatchItem[],
  ): Promise<PinterestBatchResponse> {
    return pinterestRequest('POST', '/catalogs/items/batch', token, {
      catalog_id: catalogId,
      country: 'US',
      language: 'en',
      operation: 'UPSERT',
      items,
    });
  },

  async deleteItems(
    token: string,
    catalogId: string,
    itemIds: string[],
  ): Promise<PinterestBatchResponse> {
    return pinterestRequest('POST', '/catalogs/items/batch', token, {
      catalog_id: catalogId,
      country: 'US',
      language: 'en',
      operation: 'DELETE',
      items: itemIds.map(id => ({ item_id: id })),
    });
  },
};
