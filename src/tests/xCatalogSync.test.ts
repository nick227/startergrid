import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { XCatalogClient } from '../services/catalog/XCatalogClient.js';
import { XCatalogBridge } from '../services/catalog/bridges/XCatalogBridge.js';
import { ContentPackageBuilder, type VehicleInput } from '../services/distribution/ContentPackageBuilder.js';
import { CATALOG_BRIDGE_SLUGS } from '../server/routes/catalogSync.js';
import { CATALOG_SYNC_SLUGS } from '../lib/platformCapabilityManifest.js';
import { platformProfiles } from '../data/platformProfiles.js';

const DEALER_ID = 'dealer-x-test';
const CATALOG_ID = 'x-cat-888';
const SESSION_EXPIRY = new Date(Date.now() + 3600_000);

const VEHICLE: VehicleInput = {
  id: 'veh-x-001', vin: '1HGBH41JXMN109186',
  year: 2023, make: 'Honda', model: 'Accord', trim: 'Sport',
  priceCents: 2849900, condition: 'used', mileage: 18500,
  exteriorColor: 'Sonic Gray Pearl', stockNumber: 'HON-X-001',
  media: [{ url: 'https://cdn.example.com/accord.jpg', sortOrder: 0 }],
};

const LIVE_TOKEN = {
  id: 'tok-x', dealershipId: DEALER_ID, provider: 'x', accessToken: 'x-bearer-token',
  refreshToken: null, tokenType: 'Bearer', scope: null,
  expiresAt: new Date(Date.now() + 3600_000),
  rawPayload: {}, createdAt: new Date(), updatedAt: new Date(),
};

const CATALOG_CONFIG = {
  id: 'sync-x', dealershipId: DEALER_ID, platformSlug: 'x-dynamic-product-ads',
  catalogId: CATALOG_ID, metadataJson: null, lastSyncAt: null, lastSyncCount: null,
  createdAt: new Date(), updatedAt: new Date(),
};

function makeSession() {
  return {
    id: 'sess-x', tokenHash: 'x', operatorAccountId: 'op-x',
    createdAt: new Date(), expiresAt: SESSION_EXPIRY, revokedAt: null,
    ipAddress: null, userAgent: null,
    account: {
      id: 'op-x', email: 'admin@test.local', role: 'SUPER_ADMIN' as const,
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

// ── XCatalogClient ────────────────────────────────────────────────────────────

describe('XCatalogClient.createOrUpdateItem', () => {
  it('POSTs to /catalogs/{id}/items with Authorization header and product body', async () => {
    let capturedReq: { url: string; headers: Record<string, string>; body: Record<string, unknown> } | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      capturedReq = { url: String(url), headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body ?? '{}')) };
      return { ok: true, status: 200, json: async () => ({ data: { id: 'item-x-001', content_id: 'HON-X-001' } }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const res = await XCatalogClient.createOrUpdateItem('x-bearer-token', CATALOG_ID, {
        content_id: 'HON-X-001', title: '2023 Honda Accord Sport', description: 'Used Honda',
        product_url: 'https://dealer.test/acc', image_url: 'https://cdn.example.com/accord.jpg',
        price: '28499.00 USD', availability: 'in stock', condition: 'used', brand: 'Honda',
      });
      assert.ok(capturedReq !== null);
      const req = capturedReq as { url: string; headers: Record<string, string>; body: { content_id: string } };
      assert.ok(req.url.includes(`/catalogs/${CATALOG_ID}/items`));
      assert.equal(req.headers['Authorization'], 'Bearer x-bearer-token');
      assert.equal(req.body.content_id, 'HON-X-001');
      assert.equal((res as { data?: { content_id?: string } }).data?.content_id, 'HON-X-001');
    } finally { globalThis.fetch = orig; }
  });

  it('throws on API error with X error message', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false, status: 403,
      json: async () => ({ errors: [{ message: 'Forbidden', code: 87 }] }),
    })) as unknown as typeof globalThis.fetch;
    try {
      await assert.rejects(() => XCatalogClient.createOrUpdateItem('bad', CATALOG_ID, {
        content_id: 'X', title: 'X', description: 'X', product_url: 'https://x', image_url: 'https://x',
        price: '0.00 USD', availability: 'in stock', condition: 'new',
      }), /X Ads API 403/);
    } finally { globalThis.fetch = orig; }
  });
});

