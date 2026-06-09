import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { MicrosoftMerchantClient } from '../services/catalog/MicrosoftMerchantClient.js';
import { MicrosoftAutomotiveBridge } from '../services/catalog/bridges/MicrosoftAutomotiveBridge.js';
import { ContentPackageBuilder, type VehicleInput } from '../services/distribution/ContentPackageBuilder.js';

const DEALER_ID = 'dealer-ms-test';
const STORE_ID = '12345678';
const SESSION_EXPIRY = new Date(Date.now() + 3600_000);

const VEHICLE: VehicleInput = {
  id: 'veh-ms-001', vin: '1N4AL3AP8JC123456',
  year: 2022, make: 'Nissan', model: 'Altima', trim: 'SV',
  priceCents: 2499900, condition: 'used', mileage: 18500,
  exteriorColor: 'Pearl White', stockNumber: 'NSN-MS-001',
  media: [
    { url: 'https://cdn.example.com/altima-1.jpg', sortOrder: 0 },
    { url: 'https://cdn.example.com/altima-2.jpg', sortOrder: 1 },
  ],
};

const LIVE_TOKEN = {
  id: 'tok-ms', dealershipId: DEALER_ID, provider: 'microsoft', accessToken: 'ms-token',
  refreshToken: null, tokenType: 'Bearer', scope: null,
  expiresAt: new Date(Date.now() + 3600_000),
  rawPayload: {}, createdAt: new Date(), updatedAt: new Date(),
};

const CATALOG_CONFIG = {
  id: 'sync-ms', dealershipId: DEALER_ID, platformSlug: 'microsoft-automotive-ads',
  catalogId: STORE_ID, metadataJson: null, lastSyncAt: null, lastSyncCount: null,
  createdAt: new Date(), updatedAt: new Date(),
};

function makeSession() {
  return {
    id: 'sess-ms', tokenHash: 'x', operatorAccountId: 'op-ms',
    createdAt: new Date(), expiresAt: SESSION_EXPIRY, revokedAt: null,
    ipAddress: null, userAgent: null,
    account: {
      id: 'op-ms', email: 'admin@test.local', role: 'SUPER_ADMIN' as const,
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

// ── MicrosoftMerchantClient ───────────────────────────────────────────────────

describe('MicrosoftMerchantClient.batchProducts', () => {
  it('POSTs with AuthenticationToken header', async () => {
    let capturedReq: { url: string; headers: Record<string, string>; body: Record<string, unknown> } | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      capturedReq = { url: String(url), headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body ?? '{}')) };
      return { ok: true, status: 200, json: async () => ({ kind: 'content#productsCustomBatchResponse', entries: [] }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const res = await MicrosoftMerchantClient.batchProducts('ms-token', [
        { batchId: 1, merchantId: STORE_ID, method: 'insert', product: {
          offerId: 'NSN-MS-001', title: '2022 Nissan Altima', description: 'd', link: 'https://test',
          imageLink: 'https://img', contentLanguage: 'en', targetCountry: 'US', channel: 'online',
          availability: 'in stock', condition: 'used', price: { value: '24999.00', currency: 'USD' },
          brand: 'Nissan', identifierExists: false,
        } },
      ]);
      assert.ok(capturedReq !== null);
      const req = capturedReq as { url: string; headers: Record<string, string>; body: Record<string, unknown> };
      assert.ok(req.url.includes('/products/batch'));
      assert.equal(req.headers['AuthenticationToken'], 'ms-token');
      assert.ok(Array.isArray(res.entries));
    } finally { globalThis.fetch = orig; }
  });

  it('throws on API error response', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false, status: 401,
      json: async () => ({ error: { code: 401, message: 'Invalid credentials' } }),
    })) as unknown as typeof globalThis.fetch;
    try {
      await assert.rejects(() => MicrosoftMerchantClient.batchProducts('bad', []), /Microsoft Merchant API 401/);
    } finally { globalThis.fetch = orig; }
  });
});

describe('MicrosoftMerchantClient.deleteProduct', () => {
  it('sends DELETE with encoded productId', async () => {
    let capturedUrl: string | null = null;
    let capturedMethod: string | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      capturedUrl = String(url);
      capturedMethod = init.method ?? 'GET';
      return { status: 204 };
    }) as unknown as typeof globalThis.fetch;
    try {
      await MicrosoftMerchantClient.deleteProduct('ms-token', STORE_ID, 'online:en:US:NSN-MS-001');
      assert.ok(capturedUrl !== null);
      const url = capturedUrl as string;
      assert.ok(url.includes(STORE_ID));
      assert.ok(url.includes(encodeURIComponent('online:en:US:NSN-MS-001')));
      assert.equal(capturedMethod, 'DELETE');
    } finally { globalThis.fetch = orig; }
  });
});

// ── MicrosoftAutomotiveBridge.buildItem ───────────────────────────────────────

