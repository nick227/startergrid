import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { NextdoorCatalogClient } from '../services/catalog/NextdoorCatalogClient.js';
import { NextdoorCatalogBridge } from '../services/catalog/bridges/NextdoorCatalogBridge.js';
import { ContentPackageBuilder, type VehicleInput } from '../services/distribution/ContentPackageBuilder.js';
import { CATALOG_BRIDGE_SLUGS } from '../server/routes/catalogSync.js';
import { CATALOG_SYNC_SLUGS, MARKETPLACE_LISTING_SLUGS } from '../lib/platformCapabilityManifest.js';
import { platformProfiles } from '../data/platformProfiles.js';

const DEALER_ID = 'dealer-nd-test';
const CATALOG_ID = 'nd-cat-456';
const SESSION_EXPIRY = new Date(Date.now() + 3600_000);

const VEHICLE: VehicleInput = {
  id: 'veh-nd-001', vin: '3VWFE21C04M000001',
  year: 2022, make: 'Volkswagen', model: 'Tiguan', trim: 'SE',
  priceCents: 3199900, condition: 'used', mileage: 27400,
  exteriorColor: 'Deep Black Pearl', stockNumber: 'VW-ND-001',
  media: [{ url: 'https://cdn.example.com/tiguan.jpg', sortOrder: 0 }],
};

const LIVE_TOKEN = {
  id: 'tok-nd', dealershipId: DEALER_ID, provider: 'nextdoor', accessToken: 'nd-bearer-token',
  refreshToken: null, tokenType: 'Bearer', scope: null,
  expiresAt: new Date(Date.now() + 3600_000),
  rawPayload: {}, createdAt: new Date(), updatedAt: new Date(),
};

const CATALOG_CONFIG = {
  id: 'sync-nd', dealershipId: DEALER_ID, platformSlug: 'nextdoor-ads',
  catalogId: CATALOG_ID, metadataJson: null, lastSyncAt: null, lastSyncCount: null,
  createdAt: new Date(), updatedAt: new Date(),
};

function makeSession() {
  return {
    id: 'sess-nd', tokenHash: 'x', operatorAccountId: 'op-nd',
    createdAt: new Date(), expiresAt: SESSION_EXPIRY, revokedAt: null,
    ipAddress: null, userAgent: null,
    account: {
      id: 'op-nd', email: 'admin@test.local', role: 'SUPER_ADMIN' as const,
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

// ── NextdoorCatalogClient ─────────────────────────────────────────────────────

describe('NextdoorCatalogClient.createOrUpdateItem', () => {
  it('POSTs to /catalogs/{id}/items with Authorization header and product body', async () => {
    let capturedReq: { url: string; headers: Record<string, string>; body: Record<string, unknown> } | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      capturedReq = { url: String(url), headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body ?? '{}')) };
      return { ok: true, status: 200, json: async () => ({ data: { id: 'item-nd-001', catalog_id: CATALOG_ID, status: 'ACTIVE' } }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const res = await NextdoorCatalogClient.createOrUpdateItem('nd-bearer-token', CATALOG_ID, {
        id: 'VW-ND-001', title: '2022 Volkswagen Tiguan SE', description: 'Used VW',
        url: 'https://dealer.test/tiguan', image_url: 'https://cdn.example.com/tiguan.jpg',
        price: '31999.00 USD', availability: 'in_stock', condition: 'used', brand: 'Volkswagen',
      });
      assert.ok(capturedReq !== null);
      const req = capturedReq as { url: string; headers: Record<string, string>; body: { id: string } };
      assert.ok(req.url.includes(`/catalogs/${CATALOG_ID}/items`), `URL ${req.url} should include /catalogs/${CATALOG_ID}/items`);
      assert.equal(req.headers['Authorization'], 'Bearer nd-bearer-token');
      assert.equal(req.body.id, 'VW-ND-001');
      assert.equal((res as { data?: { status?: string } }).data?.status, 'ACTIVE');
    } finally { globalThis.fetch = orig; }
  });

  it('throws on API error with Nextdoor error message', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false, status: 401,
      json: async () => ({ error: { code: 'UNAUTHORIZED', message: 'Invalid access token' } }),
    })) as unknown as typeof globalThis.fetch;
    try {
      await assert.rejects(
        () => NextdoorCatalogClient.createOrUpdateItem('bad', CATALOG_ID, {
          id: 'X', title: 'X', description: 'X', url: 'https://x', image_url: 'https://x',
          price: '0.00 USD', availability: 'in_stock', condition: 'new',
        }),
        /Nextdoor Ads API 401/,
      );
    } finally { globalThis.fetch = orig; }
  });
});

describe('NextdoorCatalogClient.deleteItem', () => {
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
      await NextdoorCatalogClient.deleteItem('nd-bearer-token', CATALOG_ID, 'VW-ND-001');
      assert.ok(capturedUrl.includes(`/catalogs/${CATALOG_ID}/items/VW-ND-001`));
      assert.equal(capturedMethod, 'DELETE');
    } finally { globalThis.fetch = orig; }
  });
});

// ── NextdoorCatalogBridge.buildItem ───────────────────────────────────────────

