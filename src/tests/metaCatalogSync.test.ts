import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { MetaCatalogClient } from '../services/catalog/MetaCatalogClient.js';
import { MetaCatalogBridge } from '../services/catalog/bridges/MetaCatalogBridge.js';
import { ContentPackageBuilder, type VehicleInput } from '../services/distribution/ContentPackageBuilder.js';
import { CATALOG_SYNC_SLUGS } from '../lib/platformCapabilityManifest.js';
import { CATALOG_BRIDGE_SLUGS } from '../server/routes/catalogSync.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DEALER_ID = 'dealer-meta-test';
const CATALOG_ID = '123456789012345';
const SESSION_EXPIRY = new Date(Date.now() + 60 * 60 * 1000);

const VEHICLE_INPUT: VehicleInput = {
  id: 'veh-meta-001',
  vin: '1HGBH41JXMN109186',
  year: 2022,
  make: 'Honda',
  model: 'Accord',
  trim: 'Sport',
  priceCents: 2899900,
  condition: 'used',
  mileage: 18500,
  exteriorColor: 'Sonic Gray Pearl',
  stockNumber: 'HND-META-001',
  media: [
    { url: 'https://cdn.example.com/accord-1.jpg', sortOrder: 0 },
    { url: 'https://cdn.example.com/accord-2.jpg', sortOrder: 1 },
  ],
};

const LIVE_TOKEN = {
  id: 'tok-meta',
  dealershipId: DEALER_ID,
  provider: 'meta-catalog-ads',
  accessToken: 'meta-access-token',
  refreshToken: 'meta-refresh-token',
  tokenType: 'Bearer',
  scope: 'catalog_management',
  expiresAt: new Date(Date.now() + 3_600_000),
  rawPayload: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const CATALOG_CONFIG = {
  id: 'sync-meta',
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
    id: 'sess-meta',
    tokenHash: 'irrelevant',
    operatorAccountId: 'op-meta',
    createdAt: new Date(),
    expiresAt: SESSION_EXPIRY,
    revokedAt: null,
    ipAddress: null,
    userAgent: null,
    account: {
      id: 'op-meta',
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
    id: 'veh-meta-001',
    dealershipId: DEALER_ID,
    vin: '1HGBH41JXMN109186',
    stockNumber: 'HND-META-001',
    year: 2022,
    make: 'Honda',
    model: 'Accord',
    trim: 'Sport',
    mileage: 18500,
    priceCents: 2899900,
    condition: 'used',
    exteriorColor: 'Sonic Gray Pearl',
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
      { url: 'https://cdn.example.com/accord-1.jpg', sortOrder: 0 },
      { url: 'https://cdn.example.com/accord-2.jpg', sortOrder: 1 },
    ],
  };
}

type PrismaStubOpts = {
  tokenRow?: Record<string, unknown> | null;
  catalogConfig?: Record<string, unknown> | null;
  upsertedConfig?: Record<string, unknown>;
  vehicles?: Record<string, unknown>[];
};

