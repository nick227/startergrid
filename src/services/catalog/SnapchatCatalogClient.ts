// Snapchat Marketing API v1 — Catalog Products
// Docs: https://marketingapi.snapchat.com/docs/
// Auth: Authorization: Bearer {token}
// catalogId = Snapchat catalog ID (from Snapchat Ads Manager → Assets → Catalogs)

const SNAPCHAT_API_BASE = 'https://adsapi.snapchat.com/v1';

async function snapchatRequest<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${SNAPCHAT_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return {} as T;

  const json = await res.json() as T & { request_status?: string; request_id?: string };
  if (!res.ok) {
    const msg = (json as { request_status?: string }).request_status ?? `HTTP ${res.status}`;
    throw new Error(`Snapchat API ${res.status}: ${msg}`);
  }
  return json;
}

export type SnapchatProduct = {
  id: string;
  name: string;
  description: string;
  url: string;
  image_url: string;
  price: string;          // "28999.00"
  currency: string;       // "USD"
  availability: 'in_stock' | 'out_of_stock' | 'preorder';
  condition: 'new' | 'used' | 'refurbished';
  brand?: string;
  custom_label_0?: string;
  custom_label_1?: string;
  custom_label_2?: string;
  custom_label_3?: string;
};

export const SnapchatCatalogClient = {
  // Snapchat uses single-product POSTs to the catalog products endpoint
  async createProduct(
    token: string,
    catalogId: string,
    product: SnapchatProduct,
  ): Promise<{ request_status: string; product?: { id: string } }> {
    return snapchatRequest('POST', `/catalogs/${catalogId}/products`, token, {
      product,
    });
  },

  async deleteProduct(
    token: string,
    catalogId: string,
    productId: string,
  ): Promise<void> {
    await snapchatRequest('DELETE', `/catalogs/${catalogId}/products/${productId}`, token);
  },
};
