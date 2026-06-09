// Microsoft Merchant Center Content API v9.1
// Docs: https://learn.microsoft.com/en-us/advertising/shopping-content/
// Auth: AuthenticationToken header (OAuth bearer from Azure AD)
// catalogId = storeId (numeric string from Microsoft Merchant Center)

const BMC_API_BASE = 'https://content.api.bingads.microsoft.com/shopping/v9.1/bmc';

async function bmcRequest<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${BMC_API_BASE}${path}`, {
    method,
    headers: {
      AuthenticationToken: token,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return {} as T;

  const json = await res.json() as T & { error?: { code: number; message: string } };
  const err = (json as { error?: { code: number; message: string } }).error;
  if (err) throw new Error(`Microsoft Merchant API ${err.code}: ${err.message}`);
  return json;
}

export type MicrosoftProduct = {
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
  identifierExists: boolean;
  customAttributes?: Array<{ name: string; value: string }>;
};

export type MicrosoftBatchEntry = {
  batchId: number;
  merchantId: string;
  method: 'insert' | 'delete' | 'get';
  product?: MicrosoftProduct;
  productId?: string;
};

export type MicrosoftBatchResponse = {
  kind: string;
  entries: Array<{
    batchId: number;
    errors?: { errors: Array<{ message: string; reason: string }> };
    product?: MicrosoftProduct;
  }>;
};

export const MicrosoftMerchantClient = {
  // Verifies account access; returns store info.
  async getStore(token: string, storeId: string): Promise<{ merchantId: string; name: string }> {
    return bmcRequest('GET', `/${storeId}/accounts/${storeId}`, token);
  },

  async batchProducts(
    token: string,
    entries: MicrosoftBatchEntry[],
  ): Promise<MicrosoftBatchResponse> {
    const storeId = entries[0]?.merchantId ?? '';
    return bmcRequest('POST', `/${storeId}/products/batch`, token, { entries });
  },

  async deleteProduct(token: string, storeId: string, productId: string): Promise<void> {
    await bmcRequest('DELETE', `/${storeId}/products/${encodeURIComponent(productId)}`, token);
  },
};