function makePrisma(opts: PrismaStubOpts = {}): PrismaClient {
  const token = 'tokenRow' in opts ? opts.tokenRow : LIVE_TOKEN;
  const config = 'catalogConfig' in opts ? opts.catalogConfig : CATALOG_CONFIG;
  const upserted = opts.upsertedConfig ?? CATALOG_CONFIG;
  const vehicles = opts.vehicles ?? [makeVehicleRow()];

  return {
    operatorSession: { findUnique: async () => makeSession() },
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

// ── MetaCatalogClient unit tests ──────────────────────────────────────────────

describe('MetaCatalogClient.upsertItems', () => {
  it('POSTs to /{catalogId}/items_batch with access_token in body', async () => {
    let captured: { url: string; body: Record<string, unknown> } | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      captured = { url: String(url), body: JSON.parse(String(init.body ?? '{}')) };
      return { ok: true, status: 200, json: async () => ({ handles: ['h1'] }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const res = await MetaCatalogClient.upsertItems('tok-abc', CATALOG_ID, [
        { method: 'UPDATE', item_id: 'HND-META-001', data: { year: 2022 } as never },
      ]);
      assert.ok(captured !== null, 'fetch not called');
      const req = captured as { url: string; body: { item_type: string; requests: unknown[]; access_token: string } };
      assert.ok(req.url.includes(`/${CATALOG_ID}/items_batch`));
      assert.equal(req.body.access_token, 'tok-abc');
      assert.equal(req.body.item_type, 'VEHICLE');
      assert.equal(req.body.requests.length, 1);
      assert.deepEqual(res.handles, ['h1']);
    } finally {
      globalThis.fetch = orig;
    }
  });

  it('throws on Meta API error response', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({ error: { message: 'Invalid OAuth access token', code: 190 } }),
    })) as unknown as typeof globalThis.fetch;
    try {
      await assert.rejects(
        () => MetaCatalogClient.upsertItems('bad-tok', CATALOG_ID, []),
        /Meta API 190/,
      );
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe('MetaCatalogClient.deleteItem', () => {
  it('POSTs a DELETE batch request for the itemId', async () => {
    let captured: { body: { requests: Array<{ method: string; item_id: string }> } } | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      captured = { body: JSON.parse(String(init.body ?? '{}')) };
      return { ok: true, status: 200, json: async () => ({}) };
    }) as unknown as typeof globalThis.fetch;
    try {
      await MetaCatalogClient.deleteItem('tok', CATALOG_ID, 'HND-META-001');
      assert.ok(captured !== null, 'fetch not called');
      const req = captured as { body: { requests: Array<{ method: string; item_id: string }> } };
      assert.equal(req.body.requests[0]?.method, 'DELETE');
      assert.equal(req.body.requests[0]?.item_id, 'HND-META-001');
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe('MetaCatalogClient.getCatalog', () => {
  it('GETs catalog fields with access_token in query string', async () => {
    let capturedUrl: string | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      capturedUrl = String(url);
      return {
        ok: true, status: 200,
        json: async () => ({ id: CATALOG_ID, name: 'Dealer Auto Catalog', vertical: 'vehicles' }),
      };
    }) as unknown as typeof globalThis.fetch;
    try {
      const catalog = await MetaCatalogClient.getCatalog('tok', CATALOG_ID);
      assert.ok(capturedUrl !== null, 'fetch not called');
      const url = capturedUrl as string;
      assert.ok(url.includes(CATALOG_ID));
      assert.ok(url.includes('access_token=tok'));
      assert.ok(url.includes('fields=id%2Cname%2Cvertical'));
      assert.equal(catalog.vertical, 'vehicles');
    } finally {
      globalThis.fetch = orig;
    }
  });
});

// ── MetaCatalogBridge.buildItem tests ─────────────────────────────────────────

describe('MetaCatalogBridge.buildItem', () => {
  const bridge = new MetaCatalogBridge();
  const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };

  it('uses stockNumber as item id', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.equal(item.id, 'HND-META-001');
  });

  it('formats price as "XXXXX.XX USD"', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.equal((item.fields as { price: string }).price, '28999.00 USD');
  });

  it('maps mileage to {value, unit:"MI"}', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, ctx);
    const item = bridge.buildItem(pkg, ctx);
    const mileage = (item.fields as { mileage: { value: number; unit: string } }).mileage;
    assert.equal(mileage.value, 18500);
    assert.equal(mileage.unit, 'MI');
  });

  it('maps used vehicle to state_of_vehicle=USED, condition=GOOD', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, ctx);
    const item = bridge.buildItem(pkg, ctx);
    const f = item.fields as { state_of_vehicle: string; condition: string };
    assert.equal(f.state_of_vehicle, 'USED');
    assert.equal(f.condition, 'GOOD');
  });

  it('maps new vehicle to state_of_vehicle=NEW, condition=EXCELLENT', () => {
    const pkg = ContentPackageBuilder.fromVehicle({ ...VEHICLE_INPUT, condition: 'new', mileage: 0 }, ctx);
    const item = bridge.buildItem(pkg, ctx);
    const f = item.fields as { state_of_vehicle: string; condition: string };
    assert.equal(f.state_of_vehicle, 'NEW');
    assert.equal(f.condition, 'EXCELLENT');
  });

  it('maps cpo vehicle to state_of_vehicle=CPO, condition=EXCELLENT', () => {
    const pkg = ContentPackageBuilder.fromVehicle({ ...VEHICLE_INPUT, condition: 'cpo' }, ctx);
    const item = bridge.buildItem(pkg, ctx);
    const f = item.fields as { state_of_vehicle: string; condition: string };
    assert.equal(f.state_of_vehicle, 'CPO');
    assert.equal(f.condition, 'EXCELLENT');
  });

  it('maps certified vehicle to state_of_vehicle=CPO', () => {
    const pkg = ContentPackageBuilder.fromVehicle({ ...VEHICLE_INPUT, condition: 'certified' }, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.equal((item.fields as { state_of_vehicle: string }).state_of_vehicle, 'CPO');
  });

  it('sets availability=IN_STOCK', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.equal((item.fields as { availability: string }).availability, 'IN_STOCK');
  });

  it('includes vin, trim, exterior_color when present', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, ctx);
    const item = bridge.buildItem(pkg, ctx);
    const f = item.fields as { vin?: string; trim?: string; exterior_color?: string };
    assert.equal(f.vin, '1HGBH41JXMN109186');
    assert.equal(f.trim, 'Sport');
    assert.equal(f.exterior_color, 'Sonic Gray Pearl');
  });

  it('omits vin and trim when null', () => {
    const bare: VehicleInput = { ...VEHICLE_INPUT, vin: null, trim: null };
    const pkg = ContentPackageBuilder.fromVehicle(bare, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.ok(!('vin' in item.fields), 'vin should be absent');
    assert.ok(!('trim' in item.fields), 'trim should be absent');
  });

  it('maps image array from pkg.imageUrls', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, ctx);
    const item = bridge.buildItem(pkg, ctx);
    const images = (item.fields as { image: Array<{ url: string }> }).image;
    assert.equal(images[0]?.url, 'https://cdn.example.com/accord-1.jpg');
    assert.equal(images[1]?.url, 'https://cdn.example.com/accord-2.jpg');
  });
});

