import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { SnapchatCatalogClient } from '../services/catalog/SnapchatCatalogClient.js';
import { SnapchatCatalogBridge } from '../services/catalog/bridges/SnapchatCatalogBridge.js';
import { ContentPackageBuilder, type VehicleInput } from '../services/distribution/ContentPackageBuilder.js';

const DEALER_ID = 'dealer-snap-test';
const CATALOG_ID = 'snap-cat-777';
const SESSION_EXPIRY = new Date(Date.now() + 3600_000);

const VEHICLE: VehicleInput = {
  id: 'veh-snap-001', vin: '5YJSA1CN5DFP12345',
  year: 2023, make: 'Chevrolet', model: 'Equinox', trim: 'LT',
  priceCents: 3099900, condition: 'used', mileage: 22000,
  exteriorColor: 'Mosaic Black', stockNumber: 'CHV-SNAP-001',
  media: [{ url: 'https://cdn.example.com/equinox.jpg', sortOrder: 0 }],
};

const LIVE_TOKEN = {
  id: 'tok-snap', dealershipId: DEALER_ID, provider: 'snapchat', accessToken: 'snap-token',
  refreshToken: null, tokenType: 'Bearer', scope: null,
  expiresAt: new Date(Date.now() + 3600_000),
  rawPayload: {}, createdAt: new Date(), updatedAt: new Date(),
};

const CATALOG_CONFIG = {
  id: 'sync-snap', dealershipId: DEALER_ID, platformSlug: 'snapchat-dynamic-product-ads',
  catalogId: CATALOG_ID, metadataJson: null, lastSyncAt: null, lastSyncCount: null,
  createdAt: new Date(), updatedAt: new Date(),
};

function makeSession() {
  return {
    id: 'sess-snap', tokenHash: 'x', operatorAccountId: 'op-snap',
    createdAt: new Date(), expiresAt: SESSION_EXPIRY, revokedAt: null,
    ipAddress: null, userAgent: null,
    account: {
      id: 'op-snap', email: 'admin@test.local', role: 'SUPER_ADMIN' as const,
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

// ── SnapchatCatalogClient ─────────────────────────────────────────────────────

describe('SnapchatCatalogClient.createProduct', () => {
  it('POSTs to /catalogs/{id}/products with Authorization header', async () => {
    let capturedReq: { url: string; headers: Record<string, string>; body: Record<string, unknown> } | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      capturedReq = { url: String(url), headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body ?? '{}')) };
      return { ok: true, status: 200, json: async () => ({ request_status: 'SUCCESS', product: { id: 'CHV-SNAP-001' } }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const res = await SnapchatCatalogClient.createProduct('snap-token', CATALOG_ID, {
        id: 'CHV-SNAP-001', name: '2023 Chevrolet Equinox', description: 'd', url: 'https://test',
        image_url: 'https://img', price: '30999.00', currency: 'USD',
        availability: 'in_stock', condition: 'used', brand: 'Chevrolet',
      });
      assert.ok(capturedReq !== null);
      const req = capturedReq as { url: string; headers: Record<string, string>; body: { product: Record<string, unknown> } };
      assert.ok(req.url.includes(`/catalogs/${CATALOG_ID}/products`));
      assert.equal(req.headers['Authorization'], 'Bearer snap-token');
      assert.equal(req.body.product['id'], 'CHV-SNAP-001');
      assert.equal(res.request_status, 'SUCCESS');
    } finally { globalThis.fetch = orig; }
  });

  it('throws on API error', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false, status: 403,
      json: async () => ({ request_status: 'FORBIDDEN' }),
    })) as unknown as typeof globalThis.fetch;
    try {
      await assert.rejects(
        () => SnapchatCatalogClient.createProduct('tok', CATALOG_ID, {
          id: 'x', name: 'x', description: 'x', url: 'x', image_url: 'x',
          price: '0', currency: 'USD', availability: 'in_stock', condition: 'new',
        }),
        /Snapchat API 403/,
      );
    } finally { globalThis.fetch = orig; }
  });
});