describe('MicrosoftAutomotiveBridge.buildItem', () => {
  const bridge = new MicrosoftAutomotiveBridge();
  const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };

  it('maps used vehicle to correct fields', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.equal(item.id, 'NSN-MS-001');
    const p = item.fields as {
      offerId: string; condition: string; channel: string; availability: string;
      contentLanguage: string; targetCountry: string; identifierExists: boolean;
      price: { value: string; currency: string }; brand: string;
      imageLink: string; additionalImageLinks: string[];
    };
    assert.equal(p.offerId, 'NSN-MS-001');
    assert.equal(p.condition, 'used');
    assert.equal(p.channel, 'online');
    assert.equal(p.availability, 'in stock');
    assert.equal(p.contentLanguage, 'en');
    assert.equal(p.targetCountry, 'US');
    assert.equal(p.identifierExists, false);
    assert.equal(p.price.value, '24999.00');
    assert.equal(p.price.currency, 'USD');
    assert.equal(p.brand, 'Nissan');
    assert.equal(p.imageLink, 'https://cdn.example.com/altima-1.jpg');
    assert.deepEqual(p.additionalImageLinks, ['https://cdn.example.com/altima-2.jpg']);
  });

  it('maps certified to refurbished', () => {
    const cpo: VehicleInput = { ...VEHICLE, condition: 'certified' };
    const item = bridge.buildItem(ContentPackageBuilder.fromVehicle(cpo, ctx), ctx);
    assert.equal((item.fields as { condition: string }).condition, 'refurbished');
  });

  it('maps new to new', () => {
    const nw: VehicleInput = { ...VEHICLE, condition: 'new', mileage: 0 };
    const item = bridge.buildItem(ContentPackageBuilder.fromVehicle(nw, ctx), ctx);
    assert.equal((item.fields as { condition: string }).condition, 'new');
  });

  it('includes vin, trim, color in customAttributes', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE, ctx);
    const item = bridge.buildItem(pkg, ctx);
    const attrs = (item.fields as { customAttributes: Array<{ name: string; value: string }> }).customAttributes;
    assert.ok(attrs.some(a => a.name === 'vin' && a.value === '1N4AL3AP8JC123456'));
    assert.ok(attrs.some(a => a.name === 'trim' && a.value === 'SV'));
    assert.ok(attrs.some(a => a.name === 'color' && a.value === 'Pearl White'));
    assert.ok(attrs.some(a => a.name === 'make' && a.value === 'Nissan'));
    assert.ok(attrs.some(a => a.name === 'year' && a.value === '2022'));
  });

  it('omits vin and trim when null', () => {
    const bare: VehicleInput = { ...VEHICLE, vin: null, trim: null };
    const item = bridge.buildItem(ContentPackageBuilder.fromVehicle(bare, ctx), ctx);
    const attrs = (item.fields as { customAttributes: Array<{ name: string }> }).customAttributes;
    assert.ok(!attrs.some(a => a.name === 'vin'));
    assert.ok(!attrs.some(a => a.name === 'trim'));
  });

  it('deleteItem uses online:en:US: productId format', async () => {
    let capturedUrl: string | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string) => { capturedUrl = String(url); return { status: 204 }; }) as unknown as typeof globalThis.fetch;
    try {
      await bridge.deleteItem('ms-token', STORE_ID, 'NSN-MS-001');
      const url = capturedUrl as unknown as string;
      assert.ok(url.includes(encodeURIComponent('online:en:US:NSN-MS-001')));
    } finally { globalThis.fetch = orig; }
  });
});

describe('MicrosoftAutomotiveBridge.upsertItems rejected items', () => {
  it('counts entries with errors as rejected', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({
        kind: 'content#productsCustomBatchResponse',
        entries: [
          { batchId: 1, errors: { errors: [{ message: 'Bad GTIN', reason: 'invalid' }] } },
          { batchId: 2, product: {} },
        ],
      }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const bridge = new MicrosoftAutomotiveBridge();
      const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };
      const items = [VEHICLE, { ...VEHICLE, stockNumber: 'NSN-MS-002', id: 'veh-002' }].map(v =>
        bridge.buildItem(ContentPackageBuilder.fromVehicle(v, ctx), ctx),
      );
      const result = await bridge.upsertItems('ms-token', STORE_ID, items);
      assert.equal(result.accepted, 1);
      assert.equal(result.rejected, 1);
      assert.equal(result.rejectedItems?.length, 1);
    } finally { globalThis.fetch = orig; }
  });
});

// ── HTTP routes ───────────────────────────────────────────────────────────────

describe('PUT /microsoft-automotive-ads/catalog-config', () => {
  it('returns 200 with stored config', async () => {
    const app = buildApp(makePrisma());
    const res = await app.inject({
      method: 'PUT',
      url: `/api/dealers/${DEALER_ID}/platforms/microsoft-automotive-ads/catalog-config`,
      headers: { cookie: 'op_session=mock' },
      payload: { catalogId: STORE_ID },
    });
    assert.equal(res.statusCode, 200);
  });
});

describe('POST /microsoft-automotive-ads/catalog-sync', () => {
  it('returns 402 with no token', async () => {
    const app = buildApp(makePrisma({ tokenRow: null }));
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/microsoft-automotive-ads/catalog-sync`,
      headers: { cookie: 'op_session=mock' },
    });
    assert.equal(res.statusCode, 402);
  });

  it('returns 200 with zero vehicles', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({ kind: 'content#productsCustomBatchResponse', entries: [] }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma());
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/microsoft-automotive-ads/catalog-sync`,
        headers: { cookie: 'op_session=mock' },
      });
      assert.equal(res.statusCode, 200);
    } finally { globalThis.fetch = orig; }
  });
});

describe('DELETE /microsoft-automotive-ads/catalog-sync/items/:itemId', () => {
  it('returns 204 on successful deletion', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({ status: 204 })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma());
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/dealers/${DEALER_ID}/platforms/microsoft-automotive-ads/catalog-sync/items/NSN-MS-001`,
        headers: { cookie: 'op_session=mock' },
      });
      assert.equal(res.statusCode, 204);
    } finally { globalThis.fetch = orig; }
  });
});