// ── MetaCatalogBridge.upsertItems ─────────────────────────────────────────────

describe('MetaCatalogBridge.upsertItems', () => {
  it('sends UPDATE batch requests and returns accepted count', async () => {
    let capturedBody: { requests: Array<{ method: string; item_id: string }> } | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(String(init.body ?? '{}'));
      return { ok: true, status: 200, json: async () => ({ handles: ['h1', 'h2'] }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const bridge = new MetaCatalogBridge();
      const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };
      const items = [VEHICLE_INPUT, { ...VEHICLE_INPUT, stockNumber: 'HND-META-002', id: 'veh-meta-002' }]
        .map(v => bridge.buildItem(ContentPackageBuilder.fromVehicle(v, ctx), ctx));
      const result = await bridge.upsertItems('tok', CATALOG_ID, items);
      assert.ok(capturedBody !== null, 'fetch not called');
      const reqs = (capturedBody as { requests: Array<{ method: string }> }).requests;
      assert.ok(reqs.every(r => r.method === 'UPDATE'));
      assert.equal(result.accepted, 2);
      assert.equal(result.rejected, 0);
      assert.deepEqual(result.handles, ['h1', 'h2']);
    } finally {
      globalThis.fetch = orig;
    }
  });
});

// ── HTTP route tests (meta-automotive-ads platform) ──────────────────────────

describe('PUT /api/dealers/:id/platforms/meta-automotive-ads/catalog-config', () => {
  it('returns 200 with stored config', async () => {
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

describe('POST /api/dealers/:id/platforms/meta-automotive-ads/catalog-sync', () => {
  it('returns 402 when no Meta OAuth token', async () => {
    const app = buildApp(makePrisma({ tokenRow: null }));
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/meta-automotive-ads/catalog-sync`,
      headers: authCookie(),
    });
    assert.equal(res.statusCode, 402);
  });

  it('returns 502 on Meta API error', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({ error: { message: 'Session has expired', code: 190 } }),
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
      ok: true, status: 200,
      json: async () => ({ handles: ['h1'] }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma({ vehicles: [makeVehicleRow()] }));
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/meta-automotive-ads/catalog-sync`,
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

describe('DELETE /api/dealers/:id/platforms/meta-automotive-ads/catalog-sync/items/:itemId', () => {
  it('returns 204 on successful item deletion', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({}),
    })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma());
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/dealers/${DEALER_ID}/platforms/meta-automotive-ads/catalog-sync/items/HND-META-001`,
        headers: authCookie(),
      });
      assert.equal(res.statusCode, 204);
    } finally {
      globalThis.fetch = orig;
    }
  });
});

// ── Capability manifest consistency ──────────────────────────────────────────

describe('meta-automotive-ads capability manifest', () => {
  it('is in CATALOG_SYNC_SLUGS', () => {
    assert.ok(CATALOG_SYNC_SLUGS.has('meta-automotive-ads'));
  });

  it('is in CATALOG_BRIDGE_SLUGS', () => {
    assert.ok(CATALOG_BRIDGE_SLUGS.has('meta-automotive-ads'));
  });

  it('bridge platformSlug matches registry key', () => {
    const bridge = new MetaCatalogBridge();
    assert.equal(bridge.platformSlug, 'meta-automotive-ads');
  });

  it('bridge oauthProvider matches profile', () => {
    const bridge = new MetaCatalogBridge();
    assert.equal(bridge.oauthProvider, 'meta-catalog-ads');
  });
});