describe('XCatalogClient.deleteItem', () => {
  it('DELETEs /catalogs/{id}/items/{itemId} with Authorization header', async () => {
    let capturedUrl = '';
    let capturedMethod = '';
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      capturedUrl = String(url);
      capturedMethod = String(init.method);
      return { ok: true, status: 204, json: async () => ({}) };
    }) as unknown as typeof globalThis.fetch;
    try {
      await XCatalogClient.deleteItem('x-bearer-token', CATALOG_ID, 'HON-X-001');
      assert.ok(capturedUrl.includes(`/catalogs/${CATALOG_ID}/items/HON-X-001`));
      assert.equal(capturedMethod, 'DELETE');
    } finally { globalThis.fetch = orig; }
  });
});

// ── XCatalogBridge.buildItem ──────────────────────────────────────────────────

describe('XCatalogBridge.buildItem', () => {
  const bridge = new XCatalogBridge();
  const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };

  it('maps used vehicle to correct X DPA fields', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.equal(item.id, 'HON-X-001');
    const p = item.fields as {
      content_id: string; condition: string; availability: string;
      price: string; brand: string;
      custom_label_0: string; custom_label_2: string; custom_label_3: string;
    };
    assert.equal(p.content_id, 'HON-X-001');
    assert.equal(p.condition, 'used');
    assert.equal(p.availability, 'in stock');
    assert.equal(p.brand, 'Honda');
    assert.equal(p.custom_label_0, 'Honda');
    assert.equal(p.custom_label_2, '2023');
    assert.equal(p.custom_label_3, '18500');
  });

  it('price is formatted as "NNNNN.NN USD"', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE, ctx);
    const item = bridge.buildItem(pkg, ctx);
    const price = (item.fields as { price: string }).price;
    assert.ok(price.endsWith(' USD'), `price "${price}" should end with " USD"`);
    assert.ok(/^\d+\.\d{2} USD$/.test(price), `price "${price}" should match NNNNN.NN USD format`);
  });

  it('maps new vehicle to condition "new"', () => {
    const newVehicle: VehicleInput = { ...VEHICLE, condition: 'new', mileage: 0 };
    const item = bridge.buildItem(ContentPackageBuilder.fromVehicle(newVehicle, ctx), ctx);
    assert.equal((item.fields as { condition: string }).condition, 'new');
  });

  it('maps cpo to "refurbished"', () => {
    const cpo: VehicleInput = { ...VEHICLE, condition: 'cpo' };
    const item = bridge.buildItem(ContentPackageBuilder.fromVehicle(cpo, ctx), ctx);
    assert.equal((item.fields as { condition: string }).condition, 'refurbished');
  });

  it('maps certified to "refurbished"', () => {
    const cert: VehicleInput = { ...VEHICLE, condition: 'certified' };
    const item = bridge.buildItem(ContentPackageBuilder.fromVehicle(cert, ctx), ctx);
    assert.equal((item.fields as { condition: string }).condition, 'refurbished');
  });

  it('availability is always "in stock"', () => {
    const item = bridge.buildItem(ContentPackageBuilder.fromVehicle(VEHICLE, ctx), ctx);
    assert.equal((item.fields as { availability: string }).availability, 'in stock');
  });
});

// ── XCatalogBridge.upsertItems ────────────────────────────────────────────────

