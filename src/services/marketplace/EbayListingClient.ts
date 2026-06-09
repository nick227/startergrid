function ebayApiBase(): string {
  return (process.env['EBAY_ENVIRONMENT'] ?? '').toLowerCase() === 'sandbox'
    ? 'https://api.sandbox.ebay.com'
    : 'https://api.ebay.com';
}

export type EbayInventoryItemInput = {
  sku: string;
  condition: string;
  title: string;
  description: string;
  imageUrls: string[];
  mileage: number;
  year: number;
  make: string;
  vehicleModel: string;
  trim: string | null;
  vin: string | null;
};

export type EbayOfferInput = {
  sku: string;
  marketplaceId: string;
  format: string;
  listingDescription: string;
  priceSummary: { value: string; currency: string };
  quantityLimitPerBuyer: number;
  categoryId: string;
  merchantLocationKey?: string;
  listingPolicies: {
    fulfillmentPolicyId: string;
    paymentPolicyId: string;
    returnPolicyId: string;
  };
};

export type EbayOffer = {
  offerId: string;
  sku: string;
  status: string;
};

function ebayCondition(condition: string): string {
  const c = condition.toUpperCase();
  if (c === 'NEW') return 'NEW';
  if (c === 'CERTIFIED') return 'CERTIFIED_REFURBISHED';
  return 'USED_EXCELLENT';
}

async function ebayFetch<T>(
  token: string,
  method: string,
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(`${ebayApiBase()}${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return undefined as unknown as T;

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`eBay API ${method} ${path} → ${res.status}: ${text}`);
  }
  return text ? (JSON.parse(text) as T) : (undefined as unknown as T);
}

export const EbayListingClient = {
  async upsertInventoryItem(token: string, item: EbayInventoryItemInput): Promise<void> {
    const aspects: Record<string, string[]> = {
      Year: [String(item.year)],
      Make: [item.make],
      Model: [item.vehicleModel],
    };
    if (item.trim) aspects['Trim'] = [item.trim];
    if (item.vin) aspects['Vehicle Identification Number (VIN)'] = [item.vin];
    if (item.mileage) aspects['Mileage'] = [`${item.mileage}`];

    await ebayFetch<void>(token, 'PUT', `/sell/inventory/v1/inventory_item/${encodeURIComponent(item.sku)}`, {
      condition: ebayCondition(item.condition),
      product: {
        title: item.title,
        description: item.description,
        imageUrls: item.imageUrls,
        aspects,
      },
      availability: {
        shipToLocationAvailability: { quantity: 1 },
      },
    });
  },

  async getOffer(token: string, sku: string): Promise<EbayOffer | null> {
    try {
      const data = await ebayFetch<{ offers?: EbayOffer[] }>(
        token, 'GET', `/sell/inventory/v1/offer?sku=${encodeURIComponent(sku)}`
      );
      return data?.offers?.[0] ?? null;
    } catch {
      return null;
    }
  },

  async createOffer(token: string, offer: EbayOfferInput): Promise<string> {
    const body: Record<string, unknown> = {
      sku: offer.sku,
      marketplaceId: offer.marketplaceId,
      format: offer.format,
      listingDescription: offer.listingDescription,
      pricingSummary: { price: offer.priceSummary },
      quantityLimitPerBuyer: offer.quantityLimitPerBuyer,
      categoryId: offer.categoryId,
      listingPolicies: offer.listingPolicies,
    };
    if (offer.merchantLocationKey) body['merchantLocationKey'] = offer.merchantLocationKey;
    const data = await ebayFetch<{ offerId: string }>(token, 'POST', '/sell/inventory/v1/offer', body);
    return data.offerId;
  },

  async updateOffer(token: string, offerId: string, offer: Partial<EbayOfferInput>): Promise<void> {
    await ebayFetch<void>(token, 'PUT', `/sell/inventory/v1/offer/${encodeURIComponent(offerId)}`, offer);
  },

  async publishOffer(token: string, offerId: string): Promise<string> {
    const data = await ebayFetch<{ listingId: string }>(
      token, 'POST', `/sell/inventory/v1/offer/${encodeURIComponent(offerId)}/publish`
    );
    return data.listingId;
  },

  async withdrawOffer(token: string, offerId: string): Promise<void> {
    await ebayFetch<void>(token, 'POST', `/sell/inventory/v1/offer/${encodeURIComponent(offerId)}/withdraw`);
  },
};
