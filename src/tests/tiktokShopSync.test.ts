import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { TikTokShopClient } from '../services/catalog/TikTokShopClient.js';
import { TikTokShopBridge } from '../services/catalog/bridges/TikTokShopBridge.js';
import { ContentPackageBuilder, type VehicleInput } from '../services/distribution/ContentPackageBuilder.js';

const DEALER_ID = 'dealer-tts-test';
const SHOP_ID = '7300000000000000001';
const SESSION_EXPIRY = new Date(Date.now() + 3600_000);

const VEHICLE: VehicleInput = {
  id: 'veh-tts-001', vin: '5YJSA1CN5DFP12345',
  year: 2024, make: 'Toyota', model: 'Camry', trim: 'XSE',
  priceCents: 3299900, condition: 'used', mileage: 15000,
  exteriorColor: 'Wind Chill Pearl', stockNumber: 'TOY-TTS-001',
  media: [
    { url: 'https://cdn.example.com/camry1.jpg', sortOrder: 0 },
    { url: 'https://cdn.example.com/camry2.jpg', sortOrder: 1 },
  ],
};

const LIVE_TOKEN = {
  id: 'tok-tts', dealershipId: DEALER_ID, provider: 'tiktok-shop', accessToken: 'tts-token',
  refreshToken: null, tokenType: 'Bearer', scope: null,
  expiresAt: new Date(Date.now() + 3600_000),
  rawPayload: {}, createdAt: new Date(), updatedAt: new Date(),
};

const CATALOG_CONFIG = {
  id: 'sync-tts', dealershipId: DEALER_ID, platformSlug: 'tiktok-shop',
  catalogId: SHOP_ID, metadataJson: null, lastSyncAt: null, lastSyncCount: null,
  createdAt: new Date(), updatedAt: new Date(),
};

function makeSession() {
  return {
    id: 'sess-tts', tokenHash: 'x', operatorAccountId: 'op-tts',
    createdAt: new Date(), expiresAt: SESSION_EXPIRY, revokedAt: null,
    ipAddress: null, userAgent: null,
    account: {
      id: 'op-tts', email: 'admin@test.local', role: 'SUPER_ADMIN' as const,
      isActive: true, passwordHash: 'x', lastLoginAt: null,
      createdAt: new Date(), updatedAt: new Date(),
      dealerAccess: [{ dealershipId: DEALER_ID }],
    },
  };
}

function makePrisma(opts: { tokenRow?: unknown; catalogConfig?: unknown } = {}): PrismaClient {
  const token = 'tokenRow' in opts ? opts.tokenRow : LIVE_TOKEN;
  const config = 'catalogConfig' in opts ? opts.catalogConfig : CATALOG_CONFIG;
  return {
    operatorSession: { findUnique: async () => makeSession() },
    dealershipProfile: { findUnique: async () => ({ id: DEALER_ID, legalName: 'T', businessCategory: 'AUTOMOTIVE' }) },
    platformOAuthToken: { findUnique: async () => token, upsert: async () => token },
    platformCatalogSync: { upsert: async () => config, findUnique: async () => config, update: async () => config, delete: async () => config },
    vehicle: { findMany: async () => [] },
  } as unknown as PrismaClient;
}

// ── TikTokShopClient ──────────────────────────────────────────────────────────

describe('TikTokShopClient.createProduct', () => {
  it('POSTs to /product/202309/products with x-tts-access-token header', async () => {
    let capturedReq: { url: string; headers: Record<string, string>; body: Record<string, unknown> } | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      capturedReq = {
        url: String(url),
        headers: init.headers as Record<string, string>,
        body: JSON.parse(String(init.body ?? '{}')),
      };
      return { ok: true, status: 200, json: async () => ({ code: 0, message: 'Success', data: { product_id: 'tts-prod-123' } }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const res = await TikTokShopClient.createProduct('tts-token', SHOP_ID, {
        title: '2024 Toyota Camry', description: 'Used sedan', category_id: '600133',
        images: [{ uri: 'https://cdn.example.com/camry1.jpg' }],
        skus: [{ seller_sku: 'TOY-TTS-001', price: { amount: '32999.00', currency: 'USD' }, inventory: [{ quantity: 1 }] }],
      });
      assert.ok(capturedReq !== null);
      const req = capturedReq as { url: string; headers: Record<string, string>; body: Record<string, unknown> };
      assert.ok(req.url.includes('/product/202309/products'));
      assert.equal(req.headers['x-tts-access-token'], 'tts-token');
      assert.equal(res.data.product_id, 'tts-prod-123');
    } finally { globalThis.fetch = orig; }
  });

  it('throws on non-zero code', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({ code: 40001, message: 'Product not found' }),
    })) as unknown as typeof globalThis.fetch;
    try {
      await assert.rejects(
        () => TikTokShopClient.createProduct('tok', SHOP_ID, {
          title: 'x', description: 'x', category_id: '600133',
          images: [], skus: [],
        }),
        /TikTok Shop API 40001/,
      );
    } finally { globalThis.fetch = orig; }
  });
});

