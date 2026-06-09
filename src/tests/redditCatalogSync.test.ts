import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { RedditCatalogClient } from '../services/catalog/RedditCatalogClient.js';
import { RedditCatalogBridge } from '../services/catalog/bridges/RedditCatalogBridge.js';
import { ContentPackageBuilder, type VehicleInput } from '../services/distribution/ContentPackageBuilder.js';

const DEALER_ID = 'dealer-reddit-test';
const CATALOG_ID = 'reddit-cat-333';
const SESSION_EXPIRY = new Date(Date.now() + 3600_000);

const VEHICLE: VehicleInput = {
  id: 'veh-rdt-001', vin: '2T1BURHE0JC000001',
  year: 2021, make: 'Subaru', model: 'Outback', trim: 'Premium',
  priceCents: 3499900, condition: 'used', mileage: 41000,
  exteriorColor: 'Crystal White Pearl', stockNumber: 'SUB-RDT-001',
  media: [{ url: 'https://cdn.example.com/outback.jpg', sortOrder: 0 }],
};

const LIVE_TOKEN = {
  id: 'tok-rdt', dealershipId: DEALER_ID, provider: 'reddit', accessToken: 'reddit-token',
  refreshToken: null, tokenType: 'Bearer', scope: null,
  expiresAt: new Date(Date.now() + 3600_000),
  rawPayload: {}, createdAt: new Date(), updatedAt: new Date(),
};

const CATALOG_CONFIG = {
  id: 'sync-rdt', dealershipId: DEALER_ID, platformSlug: 'reddit-dynamic-product-ads',
  catalogId: CATALOG_ID, metadataJson: null, lastSyncAt: null, lastSyncCount: null,
  createdAt: new Date(), updatedAt: new Date(),
};

function makeSession() {
  return {
    id: 'sess-rdt', tokenHash: 'x', operatorAccountId: 'op-rdt',
    createdAt: new Date(), expiresAt: SESSION_EXPIRY, revokedAt: null,
    ipAddress: null, userAgent: null,
    account: {
      id: 'op-rdt', email: 'admin@test.local', role: 'SUPER_ADMIN' as const,
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

// ── RedditCatalogClient ───────────────────────────────────────────────────────

describe('RedditCatalogClient.batchUpsert', () => {
  it('POSTs to /catalogs/{id}/items/batch with Authorization header and UPSERT operations', async () => {
    let capturedReq: { url: string; headers: Record<string, string>; body: Record<string, unknown> } | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      capturedReq = { url: String(url), headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body ?? '{}')) };
      return { ok: true, status: 200, json: async () => ({ batch_id: 'batch-rdt-001', items: [{ item_id: 'SUB-RDT-001' }] }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const res = await RedditCatalogClient.batchUpsert('reddit-token', CATALOG_ID, [
        {
          item_id: 'SUB-RDT-001', title: '2021 Subaru Outback', description: 'd', link: 'https://test',
          image_link: 'https://img', price: '34999.00', currency: 'USD',
          availability: 'IN_STOCK', condition: 'used', brand: 'Subaru',
        },
      ]);
      assert.ok(capturedReq !== null);
      const req = capturedReq as { url: string; headers: Record<string, string>; body: { operations: Array<{ method: string; item_id: string }> } };
      assert.ok(req.url.includes(`/catalogs/${CATALOG_ID}/items/batch`));
      assert.equal(req.headers['Authorization'], 'Bearer reddit-token');
      assert.ok(Array.isArray(req.body.operations));
      assert.equal(req.body.operations[0]?.method, 'UPSERT');
      assert.equal(req.body.operations[0]?.item_id, 'SUB-RDT-001');
      assert.equal(res.batch_id, 'batch-rdt-001');
    } finally { globalThis.fetch = orig; }
  });

  it('throws on API error', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false, status: 401,
      json: async () => ({ errors: [{ message: 'Unauthorized' }] }),
    })) as unknown as typeof globalThis.fetch;
    try {
      await assert.rejects(() => RedditCatalogClient.batchUpsert('bad', CATALOG_ID, []), /Reddit Ads API 401/);
    } finally { globalThis.fetch = orig; }
  });
});

