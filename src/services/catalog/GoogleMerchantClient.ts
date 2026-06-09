const CONTENT_API_BASE = 'https://shoppingcontent.googleapis.com/content/v2.1';

async function contentRequest<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${CONTENT_API_BASE}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return {} as T;

  const json = await res.json() as T & { error?: { code: number; message: string } };
  const err = (json as { error?: { code: number; message: string } }).error;
  if (err) throw new Error(`Google Merchant API ${err.code}: ${err.message}`);
  return json;
}

export type GoogleCustomAttribute = { name: string; value: string };

export type GoogleProduct = {
  offerId: string;
  title: string;
  description: string;
  link: string;
  imageLink: string;
  additionalImageLinks?: string[];
  contentLanguage: string;
  targetCountry: string;
  channel: string;
  availability: string;
  condition: string;
  price: { value: string; currency: string };
  brand: string;
  customAttributes: GoogleCustomAttribute[];
};

export type GoogleProductBatchEntry = {
  batchId: number;
  merchantId: string;
  method: 'insert' | 'delete' | 'get';
  product?: GoogleProduct;
  productId?: string;
};

export type GoogleBatchResponse = {
  kind: string;
  entries: Array<{
    batchId: number;
    errors?: { errors: Array<{ message: string; reason: string }> };
    product?: GoogleProduct;
  }>;
};

export const GoogleMerchantClient = {
  // Returns basic account info; use as a connectivity check.
  async getAccount(
    token: string,
    merchantId: string,
  ): Promise<{ id: string; name: string; websiteUrl?: string }> {
    return contentRequest('GET', `/${merchantId}/accounts/${merchantId}`, token);
  },

  // Batch insert/delete of products. Up to 1000 entries per call.
  async batchProducts(
    token: string,
    entries: GoogleProductBatchEntry[],
  ): Promise<GoogleBatchResponse> {
    return contentRequest('POST', '/products/batch', token, { entries });
  },

  // Deletes a single product by full product ID (online:en:US:{offerId}).
  async deleteProduct(token: string, merchantId: string, productId: string): Promise<void> {
    await contentRequest('DELETE', `/${merchantId}/products/${encodeURIComponent(productId)}`, token);
  },
};
