// X Ads API v12 — Dynamic Product Ads Catalog
// Docs: https://docs.x.com/x-ads-api
// Auth: Authorization: Bearer {token}
// catalogId = X DPA catalog ID (from X Ads Manager → Assets → Catalogs)
// X does not expose a native batch endpoint — items are sent individually.

const X_ADS_API_BASE = 'https://ads-api.x.com/12';

async function xAdsRequest<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${X_ADS_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return {} as T;

  const json = await res.json() as T & { errors?: Array<{ message: string; code?: number }> };
  if (!res.ok) {
    const errors = (json as { errors?: Array<{ message: string }> }).errors;
    const msg = errors?.[0]?.message ?? `HTTP ${res.status}`;
    throw new Error(`X Ads API ${res.status}: ${msg}`);
  }
  return json;
}

export type XProduct = {
  content_id: string;
  title: string;
  description: string;
  product_url: string;
  image_url: string;
  price: string;          // "28999.00 USD"
  availability: 'in stock' | 'out of stock' | 'preorder';
  condition: 'new' | 'used' | 'refurbished';
  brand?: string;
  custom_label_0?: string;
  custom_label_1?: string;
  custom_label_2?: string;
  custom_label_3?: string;
};

export type XItemResponse = {
  data?: { id: string; content_id: string };
  request?: { params?: Record<string, unknown> };
};

export const XCatalogClient = {
  async createOrUpdateItem(
    token: string,
    catalogId: string,
    product: XProduct,
  ): Promise<XItemResponse> {
    return xAdsRequest('POST', `/catalogs/${catalogId}/items`, token, product);
  },

  async deleteItem(
    token: string,
    catalogId: string,
    itemId: string,
  ): Promise<void> {
    await xAdsRequest('DELETE', `/catalogs/${catalogId}/items/${encodeURIComponent(itemId)}`, token);
  },
};
