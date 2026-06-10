// TikTok Shop Open API v202309
// Docs: https://partner.tiktokshop.com/docv2/page/product
// Auth: x-tts-access-token header
// shopId = TikTok Shop seller shop ID (from Seller Center → Shop Management)

const TIKTOK_SHOP_BASE = 'https://open-api.tiktok-shops.com';

// TikTok Shop category for automotive — verify/update via GET /product/202309/categories
export const TIKTOK_SHOP_AUTOMOTIVE_CATEGORY_ID = '600133';

async function shopRequest<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${TIKTOK_SHOP_BASE}${path}`, {
    method,
    headers: {
      'x-tts-access-token': token,
      'Content-Type': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const json = await res.json() as T & { code?: number; message?: string };
  const code = (json as { code?: number }).code;
  if (!res.ok || (code !== undefined && code !== 0)) {
    const msg = (json as { message?: string }).message ?? `HTTP ${res.status}`;
    throw new Error(`TikTok Shop API ${code ?? res.status}: ${msg}`);
  }
  return json;
}

export type TikTokShopSku = {
  seller_sku: string;
  price: { amount: string; currency: string };
  inventory: Array<{ quantity: number }>;
  sales_attributes?: Array<{ name: string; value: string }>;
};

export type TikTokShopProduct = {
  title: string;
  description: string;
  category_id: string;
  images: Array<{ uri: string }>;
  skus: TikTokShopSku[];
  package_dimensions?: { length: string; width: string; height: string; unit: string };
  package_weight?: { value: string; unit: string };
};

export type TikTokShopCreateResponse = {
  code: number;
  message: string;
  data: {
    product_id: string;
    skus?: Array<{ id: string; seller_sku: string }>;
    warnings?: string[];
  };
};

export type TikTokShopSearchResponse = {
  code: number;
  message: string;
  data: {
    products: Array<{ id: string; title: string; seller_skus?: string[] }>;
    total_count: number;
    next_page_token?: string;
  };
};

export type TikTokShopInfoResponse = {
  code: number;
  message: string;
  data: {
    shops: Array<{ id: string; name: string; region: string; seller_type: string }>;
  };
};

export const TikTokShopClient = {
  async getShop(token: string): Promise<TikTokShopInfoResponse> {
    return shopRequest('POST', '/shop/202309/shops/get', token, {});
  },

  // shopId is bound to the OAuth token's seller context; passed for future param support
  async createProduct(
    token: string,
    _shopId: string,
    product: TikTokShopProduct,
  ): Promise<TikTokShopCreateResponse> {
    return shopRequest('POST', '/product/202309/products', token, product);
  },

  async searchProductsBySku(
    token: string,
    sellerSkus: string[],
  ): Promise<TikTokShopSearchResponse> {
    return shopRequest('POST', '/product/202309/products/search', token, {
      seller_skus: sellerSkus,
      page_size: sellerSkus.length || 10,
    });
  },

  async deleteProduct(
    token: string,
    productId: string,
  ): Promise<void> {
    await shopRequest('DELETE', `/product/202309/products/${productId}`, token);
  },
};
