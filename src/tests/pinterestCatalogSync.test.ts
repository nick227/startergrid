import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { PinterestCatalogClient } from '../services/catalog/PinterestCatalogClient.js';
import { PinterestCatalogBridge } from '../services/catalog/bridges/PinterestCatalogBridge.js';
import { ContentPackageBuilder, type VehicleInput } from '../services/distribution/ContentPackageBuilder.js';

const DEALER_ID = 'dealer-pin-test';
const CATALOG_ID = 'pin-catalog-999';
const SESSION_EXPIRY = new Date(Date.now() + 3600_000);

const VEHICLE: VehicleInput = {
  id: 'veh-pin-001', vin: '3VWFE21C04M000001',
  year: 2024, make: 'Toyota', model: 'Camry', trim: 'XSE',
  priceCents: 3299900, condition: 'new', mileage: 0,
  exteriorColor: 'Midnight Black', stockNumber: 'TOY-PIN-001',
  media: [{ url: 'https://cdn.example.com/camry.jpg', sortOrder: 0 }],
};

const LIVE_TOKEN = {
  id: 'tok-pin', dealershipId: DEALER_ID, provider: 'pinterest', accessToken: 'pin-token',
  refreshToken: null, tokenType: 'Bearer', scope: null,
  expiresAt: new Date(Date.now() + 3600_000),
  rawPayload: {}, createdAt: new Date(), updatedAt: new Date(),
};

const CATALOG_CONFIG = {
  id: 'sync-pin', dealershipId: DEALER_ID, platformSlug: 'pinterest-shopping-ads',
  catalogId: CATALOG_ID, metadataJson: null, lastSyncAt: null, lastSyncCount: null,
  createdAt: new Date(), updatedAt: new Date(),
};

function makeSession() {
  return {
    id: 'sess-pin', tokenHash: 'x', operatorAccountId: 'op-pin',
    createdAt: new Date(), expiresAt: SESSION_EXPIRY, revokedAt: null,
    ipAddress: null, userAgent: null,
    account: {
      id: 'op-pin', email: 'admin@test.local', role: 'SUPER_ADMIN' as const,
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

// ── PinterestCatalogClient ────────────────────────────────────────────────────

describe('PinterestCatalogClient.upsertItems', () => {
  it('POSTs to /catalogs/items/batch with Authorization header and catalog_id', async () => {
    let capturedReq: { url: string; headers: Record<string, string>; body: Record<string, unknown> } | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      capturedReq = { url: String(url), headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body ?? '{}')) };
      return { ok: true, status: 200, json: async () => ({ batch_id: 'batch-pin-001', items: [] }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const res = await PinterestCatalogClient.upsertItems('pin-token', CATALOG_ID, [
        { item_id: 'TOY-PIN-001', attributes: {
          title: '2024 Toyota Camry', description: 'd', link: 'https://test',
          image_link: 'https://img', price: '32999.00', currency: 'USD',
          availability: 'IN_STOCK', condition: 'NEW', brand: 'Toyota',
        } },
      ]);
      assert.ok(capturedReq !== null);
      const req = capturedReq as { url: string; headers: Record<string, string>; body: Record<string, unknown> };
      assert.ok(req.url.includes('/catalogs/items/batch'));
      assert.equal(req.headers['Authorization'], 'Bearer pin-token');
      assert.equal(req.body['catalog_id'], CATALOG_ID);
      assert.equal(req.body['operation'], 'UPSERT');
      assert.equal(res.batch_id, 'batch-pin-001');
    } finally { globalThis.fetch = orig; }
  });

  it('throws on API error', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false, status: 400,
      json: async () => ({ message: 'Invalid catalog' }),
    })) as unknown as typeof globalThis.fetch;
    try {
      await assert.rejects(() => PinterestCatalogClient.upsertItems('tok', CATALOG_ID, []), /Pinterest API 400/);
    } finally { globalThis.fetch = orig; }
  });
});

