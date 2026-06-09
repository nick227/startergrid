import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { MetaCatalogClient } from '../services/catalog/MetaCatalogClient.js';
import { MetaCatalogBridge } from '../services/catalog/bridges/MetaCatalogBridge.js';
import { CatalogSyncStore } from '../services/catalog/CatalogSyncStore.js';
import { ContentPackageBuilder, type VehicleInput } from '../services/distribution/ContentPackageBuilder.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DEALER_ID = 'dealer-cs-test';
const CATALOG_ID = 'cat-meta-001';
const SESSION_EXPIRY = new Date(Date.now() + 60 * 60 * 1000);

const VEHICLE_INPUT: VehicleInput = {
  id: 'veh-cs-001',
  vin: '1HGBH41JXMN109186',
  year: 2022,
  make: 'Toyota',
  model: 'Camry',
  trim: 'XSE',
  priceCents: 2899900,
  condition: 'used',
  mileage: 18400,
  exteriorColor: 'Midnight Black',
  stockNumber: 'TOY-CS-001',
  media: [{ url: 'https://cdn.example.com/camry.jpg', sortOrder: 0 }],
};

const LIVE_TOKEN = {
  id: 'tok-cs',
  dealershipId: DEALER_ID,
  provider: 'meta-catalog-ads',
  accessToken: 'meta-access-token',
  refreshToken: null,
  tokenType: 'Bearer',
  scope: 'catalog_management',
  expiresAt: new Date(Date.now() + 3600_000),
  rawPayload: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const CATALOG_CONFIG = {
  id: 'sync-cs',
  dealershipId: DEALER_ID,
  platformSlug: 'meta-automotive-ads',
  catalogId: CATALOG_ID,
  metadataJson: null,
  lastSyncAt: null,
  lastSyncCount: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeSession(dealershipId = DEALER_ID) {
  return {
    id: 'sess-cs',
    tokenHash: 'irrelevant',
    operatorAccountId: 'op-cs',
    createdAt: new Date(),
    expiresAt: SESSION_EXPIRY,
    revokedAt: null,
    ipAddress: null,
    userAgent: null,
    account: {
      id: 'op-cs',
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

function makeVehicleRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'veh-cs-001',
    dealershipId: DEALER_ID,
    vin: '1HGBH41JXMN109186',
    stockNumber: 'TOY-CS-001',
    year: 2022,
    make: 'Toyota',
    model: 'Camry',
    trim: 'XSE',
    mileage: 18400,
    priceCents: 2899900,
    condition: 'used',
    exteriorColor: 'Midnight Black',
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
    media: [{ url: 'https://cdn.example.com/camry.jpg', sortOrder: 0 }],
    ...overrides,
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

// ── MetaCatalogClient unit tests ───────────────────────────────────────────────

describe('MetaCatalogClient.upsertItems', () => {
  it('POSTs to /{catalogId}/items_batch with VEHICLE item_type', async () => {
    let capturedReq: { url: string; body: Record<string, unknown> } | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      capturedReq = {
        url: String(url),
        body: JSON.parse(String(init.body ?? '{}')),
      };
      return { ok: true, status: 200, json: async () => ({ handles: ['h1'] }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const res = await MetaCatalogClient.upsertItems('tok', 'cat-001', [
        { method: 'UPDATE', item_id: 'SKU-1', data: {
          year: 2022, make: 'Toyota', model: 'Camry', description: 'test',
          price: '28999.00 USD',
          mileage: { value: 18400, unit: 'MI' },
          image: [{ url: 'https://cdn.example.com/img.jpg' }],
          url: 'https://dealer.com/v/SKU-1',
          availability: 'IN_STOCK',
          state_of_vehicle: 'USED',
          condition: 'GOOD',
        } },
      ]);
      assert.ok(capturedReq !== null, 'fetch not called');
      const req = capturedReq as { url: string; body: Record<string, unknown> };
      assert.ok(req.url.includes('/cat-001/items_batch'));
      assert.equal(req.body['item_type'], 'VEHICLE');
      assert.deepEqual(res.handles, ['h1']);
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe('MetaCatalogClient.deleteItem', () => {
  it('POSTs DELETE method request for the item', async () => {
    let capturedBody: Record<string, unknown> | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(String(init.body ?? '{}'));
      return { ok: true, status: 200, json: async () => ({ handles: ['h2'] }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      await MetaCatalogClient.deleteItem('tok', 'cat-001', 'SKU-99');
      assert.ok(capturedBody !== null);
      const body = capturedBody as { requests?: Array<{ method: string; item_id: string }> };
      assert.equal(body.requests?.[0]?.method, 'DELETE');
      assert.equal(body.requests?.[0]?.item_id, 'SKU-99');
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe('MetaCatalogClient.getCatalog', () => {
  it('throws on Meta API error response', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false,
      status: 403,
      json: async () => ({ error: { code: 190, message: 'Invalid OAuth access token' } }),
    })) as unknown as typeof globalThis.fetch;
    try {
      await assert.rejects(
        () => MetaCatalogClient.getCatalog('bad-token', 'cat-001'),
        /Meta API 190/,
      );
    } finally {
      globalThis.fetch = orig;
    }
  });
});

// ── MetaCatalogBridge.buildItem tests ─────────────────────────────────────────

describe('MetaCatalogBridge.buildItem', () => {
  const bridge = new MetaCatalogBridge();
  const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };

  it('maps used vehicle to correct Meta fields', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, ctx);
    const item = bridge.buildItem(pkg, ctx);

    assert.equal(item.id, 'TOY-CS-001');
    const d = item.fields as {
      year: number; make: string; model: string; trim: string;
      price: string; state_of_vehicle: string; condition: string;
      mileage: { value: number; unit: string };
      availability: string; vin: string; exterior_color: string;
    };
    assert.equal(d.year, 2022);
    assert.equal(d.make, 'Toyota');
    assert.equal(d.model, 'Camry');
    assert.equal(d.trim, 'XSE');
    assert.equal(d.price, '28999.00 USD');
    assert.equal(d.state_of_vehicle, 'USED');
    assert.equal(d.condition, 'GOOD');
    assert.equal(d.mileage.value, 18400);
    assert.equal(d.mileage.unit, 'MI');
    assert.equal(d.availability, 'IN_STOCK');
    assert.equal(d.vin, '1HGBH41JXMN109186');
    assert.equal(d.exterior_color, 'Midnight Black');
  });

  it('maps new vehicle to NEW state_of_vehicle + EXCELLENT condition', () => {
    const newVehicle: VehicleInput = { ...VEHICLE_INPUT, condition: 'new', mileage: 5, vin: null, trim: null };
    const pkg = ContentPackageBuilder.fromVehicle(newVehicle, ctx);
    const item = bridge.buildItem(pkg, ctx);
    const d = item.fields as { state_of_vehicle: string; condition: string };
    assert.equal(d.state_of_vehicle, 'NEW');
    assert.equal(d.condition, 'EXCELLENT');
  });

  it('maps certified vehicle to CPO state_of_vehicle', () => {
    const cpo: VehicleInput = { ...VEHICLE_INPUT, condition: 'certified' };
    const pkg = ContentPackageBuilder.fromVehicle(cpo, ctx);
    const item = bridge.buildItem(pkg, ctx);
    const d = item.fields as { state_of_vehicle: string; condition: string };
    assert.equal(d.state_of_vehicle, 'CPO');
    assert.equal(d.condition, 'EXCELLENT');
  });

  it('omits vin and trim when absent', () => {
    const bare: VehicleInput = { ...VEHICLE_INPUT, vin: null, trim: null };
    const pkg = ContentPackageBuilder.fromVehicle(bare, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.equal((item.fields as Record<string, unknown>)['vin'], undefined);
    assert.equal((item.fields as Record<string, unknown>)['trim'], undefined);
  });

  it('formats price correctly from cents', () => {
    const v: VehicleInput = { ...VEHICLE_INPUT, priceCents: 1000000 }; // $10,000.00
    const pkg = ContentPackageBuilder.fromVehicle(v, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.equal((item.fields as { price: string }).price, '10000.00 USD');
  });
});

// ── CatalogSyncStore unit tests ────────────────────────────────────────────────

describe('CatalogSyncStore.upsertConfig', () => {
  it('calls prisma.platformCatalogSync.upsert with composite key', async () => {
    let calledWith: Record<string, unknown> | null = null;
    const mockPrisma = {
      platformCatalogSync: {
        upsert: async (args: Record<string, unknown>) => { calledWith = args; return CATALOG_CONFIG; },
      },
    } as unknown as PrismaClient;
    await CatalogSyncStore.upsertConfig(mockPrisma, DEALER_ID, 'meta-automotive-ads', CATALOG_ID);
    assert.ok(calledWith !== null);
    const where = (calledWith as { where: { dealershipId_platformSlug: { dealershipId: string; platformSlug: string } } }).where;
    assert.equal(where.dealershipId_platformSlug.dealershipId, DEALER_ID);
    assert.equal(where.dealershipId_platformSlug.platformSlug, 'meta-automotive-ads');
  });
});

describe('CatalogSyncStore.getConfig', () => {
  it('returns null when no config exists', async () => {
    const mockPrisma = {
      platformCatalogSync: { findUnique: async () => null },
    } as unknown as PrismaClient;
    const result = await CatalogSyncStore.getConfig(mockPrisma, 'no-dealer', 'meta-automotive-ads');
    assert.equal(result, null);
  });
});

describe('CatalogSyncStore.markSynced', () => {
  it('updates lastSyncAt and lastSyncCount', async () => {
    let updateArgs: Record<string, unknown> | null = null;
    const mockPrisma = {
      platformCatalogSync: {
        update: async (args: Record<string, unknown>) => { updateArgs = args; return CATALOG_CONFIG; },
      },
    } as unknown as PrismaClient;
    await CatalogSyncStore.markSynced(mockPrisma, DEALER_ID, 'meta-automotive-ads', 42);
    assert.ok(updateArgs !== null);
    const data = (updateArgs as { data: { lastSyncCount: number } }).data;
    assert.equal(data.lastSyncCount, 42);
  });
});

// ── HTTP route tests ──────────────────────────────────────────────────────────

describe('PUT /api/dealers/:id/platforms/:slug/catalog-config', () => {
  it('returns 401 without auth', async () => {
    const app = buildApp(makePrisma({ sessionExists: false }));
    const res = await app.inject({
      method: 'PUT',
      url: `/api/dealers/${DEALER_ID}/platforms/meta-automotive-ads/catalog-config`,
      payload: { catalogId: CATALOG_ID },
    });
    assert.equal(res.statusCode, 401);
  });

  it('returns 400 for unsupported platform', async () => {
    const app = buildApp(makePrisma());
    const res = await app.inject({
      method: 'PUT',
      url: `/api/dealers/${DEALER_ID}/platforms/ebay-motors/catalog-config`,
      headers: authCookie(),
      payload: { catalogId: CATALOG_ID },
    });
    assert.equal(res.statusCode, 400);
  });

  it('returns 400 when catalogId missing', async () => {
    const app = buildApp(makePrisma());
    const res = await app.inject({
      method: 'PUT',
      url: `/api/dealers/${DEALER_ID}/platforms/meta-automotive-ads/catalog-config`,
      headers: authCookie(),
      payload: {},
    });
    assert.equal(res.statusCode, 400);
  });

  it('returns 200 with config on success', async () => {
    const app = buildApp(makePrisma());
    const res = await app.inject({
      method: 'PUT',
      url: `/api/dealers/${DEALER_ID}/platforms/meta-automotive-ads/catalog-config`,
      headers: authCookie(),
      payload: { catalogId: CATALOG_ID },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { config: { catalogId: string } };
    assert.equal(body.config.catalogId, CATALOG_ID);
  });
});

describe('GET /api/dealers/:id/platforms/:slug/catalog-config', () => {
  it('returns 404 when not configured', async () => {
    const app = buildApp(makePrisma({ catalogConfig: null }));
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/platforms/meta-automotive-ads/catalog-config`,
      headers: authCookie(),
    });
    assert.equal(res.statusCode, 404);
  });

  it('returns config when found', async () => {
    const app = buildApp(makePrisma());
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/platforms/meta-automotive-ads/catalog-config`,
      headers: authCookie(),
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { config: { catalogId: string } };
    assert.equal(body.config.catalogId, CATALOG_ID);
  });
});

describe('POST /api/dealers/:id/platforms/:slug/catalog-sync', () => {
  it('returns 401 without auth', async () => {
    const app = buildApp(makePrisma({ sessionExists: false }));
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/meta-automotive-ads/catalog-sync`,
    });
    assert.equal(res.statusCode, 401);
  });

  it('returns 400 when catalog not configured', async () => {
    const app = buildApp(makePrisma({ catalogConfig: null }));
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/meta-automotive-ads/catalog-sync`,
      headers: authCookie(),
    });
    assert.equal(res.statusCode, 400);
  });

  it('returns 402 when OAuth token missing', async () => {
    const app = buildApp(makePrisma({ tokenRow: null }));
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/meta-automotive-ads/catalog-sync`,
      headers: authCookie(),
    });
    assert.equal(res.statusCode, 402);
  });

  it('returns 502 when Meta API call fails', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false,
      status: 500,
      json: async () => ({ error: { code: 1, message: 'Unknown error' } }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma());
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/meta-automotive-ads/catalog-sync`,
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
      ok: true,
      status: 200,
      json: async () => ({ handles: ['h1', 'h2'] }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma({ vehicles: [makeVehicleRow()] }));
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/meta-automotive-ads/catalog-sync`,
        headers: authCookie(),
      });
      assert.equal(res.statusCode, 200);
      const body = res.json() as { synced: number };
      assert.equal(body.synced, 1);
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe('DELETE /api/dealers/:id/platforms/:slug/catalog-sync/items/:itemId', () => {
  it('returns 402 when OAuth token missing', async () => {
    const app = buildApp(makePrisma({ tokenRow: null }));
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/dealers/${DEALER_ID}/platforms/meta-automotive-ads/catalog-sync/items/TOY-CS-001`,
      headers: authCookie(),
    });
    assert.equal(res.statusCode, 402);
  });

  it('returns 204 on successful item deletion', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      json: async () => ({ handles: ['h3'] }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma());
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/dealers/${DEALER_ID}/platforms/meta-automotive-ads/catalog-sync/items/TOY-CS-001`,
        headers: authCookie(),
      });
      assert.equal(res.statusCode, 204);
    } finally {
      globalThis.fetch = orig;
    }
  });
});
