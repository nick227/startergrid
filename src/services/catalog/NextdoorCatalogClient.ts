// Nextdoor Ads API v2 — Product Catalog
// Docs: https://developer.nextdoor.com/reference/advertising-introduction
// Auth: Authorization: Bearer {token}
// catalogId = Nextdoor catalog ID (from Nextdoor Ads Manager → Assets → Catalogs)
// Nextdoor does not expose a native batch endpoint — items are sent individually.

const NEXTDOOR_ADS_BASE = 'https://api.nextdoor.com/v2';

async function nextdoorRequest<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${NEXTDOOR_ADS_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return {} as T;

  const json = await res.json() as T & { error?: { code?: string; message?: string } };
  if (!res.ok) {
    const err = (json as { error?: { message?: string } }).error;
    const msg = err?.message ?? `HTTP ${res.status}`;
    throw new Error(`Nextdoor Ads API ${res.status}: ${msg}`);
  }
  return json;
}

export type NextdoorProduct = {
  id: string;
  title: string;
  description: string;
  url: string;
  image_url: string;
  price: string;                                    // "28999.00 USD"
  availability: 'in_stock' | 'out_of_stock';
  condition: 'new' | 'used' | 'refurbished';
  brand?: string;
  custom_label_0?: string;
  custom_label_1?: string;
  custom_label_2?: string;
  custom_label_3?: string;
};

export type NextdoorItemResponse = {
  data?: { id: string; catalog_id?: string; status?: string };
};

export const NextdoorCatalogClient = {
  async createOrUpdateItem(
    token: string,
    catalogId: string,
    product: NextdoorProduct,
  ): Promise<NextdoorItemResponse> {
    return nextdoorRequest('POST', `/catalogs/${catalogId}/items`, token, product);
  },

  async deleteItem(
    token: string,
    catalogId: string,
    itemId: string,
  ): Promise<void> {
    await nextdoorRequest('DELETE', `/catalogs/${catalogId}/items/${encodeURIComponent(itemId)}`, token);
  },
};
