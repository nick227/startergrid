const META_GRAPH_BASE = 'https://graph.facebook.com/v20.0';

async function graphPost<T>(path: string, token: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${META_GRAPH_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ access_token: token, ...body }),
  });
  const json = await res.json() as T & { error?: { message: string; code: number; type: string } };
  const err = (json as { error?: { message: string; code: number } }).error;
  if (err) throw new Error(`Meta API ${err.code}: ${err.message}`);
  return json;
}

async function graphGet<T>(path: string, token: string, params: Record<string, string> = {}): Promise<T> {
  const qs = new URLSearchParams({ access_token: token, ...params });
  const res = await fetch(`${META_GRAPH_BASE}${path}?${qs}`, { method: 'GET' });
  const json = await res.json() as T & { error?: { message: string; code: number } };
  const err = (json as { error?: { message: string; code: number } }).error;
  if (err) throw new Error(`Meta API ${err.code}: ${err.message}`);
  return json;
}

export type MetaVehicleData = {
  year: number;
  make: string;
  model: string;
  description: string;
  price: string;                                     // "25000.00 USD"
  mileage: { value: number; unit: 'MI' | 'KM' };
  image: Array<{ url: string }>;
  url: string;
  availability: 'IN_STOCK' | 'OUT_OF_STOCK';
  state_of_vehicle: 'NEW' | 'USED' | 'CPO';
  condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'OTHER';
  vin?: string;
  trim?: string;
  exterior_color?: string;
};

export type MetaBatchRequest = {
  method: 'UPDATE' | 'DELETE';
  item_id: string;
  data?: MetaVehicleData;
};

export type MetaBatchResponse = {
  handles?: string[];
};

export const MetaCatalogClient = {
  async getCatalog(token: string, catalogId: string): Promise<{ id: string; name: string; vertical: string }> {
    return graphGet(`/${catalogId}`, token, { fields: 'id,name,vertical' });
  },

  async upsertItems(
    token: string,
    catalogId: string,
    requests: MetaBatchRequest[],
  ): Promise<MetaBatchResponse> {
    return graphPost(`/${catalogId}/items_batch`, token, {
      item_type: 'VEHICLE',
      requests,
    });
  },

  async deleteItem(token: string, catalogId: string, itemId: string): Promise<void> {
    await graphPost(`/${catalogId}/items_batch`, token, {
      item_type: 'VEHICLE',
      requests: [{ method: 'DELETE', item_id: itemId }],
    });
  },
};