describe('RedditCatalogClient.deleteItem', () => {
  it('POSTs DELETE operation to batch endpoint', async () => {
    let capturedBody: { operations: Array<{ method: string; item_id: string }> } | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (_url: string, init: RequestInit) => {
      capturedBody = JSON.parse(String(init.body ?? '{}'));
      return { ok: true, status: 200, json: async () => ({ batch_id: 'batch-del', items: [] }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      await RedditCatalogClient.deleteItem('reddit-token', CATALOG_ID, 'SUB-RDT-001');
      assert.ok(capturedBody !== null);
      const body = capturedBody as { operations: Array<{ method: string; item_id: string }> };
      assert.equal(body.operations[0]?.method, 'DELETE');
      assert.equal(body.operations[0]?.item_id, 'SUB-RDT-001');
    } finally { globalThis.fetch = orig; }
  });
});

// ── RedditCatalogBridge.buildItem ─────────────────────────────────────────────

describe('RedditCatalogBridge.buildItem', () => {
  const bridge = new RedditCatalogBridge();
  const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };

  it('maps used vehicle to correct Reddit fields', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.equal(item.id, 'SUB-RDT-001');
    const p = item.fields as {
      item_id: string; condition: string; availability: string;
      price: string; currency: string; brand: string;
      custom_label_0: string; custom_label_2: string; custom_label_3: string;
    };
    assert.equal(p.item_id, 'SUB-RDT-001');
    assert.equal(p.condition, 'used');
    assert.equal(p.availability, 'IN_STOCK');
    assert.equal(p.price, '34999.00');
    assert.equal(p.currency, 'USD');
    assert.equal(p.brand, 'Subaru');
    assert.equal(p.custom_label_0, 'Subaru');
    assert.equal(p.custom_label_2, '2021');
    assert.equal(p.custom_label_3, '41000');
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

  it('price is a string formatted to 2 decimal places', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.equal(typeof (item.fields as { price: string }).price, 'string');
    assert.ok((item.fields as { price: string }).price.includes('.'));
  });
});

describe('RedditCatalogBridge.upsertItems batch_id handle', () => {
  it('returns batch_id in handles and counts errors as rejected', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({
        batch_id: 'batch-rdt-abc',
        items: [
          { item_id: 'SUB-RDT-001', errors: [{ message: 'Bad image' }] },
          { item_id: 'SUB-RDT-002', errors: [] },
        ],
      }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const bridge = new RedditCatalogBridge();
      const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };
      const items = [
        VEHICLE,
        { ...VEHICLE, stockNumber: 'SUB-RDT-002', id: 'veh-002' },
      ].map(v => bridge.buildItem(ContentPackageBuilder.fromVehicle(v, ctx), ctx));
      const result = await bridge.upsertItems('reddit-token', CATALOG_ID, items);
      assert.equal(result.accepted, 1);
      assert.equal(result.rejected, 1);
      assert.deepEqual(result.handles, ['batch-rdt-abc']);
    } finally { globalThis.fetch = orig; }
  });
});

// ── HTTP routes ───────────────────────────────────────────────────────────────

describe('PUT /reddit-dynamic-product-ads/catalog-config', () => {
  it('returns 200 with stored config', async () => {
    const app = buildApp(makePrisma());
    const res = await app.inject({
      method: 'PUT',
      url: `/api/dealers/${DEALER_ID}/platforms/reddit-dynamic-product-ads/catalog-config`,
      headers: { cookie: 'op_session=mock' },
      payload: { catalogId: CATALOG_ID },
    });
    assert.equal(res.statusCode, 200);
  });
});

describe('POST /reddit-dynamic-product-ads/catalog-sync', () => {
  it('returns 402 with no token', async () => {
    const app = buildApp(makePrisma({ tokenRow: null }));
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/reddit-dynamic-product-ads/catalog-sync`,
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
        url: `/api/dealers/${DEALER_ID}/platforms/reddit-dynamic-product-ads/catalog-sync`,
        headers: { cookie: 'op_session=mock' },
      });
      assert.equal(res.statusCode, 200);
    } finally { globalThis.fetch = orig; }
  });
});