describe('PinterestCatalogClient.deleteItems', () => {
  it('POSTs DELETE operation with item_ids', async () => {
    let capturedBody: Record<string, unknown> | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(String(init.body ?? '{}'));
      return { ok: true, status: 200, json: async () => ({ batch_id: 'batch-del-001' }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      await PinterestCatalogClient.deleteItems('pin-token', CATALOG_ID, ['TOY-PIN-001']);
      assert.ok(capturedBody !== null);
      const body = capturedBody as Record<string, unknown>;
      assert.equal(body['operation'], 'DELETE');
      assert.equal(body['catalog_id'], CATALOG_ID);
    } finally { globalThis.fetch = orig; }
  });
});

// ── PinterestCatalogBridge.buildItem ──────────────────────────────────────────

describe('PinterestCatalogBridge.buildItem', () => {
  const bridge = new PinterestCatalogBridge();
  const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };

  it('maps new vehicle to IN_STOCK / NEW with nested attributes', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.equal(item.id, 'TOY-PIN-001');
    const f = item.fields as { item_id: string; attributes: {
      condition: string; availability: string; price: string; brand: string;
      google_product_category: string; custom_label_0: string; custom_label_2: string;
    } };
    assert.equal(f.item_id, 'TOY-PIN-001');
    assert.equal(f.attributes.condition, 'NEW');
    assert.equal(f.attributes.availability, 'IN_STOCK');
    assert.equal(f.attributes.price, '32999.00');
    assert.equal(f.attributes.brand, 'Toyota');
    assert.ok(f.attributes.google_product_category.includes('Vehicles'));
    assert.equal(f.attributes.custom_label_0, 'Toyota');
    assert.equal(f.attributes.custom_label_2, '2024');
  });

  it('maps certified to REFURBISHED', () => {
    const cpo: VehicleInput = { ...VEHICLE, condition: 'certified' };
    const item = bridge.buildItem(ContentPackageBuilder.fromVehicle(cpo, ctx), ctx);
    const attrs = (item.fields as { attributes: { condition: string } }).attributes;
    assert.equal(attrs.condition, 'REFURBISHED');
  });

  it('maps used to USED', () => {
    const used: VehicleInput = { ...VEHICLE, condition: 'used', mileage: 25000 };
    const item = bridge.buildItem(ContentPackageBuilder.fromVehicle(used, ctx), ctx);
    const attrs = (item.fields as { attributes: { condition: string } }).attributes;
    assert.equal(attrs.condition, 'USED');
  });

  it('includes vin in custom_label_4 when present', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE, ctx);
    const item = bridge.buildItem(pkg, ctx);
    const attrs = (item.fields as { attributes: { custom_label_4?: string } }).attributes;
    assert.equal(attrs.custom_label_4, '3VWFE21C04M000001');
  });

  it('omits custom_label_4 when vin is null', () => {
    const noVin: VehicleInput = { ...VEHICLE, vin: null };
    const item = bridge.buildItem(ContentPackageBuilder.fromVehicle(noVin, ctx), ctx);
    const attrs = (item.fields as { attributes: Record<string, unknown> }).attributes;
    assert.ok(!('custom_label_4' in attrs));
  });
});

describe('PinterestCatalogBridge.upsertItems batch_id handle', () => {
  it('returns batch_id in handles array', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({ batch_id: 'batch-pin-abc', items: [] }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const bridge = new PinterestCatalogBridge();
      const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };
      const items = [bridge.buildItem(ContentPackageBuilder.fromVehicle(VEHICLE, ctx), ctx)];
      const result = await bridge.upsertItems('pin-token', CATALOG_ID, items);
      assert.equal(result.accepted, 1);
      assert.deepEqual(result.handles, ['batch-pin-abc']);
    } finally { globalThis.fetch = orig; }
  });
});

// ── HTTP routes ───────────────────────────────────────────────────────────────

describe('PUT /pinterest-shopping-ads/catalog-config', () => {
  it('returns 200 with stored config', async () => {
    const app = buildApp(makePrisma());
    const res = await app.inject({
      method: 'PUT',
      url: `/api/dealers/${DEALER_ID}/platforms/pinterest-shopping-ads/catalog-config`,
      headers: { cookie: 'op_session=mock' },
      payload: { catalogId: CATALOG_ID },
    });
    assert.equal(res.statusCode, 200);
  });
});

describe('POST /pinterest-shopping-ads/catalog-sync', () => {
  it('returns 402 with no token', async () => {
    const app = buildApp(makePrisma({ tokenRow: null }));
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/pinterest-shopping-ads/catalog-sync`,
      headers: { cookie: 'op_session=mock' },
    });
    assert.equal(res.statusCode, 402);
  });

  it('returns 200 with zero vehicles', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({ batch_id: 'batch-ok', items: [] }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma());
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/pinterest-shopping-ads/catalog-sync`,
        headers: { cookie: 'op_session=mock' },
      });
      assert.equal(res.statusCode, 200);
    } finally { globalThis.fetch = orig; }
  });
});