describe('NextdoorCatalogBridge.buildItem', () => {
  const bridge = new NextdoorCatalogBridge();
  const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };

  it('maps used vehicle to correct Nextdoor catalog fields', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.equal(item.id, 'VW-ND-001');
    const p = item.fields as {
      id: string; condition: string; availability: string;
      price: string; brand: string;
      custom_label_0: string; custom_label_2: string; custom_label_3: string;
    };
    assert.equal(p.id, 'VW-ND-001');
    assert.equal(p.condition, 'used');
    assert.equal(p.availability, 'in_stock');
    assert.equal(p.brand, 'Volkswagen');
    assert.equal(p.custom_label_0, 'Volkswagen');
    assert.equal(p.custom_label_2, '2022');
    assert.equal(p.custom_label_3, '27400');
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

  it('availability is always "in_stock"', () => {
    const item = bridge.buildItem(ContentPackageBuilder.fromVehicle(VEHICLE, ctx), ctx);
    assert.equal((item.fields as { availability: string }).availability, 'in_stock');
  });
});

// ── NextdoorCatalogBridge.upsertItems ─────────────────────────────────────────

describe('NextdoorCatalogBridge.upsertItems', () => {
  it('sends one POST per item and returns accepted count', async () => {
    let callCount = 0;
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => {
      callCount++;
      return { ok: true, status: 200, json: async () => ({ data: { id: `item-nd-00${callCount}`, status: 'ACTIVE' } }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const bridge = new NextdoorCatalogBridge();
      const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };
      const items = [
        VEHICLE,
        { ...VEHICLE, stockNumber: 'VW-ND-002', id: 'veh-nd-002' },
      ].map(v => bridge.buildItem(ContentPackageBuilder.fromVehicle(v, ctx), ctx));
      const result = await bridge.upsertItems('nd-bearer-token', CATALOG_ID, items);
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
      if (callCount === 1) {
        return { ok: false, status: 400, json: async () => ({ error: { code: 'INVALID_PRODUCT', message: 'Missing required field' } }) };
      }
      return { ok: true, status: 200, json: async () => ({ data: { id: 'item-nd-002', status: 'ACTIVE' } }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const bridge = new NextdoorCatalogBridge();
      const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };
      const items = [
        VEHICLE,
        { ...VEHICLE, stockNumber: 'VW-ND-002', id: 'veh-nd-002' },
      ].map(v => bridge.buildItem(ContentPackageBuilder.fromVehicle(v, ctx), ctx));
      const result = await bridge.upsertItems('nd-bearer-token', CATALOG_ID, items);
      assert.equal(result.accepted, 1);
      assert.equal(result.rejected, 1);
      assert.ok(result.rejectedItems?.length === 1);
      assert.equal(result.rejectedItems?.[0]?.itemId, 'VW-ND-001');
    } finally { globalThis.fetch = orig; }
  });
});

// ── HTTP routes ───────────────────────────────────────────────────────────────

describe('PUT /nextdoor-ads/catalog-config', () => {
  it('returns 200 with stored config', async () => {
    const app = buildApp(makePrisma());
    const res = await app.inject({
      method: 'PUT',
      url: `/api/dealers/${DEALER_ID}/platforms/nextdoor-ads/catalog-config`,
      headers: { cookie: 'op_session=mock' },
      payload: { catalogId: CATALOG_ID },
    });
    assert.equal(res.statusCode, 200);
  });
});

describe('POST /nextdoor-ads/catalog-sync', () => {
  it('returns 402 with no token', async () => {
    const app = buildApp(makePrisma({ tokenRow: null }));
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/nextdoor-ads/catalog-sync`,
      headers: { cookie: 'op_session=mock' },
    });
    assert.equal(res.statusCode, 402);
  });

  it('returns 200 with zero vehicles', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({ data: { id: 'item-nd-ok', status: 'ACTIVE' } }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma());
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/nextdoor-ads/catalog-sync`,
        headers: { cookie: 'op_session=mock' },
      });
      assert.equal(res.statusCode, 200);
    } finally { globalThis.fetch = orig; }
  });
});

// ── Manifest consistency ──────────────────────────────────────────────────────

describe('Nextdoor manifest consistency', () => {
  it('nextdoor-ads is in CATALOG_SYNC_SLUGS', () => {
    assert.ok(CATALOG_SYNC_SLUGS.has('nextdoor-ads'));
  });

  it('nextdoor-ads is in CATALOG_BRIDGE_SLUGS', () => {
    assert.ok(CATALOG_BRIDGE_SLUGS.has('nextdoor-ads'));
  });

  it('NextdoorCatalogBridge.platformSlug matches registry key', () => {
    const bridge = new NextdoorCatalogBridge();
    assert.equal(bridge.platformSlug, 'nextdoor-ads');
  });

  it('NextdoorCatalogBridge.oauthProvider matches profile oauthProvider', () => {
    const bridge = new NextdoorCatalogBridge();
    const profile = platformProfiles.find(p => p.slug === 'nextdoor-ads');
    assert.ok(profile, 'nextdoor-ads profile not found');
    assert.equal(bridge.oauthProvider, profile.oauthProvider);
  });

  it('profile has catalogSync:true', () => {
    const profile = platformProfiles.find(p => p.slug === 'nextdoor-ads');
    assert.ok(profile?.catalogSync, 'nextdoor-ads missing catalogSync:true');
  });

  it('nextdoor-ads is NOT in MARKETPLACE_LISTING_SLUGS', () => {
    assert.ok(!MARKETPLACE_LISTING_SLUGS.has('nextdoor-ads'), 'nextdoor-ads is an ad network and should not be a marketplace listing');
  });
});