describe('TikTokShopClient.searchProductsBySku', () => {
  it('POSTs seller_skus and returns product list', async () => {
    let capturedBody: Record<string, unknown> | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(String(init.body ?? '{}'));
      return {
        ok: true, status: 200,
        json: async () => ({
          code: 0, message: 'Success',
          data: { products: [{ id: 'tts-prod-123', title: '2024 Toyota Camry' }], total_count: 1 },
        }),
      };
    }) as unknown as typeof globalThis.fetch;
    try {
      const res = await TikTokShopClient.searchProductsBySku('tts-token', ['TOY-TTS-001']);
      assert.ok(capturedBody !== null);
      const body = capturedBody as { seller_skus: string[] };
      assert.deepEqual(body.seller_skus, ['TOY-TTS-001']);
      assert.equal(res.data.products[0]?.id, 'tts-prod-123');
    } finally { globalThis.fetch = orig; }
  });
});

describe('TikTokShopClient.deleteProduct', () => {
  it('sends DELETE to /product/202309/products/{productId}', async () => {
    let capturedUrl: string | null = null;
    let capturedMethod: string | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      capturedUrl = String(url);
      capturedMethod = init.method ?? 'GET';
      return { ok: true, status: 200, json: async () => ({ code: 0, message: 'Success', data: {} }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      await TikTokShopClient.deleteProduct('tts-token', 'tts-prod-123');
      assert.ok(capturedUrl !== null);
      const url = capturedUrl as unknown as string;
      assert.ok(url.includes('/product/202309/products/tts-prod-123'));
      assert.equal(capturedMethod, 'DELETE');
    } finally { globalThis.fetch = orig; }
  });
});

// ── TikTokShopBridge.buildItem ────────────────────────────────────────────────

describe('TikTokShopBridge.buildItem', () => {
  const bridge = new TikTokShopBridge();
  const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };

  it('maps used vehicle to TikTok Shop product fields', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.equal(item.id, 'TOY-TTS-001');
    const p = item.fields as {
      title: string;
      category_id: string;
      images: Array<{ uri: string }>;
      skus: Array<{
        seller_sku: string;
        price: { amount: string; currency: string };
        inventory: Array<{ quantity: number }>;
        sales_attributes: Array<{ name: string; value: string }>;
      }>;
    };
    assert.ok(p.title.includes('Toyota'));
    assert.equal(p.category_id, '600133');
    assert.equal(p.images.length, 2);
    assert.equal(p.skus[0]?.seller_sku, 'TOY-TTS-001');
    assert.equal(p.skus[0]?.price.amount, '32999.00');
    assert.equal(p.skus[0]?.price.currency, 'USD');
    assert.equal(p.skus[0]?.inventory[0]?.quantity, 1);
    const attrs = p.skus[0]?.sales_attributes ?? [];
    assert.ok(attrs.some(a => a.name === 'Make' && a.value === 'Toyota'));
    assert.ok(attrs.some(a => a.name === 'Model' && a.value === 'Camry'));
    assert.ok(attrs.some(a => a.name === 'Year' && a.value === '2024'));
    assert.ok(attrs.some(a => a.name === 'Trim' && a.value === 'XSE'));
  });

  it('caps images at 9', () => {
    const manyMedia = Array.from({ length: 12 }, (_, i) => ({
      url: `https://cdn.example.com/img${i}.jpg`, sortOrder: i,
    }));
    const v: VehicleInput = { ...VEHICLE, media: manyMedia };
    const item = bridge.buildItem(ContentPackageBuilder.fromVehicle(v, ctx), ctx);
    const p = item.fields as { images: Array<{ uri: string }> };
    assert.equal(p.images.length, 9);
  });

  it('maps certified to Certified Pre-Owned in description', () => {
    const cpo: VehicleInput = { ...VEHICLE, condition: 'certified' };
    const item = bridge.buildItem(ContentPackageBuilder.fromVehicle(cpo, ctx), ctx);
    const p = item.fields as { description: string };
    assert.ok(p.description.includes('Certified Pre-Owned'));
  });

  it('maps new to New in description', () => {
    const nw: VehicleInput = { ...VEHICLE, condition: 'new', mileage: 0 };
    const item = bridge.buildItem(ContentPackageBuilder.fromVehicle(nw, ctx), ctx);
    const p = item.fields as { description: string };
    assert.ok(p.description.includes('Condition: New'));
  });

  it('includes VIN in description when present', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE, ctx);
    const item = bridge.buildItem(pkg, ctx);
    const p = item.fields as { description: string };
    assert.ok(p.description.includes('VIN: 5YJSA1CN5DFP12345'));
  });
});

// ── TikTokShopBridge.upsertItems partial failure ──────────────────────────────

