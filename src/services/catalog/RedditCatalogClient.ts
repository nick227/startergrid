// Reddit Ads API — Product Catalog
// Docs: https://ads-api.reddit.com/docs/
// Auth: Authorization: Bearer {token}
// catalogId = Reddit catalog ID (from Reddit Ads Manager → Assets → Catalogs)

const REDDIT_ADS_BASE = 'https://ads-api.reddit.com/api/v2.1';

async function redditRequest<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${REDDIT_ADS_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return {} as T;

  const json = await res.json() as T & { status?: string; errors?: Array<{ message: string }> };
  if (!res.ok) {
    const msg = (json as { errors?: Array<{ message: string }> }).errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new Error(`Reddit Ads API ${res.status}: ${msg}`);
  }
  return json;
}

export type RedditProduct = {
  item_id: string;
  title: string;
  description: string;
  link: string;
  image_link: string;
  price: string;          // "28999.00"
  currency: string;       // "USD"
  availability: 'IN_STOCK' | 'OUT_OF_STOCK';
  condition: 'new' | 'used' | 'refurbished';
  brand?: string;
  custom_label_0?: string;
  custom_label_1?: string;
  custom_label_2?: string;
  custom_label_3?: string;
};

type BatchOperation = {
  method: 'UPSERT' | 'DELETE';
  item_id: string;
  attributes?: RedditProduct;
};

export type RedditBatchResponse = {
  batch_id?: string;
  items?: Array<{ item_id: string; errors?: Array<{ message: string }> }>;
};

export const RedditCatalogClient = {
  async batchUpsert(
    token: string,
    catalogId: string,
    products: RedditProduct[],
  ): Promise<RedditBatchResponse> {
    const operations: BatchOperation[] = products.map(p => ({
      method: 'UPSERT',
      item_id: p.item_id,
      attributes: p,
    }));
    return redditRequest('POST', `/catalogs/${catalogId}/items/batch`, token, { operations });
  },

  async deleteItem(
    token: string,
    catalogId: string,
    itemId: string,
  ): Promise<void> {
    await redditRequest('POST', `/catalogs/${catalogId}/items/batch`, token, {
      operations: [{ method: 'DELETE', item_id: itemId }],
    });
  },
};