describe('XCatalogBridge.upsertItems', () => {
  it('sends one POST per item and returns accepted count', async () => {
    let callCount = 0;
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => {
      callCount++;
      return { ok: true, status: 200, json: async () => ({ data: { id: `item-${callCount}`, content_id: `HON-X-00${callCount}` } }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const bridge = new XCatalogBridge();
      const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };
      const items = [
        VEHICLE,
        { ...VEHICLE, stockNumber: 'HON-X-002', id: 'veh-x-002' },
      ].map(v => bridge.buildItem(ContentPackageBuilder.fromVehicle(v, ctx), ctx));
      const result = await bridge.upsertItems('x-bearer-token', CATALOG_ID, items);
      assert.equal(callCount, 2, 'should POST once per item');
      assert.equal(result.accepted, 2);
      assert.equal(result.rejected, 0);
    } finally { globalThis.fetch = orig; }
  });

  it('counts per-item errors as rejected without aborting the batch', async () => {
    let callCount = 0;
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => {
      callCount++;
      if (callCount === 1) return { ok: false, status: 400, json: async () => ({ errors: [{ message: 'Bad product' }] }) };
      return { ok: true, status: 200, json: async () => ({ data: { id: 'item-2', content_id: 'HON-X-002' } }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const bridge = new XCatalogBridge();
      const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };
      const items = [
        VEHICLE,
        { ...VEHICLE, stockNumber: 'HON-X-002', id: 'veh-x-002' },
      ].map(v => bridge.buildItem(ContentPackageBuilder.fromVehicle(v, ctx), ctx));
      const result = await bridge.upsertItems('x-bearer-token', CATALOG_ID, items);
      assert.equal(result.accepted, 1);
      assert.equal(result.rejected, 1);
      assert.ok(result.rejectedItems?.length === 1);
    } finally { globalThis.fetch = orig; }
  });
});

// ── HTTP routes ───────────────────────────────────────────────────────────────

describe('PUT /x-dynamic-product-ads/catalog-config', () => {
  it('returns 200 with stored config', async () => {
    const app = buildApp(makePrisma());
    const res = await app.inject({
      method: 'PUT',
      url: `/api/dealers/${DEALER_ID}/platforms/x-dynamic-product-ads/catalog-config`,
      headers: { cookie: 'op_session=mock' },
      payload: { catalogId: CATALOG_ID },
    });
    assert.equal(res.statusCode, 200);
  });
});

describe('POST /x-dynamic-product-ads/catalog-sync', () => {
  it('returns 402 with no token', async () => {
    const app = buildApp(makePrisma({ tokenRow: null }));
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/x-dynamic-product-ads/catalog-sync`,
      headers: { cookie: 'op_session=mock' },
    });
    assert.equal(res.statusCode, 402);
  });

  it('returns 200 with zero vehicles', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({ data: { id: 'item-ok', content_id: 'X' } }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma());
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/x-dynamic-product-ads/catalog-sync`,
        headers: { cookie: 'op_session=mock' },
      });
      assert.equal(res.statusCode, 200);
    } finally { globalThis.fetch = orig; }
  });
});

// ── Manifest consistency ──────────────────────────────────────────────────────

describe('X DPA manifest consistency', () => {
  it('x-dynamic-product-ads is in CATALOG_SYNC_SLUGS', () => {
    assert.ok(CATALOG_SYNC_SLUGS.has('x-dynamic-product-ads'));
  });

  it('x-dynamic-product-ads is in CATALOG_BRIDGE_SLUGS', () => {
    assert.ok(CATALOG_BRIDGE_SLUGS.has('x-dynamic-product-ads'));
  });

  it('XCatalogBridge.platformSlug matches registry key', () => {
    const bridge = new XCatalogBridge();
    assert.equal(bridge.platformSlug, 'x-dynamic-product-ads');
  });

  it('XCatalogBridge.oauthProvider matches profile oauthProvider', () => {
    const bridge = new XCatalogBridge();
    const profile = platformProfiles.find(p => p.slug === 'x-dynamic-product-ads');
    assert.ok(profile, 'x-dynamic-product-ads profile not found');
    assert.equal(bridge.oauthProvider, profile.oauthProvider);
  });

  it('profile has catalogSync:true', () => {
    const profile = platformProfiles.find(p => p.slug === 'x-dynamic-product-ads');
    assert.ok(profile?.catalogSync, 'x-dynamic-product-ads missing catalogSync:true');
  });
});