describe('SnapchatCatalogClient.deleteProduct', () => {
  it('sends DELETE to /catalogs/{id}/products/{productId}', async () => {
    let capturedUrl: string | null = null;
    let capturedMethod: string | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      capturedUrl = String(url);
      capturedMethod = init.method ?? 'GET';
      return { status: 204 };
    }) as unknown as typeof globalThis.fetch;
    try {
      await SnapchatCatalogClient.deleteProduct('snap-token', CATALOG_ID, 'CHV-SNAP-001');
      assert.ok(capturedUrl !== null);
      const url = capturedUrl as string;
      assert.ok(url.includes(`/catalogs/${CATALOG_ID}/products/CHV-SNAP-001`));
      assert.equal(capturedMethod, 'DELETE');
    } finally { globalThis.fetch = orig; }
  });
});

// ── SnapchatCatalogBridge.buildItem ───────────────────────────────────────────

describe('SnapchatCatalogBridge.buildItem', () => {
  const bridge = new SnapchatCatalogBridge();
  const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };

  it('maps used vehicle to correct Snapchat fields', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.equal(item.id, 'CHV-SNAP-001');
    const p = item.fields as {
      id: string; condition: string; availability: string;
      price: string; currency: string; brand: string;
      custom_label_0: string; custom_label_2: string;
    };
    assert.equal(p.id, 'CHV-SNAP-001');
    assert.equal(p.condition, 'used');
    assert.equal(p.availability, 'in_stock');
    assert.equal(p.price, '30999.00');
    assert.equal(p.currency, 'USD');
    assert.equal(p.brand, 'Chevrolet');
    assert.equal(p.custom_label_0, 'Chevrolet');
    assert.equal(p.custom_label_2, '2023');
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
});

describe('SnapchatCatalogBridge.upsertItems partial failure', () => {
  it('counts failed items as rejected, allows partial success', async () => {
    let callCount = 0;
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => {
      callCount++;
      if (callCount === 1) {
        return { ok: false, status: 400, json: async () => ({ request_status: 'REJECTED' }) };
      }
      return { ok: true, status: 200, json: async () => ({ request_status: 'SUCCESS' }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const bridge = new SnapchatCatalogBridge();
      const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };
      const items = [
        VEHICLE,
        { ...VEHICLE, stockNumber: 'CHV-SNAP-002', id: 'veh-002' },
      ].map(v => bridge.buildItem(ContentPackageBuilder.fromVehicle(v, ctx), ctx));
      const result = await bridge.upsertItems('snap-token', CATALOG_ID, items);
      assert.equal(callCount, 2);
      assert.equal(result.accepted, 1);
      assert.equal(result.rejected, 1);
      assert.equal(result.rejectedItems?.length, 1);
    } finally { globalThis.fetch = orig; }
  });
});

// ── HTTP routes ───────────────────────────────────────────────────────────────

describe('PUT /snapchat-dynamic-product-ads/catalog-config', () => {
  it('returns 200 with stored config', async () => {
    const app = buildApp(makePrisma());
    const res = await app.inject({
      method: 'PUT',
      url: `/api/dealers/${DEALER_ID}/platforms/snapchat-dynamic-product-ads/catalog-config`,
      headers: { cookie: 'op_session=mock' },
      payload: { catalogId: CATALOG_ID },
    });
    assert.equal(res.statusCode, 200);
  });
});

describe('POST /snapchat-dynamic-product-ads/catalog-sync', () => {
  it('returns 402 with no token', async () => {
    const app = buildApp(makePrisma({ tokenRow: null }));
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/snapchat-dynamic-product-ads/catalog-sync`,
      headers: { cookie: 'op_session=mock' },
    });
    assert.equal(res.statusCode, 402);
  });

  it('returns 200 with zero vehicles', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({ request_status: 'SUCCESS' }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma());
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/snapchat-dynamic-product-ads/catalog-sync`,
        headers: { cookie: 'op_session=mock' },
      });
      assert.equal(res.statusCode, 200);
    } finally { globalThis.fetch = orig; }
  });
});
