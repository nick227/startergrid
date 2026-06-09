import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { GoogleMerchantClient } from '../services/catalog/GoogleMerchantClient.js';
import { GoogleVehicleAdsBridge } from '../services/catalog/bridges/GoogleVehicleAdsBridge.js';
import { ContentPackageBuilder, type VehicleInput } from '../services/distribution/ContentPackageBuilder.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DEALER_ID = 'dealer-gva-test';
const MERCHANT_ID = '9876543210';
const SESSION_EXPIRY = new Date(Date.now() + 60 * 60 * 1000);

const VEHICLE_INPUT: VehicleInput = {
  id: 'veh-gva-001',
  vin: '1FTFW1ET5EFA67890',
  year: 2021,
  make: 'Ford',
  model: 'F-150',
  trim: 'XLT',
  priceCents: 4199900,
  condition: 'used',
  mileage: 31000,
  exteriorColor: 'Oxford White',
  stockNumber: 'FRD-GVA-001',
  media: [
    { url: 'https://cdn.example.com/f150-1.jpg', sortOrder: 0 },
    { url: 'https://cdn.example.com/f150-2.jpg', sortOrder: 1 },
  ],
};

const LIVE_TOKEN = {
  id: 'tok-gva',
  dealershipId: DEALER_ID,
  provider: 'google',
  accessToken: 'google-access-token',
  refreshToken: 'google-refresh-token',
  tokenType: 'Bearer',
  scope: 'https://www.googleapis.com/auth/content',
  expiresAt: new Date(Date.now() + 3600_000),
  rawPayload: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const CATALOG_CONFIG = {
  id: 'sync-gva',
  dealershipId: DEALER_ID,
  platformSlug: 'google-vehicle-ads',
  catalogId: MERCHANT_ID,
  metadataJson: null,
  lastSyncAt: null,
  lastSyncCount: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeSession(dealershipId = DEALER_ID) {
  return {
    id: 'sess-gva',
    tokenHash: 'irrelevant',
    operatorAccountId: 'op-gva',
    createdAt: new Date(),
    expiresAt: SESSION_EXPIRY,
    revokedAt: null,
    ipAddress: null,
    userAgent: null,
    account: {
      id: 'op-gva',
      email: 'admin@test.local',
      role: 'SUPER_ADMIN' as const,
      isActive: true,
      passwordHash: 'x',
      lastLoginAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      dealerAccess: [{ dealershipId }],
    },
  };
}

function authCookie() {
  return { cookie: 'op_session=mock-session-token' };
}

function makeVehicleRow() {
  return {
    id: 'veh-gva-001',
    dealershipId: DEALER_ID,
    vin: '1FTFW1ET5EFA67890',
    stockNumber: 'FRD-GVA-001',
    year: 2021,
    make: 'Ford',
    model: 'F-150',
    trim: 'XLT',
    mileage: 31000,
    priceCents: 4199900,
    condition: 'used',
    exteriorColor: 'Oxford White',
    interiorColor: null,
    bodyStyle: null,
    drivetrain: null,
    fuelType: null,
    transmission: null,
    options: [],
    starCore: {},
    categoryPayload: null,
    soldAt: null,
    removedAt: null,
    reactivatedAt: null,
    originalPriceCents: null,
    priceLastChangedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    media: [
      { url: 'https://cdn.example.com/f150-1.jpg', sortOrder: 0 },
      { url: 'https://cdn.example.com/f150-2.jpg', sortOrder: 1 },
    ],
  };
}

type PrismaStubOpts = {
  sessionExists?: boolean;
  tokenRow?: Record<string, unknown> | null;
  catalogConfig?: Record<string, unknown> | null;
  upsertedConfig?: Record<string, unknown>;
  vehicles?: Record<string, unknown>[];
};

function makePrisma(opts: PrismaStubOpts = {}): PrismaClient {
  const session = opts.sessionExists !== false ? makeSession() : null;
  const token = 'tokenRow' in opts ? opts.tokenRow : LIVE_TOKEN;
  const config = 'catalogConfig' in opts ? opts.catalogConfig : CATALOG_CONFIG;
  const upserted = opts.upsertedConfig ?? CATALOG_CONFIG;
  const vehicles = opts.vehicles ?? [makeVehicleRow()];

  return {
    operatorSession: { findUnique: async () => session },
    dealershipProfile: { findUnique: async () => ({ id: DEALER_ID, legalName: 'Test', businessCategory: 'AUTOMOTIVE' }) },
    platformOAuthToken: {
      findUnique: async () => token,
      upsert: async () => token,
    },
    platformCatalogSync: {
      upsert: async () => upserted,
      findUnique: async () => config,
      update: async () => upserted,
      delete: async () => upserted,
    },
    vehicle: {
      findMany: async () => vehicles,
    },
  } as unknown as PrismaClient;
}

// ── GoogleMerchantClient unit tests ───────────────────────────────────────────

describe('GoogleMerchantClient.batchProducts', () => {
  it('POSTs to /products/batch with Authorization header', async () => {
    let capturedReq: { url: string; headers: Record<string, string>; body: Record<string, unknown> } | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      capturedReq = {
        url: String(url),
        headers: init.headers as Record<string, string>,
        body: JSON.parse(String(init.body ?? '{}')),
      };
      return { ok: true, status: 200, json: async () => ({ kind: 'content#productsCustomBatchResponse', entries: [] }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const res = await GoogleMerchantClient.batchProducts('tok', [
        {
          batchId: 1,
          merchantId: MERCHANT_ID,
          method: 'insert',
          product: {
            offerId: 'FRD-GVA-001',
            title: '2021 Ford F-150 XLT',
            description: 'Great truck',
            link: 'https://dealer.test/v/FRD-GVA-001',
            imageLink: 'https://cdn.example.com/f150.jpg',
            contentLanguage: 'en',
            targetCountry: 'US',
            channel: 'online',
            availability: 'in stock',
            condition: 'used',
            price: { value: '41999.00', currency: 'USD' },
            brand: 'Ford',
            customAttributes: [{ name: 'make', value: 'Ford' }],
          },
        },
      ]);
      assert.ok(capturedReq !== null, 'fetch not called');
      const req = capturedReq as { url: string; headers: Record<string, string>; body: { entries: unknown[] } };
      assert.ok(req.url.includes('/products/batch'));
      assert.equal(req.headers['Authorization'], 'Bearer tok');
      assert.equal(req.body.entries.length, 1);
      assert.ok(Array.isArray(res.entries));
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe('GoogleMerchantClient.deleteProduct', () => {
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
      await GoogleMerchantClient.deleteProduct('tok', MERCHANT_ID, 'online:en:US:FRD-GVA-001');
      assert.ok(capturedUrl !== null, 'fetch not called');
      const url = capturedUrl as string;
      assert.ok(url.includes(MERCHANT_ID));
      assert.ok(url.includes(encodeURIComponent('online:en:US:FRD-GVA-001')));
      assert.equal(capturedMethod, 'DELETE');
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe('GoogleMerchantClient error handling', () => {
  it('throws on API error response', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false,
      status: 401,
      json: async () => ({ error: { code: 401, message: 'Request had invalid authentication credentials.' } }),
    })) as unknown as typeof globalThis.fetch;
    try {
      await assert.rejects(
        () => GoogleMerchantClient.batchProducts('bad-tok', []),
        /Google Merchant API 401/,
      );
    } finally {
      globalThis.fetch = orig;
    }
  });
});

// ── GoogleVehicleAdsBridge.buildItem tests ────────────────────────────────────

describe('GoogleVehicleAdsBridge.buildItem', () => {
  const bridge = new GoogleVehicleAdsBridge();
  const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };

  it('maps used vehicle to correct Google product fields', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, ctx);
    const item = bridge.buildItem(pkg, ctx);

    assert.equal(item.id, 'FRD-GVA-001');
    const p = item.fields as {
      offerId: string; title: string; condition: string; channel: string;
      contentLanguage: string; targetCountry: string; availability: string;
      price: { value: string; currency: string };
      brand: string; imageLink: string; additionalImageLinks: string[];
    };
    assert.equal(p.offerId, 'FRD-GVA-001');
    assert.ok(p.title.includes('2021'));
    assert.ok(p.title.includes('Ford'));
    assert.equal(p.condition, 'used');
    assert.equal(p.channel, 'online');
    assert.equal(p.contentLanguage, 'en');
    assert.equal(p.targetCountry, 'US');
    assert.equal(p.availability, 'in stock');
    assert.equal(p.price.value, '41999.00');
    assert.equal(p.price.currency, 'USD');
    assert.equal(p.brand, 'Ford');
    assert.equal(p.imageLink, 'https://cdn.example.com/f150-1.jpg');
    assert.deepEqual(p.additionalImageLinks, ['https://cdn.example.com/f150-2.jpg']);
  });

  it('maps new vehicle to condition=new', () => {
    const newV: VehicleInput = { ...VEHICLE_INPUT, condition: 'new', mileage: 5 };
    const pkg = ContentPackageBuilder.fromVehicle(newV, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.equal((item.fields as { condition: string }).condition, 'new');
  });

  it('maps certified vehicle to condition=refurbished', () => {
    const cpo: VehicleInput = { ...VEHICLE_INPUT, condition: 'certified' };
    const pkg = ContentPackageBuilder.fromVehicle(cpo, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.equal((item.fields as { condition: string }).condition, 'refurbished');
  });

  it('includes vin, trim, color in customAttributes', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, ctx);
    const item = bridge.buildItem(pkg, ctx);
    const attrs = (item.fields as { customAttributes: Array<{ name: string; value: string }> }).customAttributes;
    assert.ok(attrs.some(a => a.name === 'vin' && a.value === '1FTFW1ET5EFA67890'));
    assert.ok(attrs.some(a => a.name === 'trim' && a.value === 'XLT'));
    assert.ok(attrs.some(a => a.name === 'color' && a.value === 'Oxford White'));
    assert.ok(attrs.some(a => a.name === 'year' && a.value === '2021'));
    assert.ok(attrs.some(a => a.name === 'mileage' && a.value === '31000'));
  });

  it('omits vin and trim when absent', () => {
    const bare: VehicleInput = { ...VEHICLE_INPUT, vin: null, trim: null };
    const pkg = ContentPackageBuilder.fromVehicle(bare, ctx);
    const item = bridge.buildItem(pkg, ctx);
    const attrs = (item.fields as { customAttributes: Array<{ name: string }> }).customAttributes;
    assert.ok(!attrs.some(a => a.name === 'vin'));
    assert.ok(!attrs.some(a => a.name === 'trim'));
  });

  it('uses productId format online:en:US:{stockNumber} on deleteItem', async () => {
    let capturedUrl: string | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      capturedUrl = String(url);
      return { status: 204 };
    }) as unknown as typeof globalThis.fetch;
    try {
      await bridge.deleteItem('tok', MERCHANT_ID, 'FRD-GVA-001');
      assert.ok(capturedUrl!.includes(encodeURIComponent('online:en:US:FRD-GVA-001')));
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe('GoogleVehicleAdsBridge.upsertItems rejected items', () => {
  it('counts batch entries with errors as rejected', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({
        kind: 'content#productsCustomBatchResponse',
        entries: [
          { batchId: 1, errors: { errors: [{ message: 'Invalid value', reason: 'invalid' }] } },
          { batchId: 2, product: {} },
        ],
      }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const bridge = new GoogleVehicleAdsBridge();
      const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };
      const items = [VEHICLE_INPUT, { ...VEHICLE_INPUT, stockNumber: 'FRD-GVA-002', id: 'veh-002' }].map(v =>
        bridge.buildItem(ContentPackageBuilder.fromVehicle(v, ctx), ctx),
      );
      const result = await bridge.upsertItems('tok', MERCHANT_ID, items);
      assert.equal(result.accepted, 1);
      assert.equal(result.rejected, 1);
      assert.equal(result.rejectedItems?.length, 1);
    } finally {
      globalThis.fetch = orig;
    }
  });
});

// ── HTTP route tests (google-vehicle-ads platform) ────────────────────────────

describe('PUT /api/dealers/:id/platforms/google-vehicle-ads/catalog-config', () => {
  it('returns 200 with stored config', async () => {
    const app = buildApp(makePrisma());
    const res = await app.inject({
      method: 'PUT',
      url: `/api/dealers/${DEALER_ID}/platforms/google-vehicle-ads/catalog-config`,
      headers: authCookie(),
      payload: { catalogId: MERCHANT_ID },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { config: { catalogId: string } };
    assert.equal(body.config.catalogId, MERCHANT_ID);
  });
});

describe('POST /api/dealers/:id/platforms/google-vehicle-ads/catalog-sync', () => {
  it('returns 402 when no Google OAuth token', async () => {
    const app = buildApp(makePrisma({ tokenRow: null }));
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/google-vehicle-ads/catalog-sync`,
      headers: authCookie(),
    });
    assert.equal(res.statusCode, 402);
  });

  it('returns 502 on Google API error', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false, status: 401,
      json: async () => ({ error: { code: 401, message: 'Invalid credentials' } }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma());
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/google-vehicle-ads/catalog-sync`,
        headers: authCookie(),
      });
      assert.equal(res.statusCode, 502);
    } finally {
      globalThis.fetch = orig;
    }
  });

  it('returns 200 with synced count on success', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({
        kind: 'content#productsCustomBatchResponse',
        entries: [{ batchId: 1, product: {} }],
      }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma({ vehicles: [makeVehicleRow()] }));
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/google-vehicle-ads/catalog-sync`,
        headers: authCookie(),
      });
      assert.equal(res.statusCode, 200);
      const body = res.json() as { synced: number; rejected: number };
      assert.equal(body.synced, 1);
      assert.equal(body.rejected, 0);
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe('DELETE /api/dealers/:id/platforms/google-vehicle-ads/catalog-sync/items/:itemId', () => {
  it('returns 204 on successful item deletion', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({ status: 204 })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma());
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/dealers/${DEALER_ID}/platforms/google-vehicle-ads/catalog-sync/items/FRD-GVA-001`,
        headers: authCookie(),
      });
      assert.equal(res.statusCode, 204);
    } finally {
      globalThis.fetch = orig;
    }
  });
});