describe('TikTokShopBridge.upsertItems partial failure', () => {
  it('counts failed items as rejected, allows partial success', async () => {
    let callCount = 0;
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => {
      callCount++;
      if (callCount === 1) {
        return { ok: true, status: 200, json: async () => ({ code: 40001, message: 'Category not found' }) };
      }
      return { ok: true, status: 200, json: async () => ({ code: 0, message: 'Success', data: { product_id: 'tts-prod-ok' } }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const bridge = new TikTokShopBridge();
      const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };
      const items = [
        VEHICLE,
        { ...VEHICLE, stockNumber: 'TOY-TTS-002', id: 'veh-tts-002' },
      ].map(v => bridge.buildItem(ContentPackageBuilder.fromVehicle(v, ctx), ctx));
      const result = await bridge.upsertItems('tts-token', SHOP_ID, items);
      assert.equal(callCount, 2);
      assert.equal(result.accepted, 1);
      assert.equal(result.rejected, 1);
      assert.equal(result.rejectedItems?.length, 1);
    } finally { globalThis.fetch = orig; }
  });
});

// ── TikTokShopBridge.deleteItem search-before-delete ─────────────────────────

describe('TikTokShopBridge.deleteItem', () => {
  it('searches by seller_sku then deletes by product_id', async () => {
    const calls: Array<{ url: string; method: string }> = [];
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      const method = init.method ?? 'GET';
      calls.push({ url: String(url), method });
      if (String(url).includes('/products/search')) {
        return { ok: true, status: 200, json: async () => ({ code: 0, message: 'Success', data: { products: [{ id: 'tts-prod-123', title: 'x' }], total_count: 1 } }) };
      }
      return { ok: true, status: 200, json: async () => ({ code: 0, message: 'Success', data: {} }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const bridge = new TikTokShopBridge();
      await bridge.deleteItem('tts-token', SHOP_ID, 'TOY-TTS-001');
      assert.equal(calls.length, 2);
      assert.ok(calls[0]?.url.includes('/products/search'));
      assert.ok(calls[1]?.url.includes('/products/tts-prod-123'));
      assert.equal(calls[1]?.method, 'DELETE');
    } finally { globalThis.fetch = orig; }
  });

  it('no-ops when product not found in search', async () => {
    let deleteCalled = false;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      if (String(url).includes('/products/search')) {
        return { ok: true, status: 200, json: async () => ({ code: 0, message: 'Success', data: { products: [], total_count: 0 } }) };
      }
      deleteCalled = true;
      return { ok: true, status: 200, json: async () => ({ code: 0, message: 'Success', data: {} }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const bridge = new TikTokShopBridge();
      await bridge.deleteItem('tts-token', SHOP_ID, 'NONEXISTENT-SKU');
      assert.equal(deleteCalled, false);
    } finally { globalThis.fetch = orig; }
  });
});

// ── HTTP routes ───────────────────────────────────────────────────────────────

describe('PUT /tiktok-shop/catalog-config', () => {
  it('returns 200 with stored config', async () => {
    const app = buildApp(makePrisma());
    const res = await app.inject({
      method: 'PUT',
      url: `/api/dealers/${DEALER_ID}/platforms/tiktok-shop/catalog-config`,
      headers: { cookie: 'op_session=mock' },
      payload: { catalogId: SHOP_ID },
    });
    assert.equal(res.statusCode, 200);
  });
});

describe('POST /tiktok-shop/catalog-sync', () => {
  it('returns 402 with no token', async () => {
    const app = buildApp(makePrisma({ tokenRow: null }));
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/tiktok-shop/catalog-sync`,
      headers: { cookie: 'op_session=mock' },
    });
    assert.equal(res.statusCode, 402);
  });

  it('returns 200 with zero vehicles', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({ code: 0, message: 'Success', data: { product_id: 'tts-new' } }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma());
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/tiktok-shop/catalog-sync`,
        headers: { cookie: 'op_session=mock' },
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body) as { synced: number; rejected: number };
      assert.equal(body.synced, 0);
      assert.equal(body.rejected, 0);
    } finally { globalThis.fetch = orig; }
  });
});

describe('DELETE /tiktok-shop/catalog-sync/items/:itemId', () => {
  it('returns 204 on success', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      if (String(url).includes('/products/search')) {
        return { ok: true, status: 200, json: async () => ({ code: 0, message: 'Success', data: { products: [{ id: 'tts-prod-123', title: 'x' }], total_count: 1 } }) };
      }
      return { ok: true, status: 200, json: async () => ({ code: 0, message: 'Success', data: {} }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma());
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/dealers/${DEALER_ID}/platforms/tiktok-shop/catalog-sync/items/TOY-TTS-001`,
        headers: { cookie: 'op_session=mock' },
      });
      assert.equal(res.statusCode, 204);
    } finally { globalThis.fetch = orig; }
  });
});
