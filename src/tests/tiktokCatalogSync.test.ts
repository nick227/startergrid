import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { TikTokCatalogClient, parseCatalogId } from '../services/catalog/TikTokCatalogClient.js';
import { TikTokCatalogBridge } from '../services/catalog/bridges/TikTokCatalogBridge.js';
import { ContentPackageBuilder, type VehicleInput } from '../services/distribution/ContentPackageBuilder.js';

const DEALER_ID = 'dealer-tiktok-test';
const BC_ID = 'bc-111';
const CAT_ID = 'cat-222';
const CATALOG_ID = `${BC_ID}:${CAT_ID}`;
const SESSION_EXPIRY = new Date(Date.now() + 3600_000);

const VEHICLE: VehicleInput = {
  id: 'veh-tt-001', vin: '1HGBH41JXMN100001',
  year: 2023, make: 'Honda', model: 'Civic', trim: 'Sport',
  priceCents: 2599900, condition: 'new', mileage: 12,
  exteriorColor: 'Sonic Gray', stockNumber: 'HND-TT-001',
  media: [{ url: 'https://cdn.example.com/civic.jpg', sortOrder: 0 }],
};

const LIVE_TOKEN = { id: 'tok-tt', dealershipId: DEALER_ID, provider: 'tiktok', accessToken: 'tt-token',
  refreshToken: null, tokenType: 'Bearer', scope: null, expiresAt: new Date(Date.now() + 3600_000),
  rawPayload: {}, createdAt: new Date(), updatedAt: new Date() };

const CATALOG_CONFIG = { id: 'sync-tt', dealershipId: DEALER_ID, platformSlug: 'tiktok-automotive-ads',
  catalogId: CATALOG_ID, metadataJson: null, lastSyncAt: null, lastSyncCount: null,
  createdAt: new Date(), updatedAt: new Date() };

function makeSession() {
  return { id: 'sess-tt', tokenHash: 'x', operatorAccountId: 'op-tt', createdAt: new Date(),
    expiresAt: SESSION_EXPIRY, revokedAt: null, ipAddress: null, userAgent: null,
    account: { id: 'op-tt', email: 'admin@test.local', role: 'SUPER_ADMIN' as const,
      isActive: true, passwordHash: 'x', lastLoginAt: null, createdAt: new Date(),
      updatedAt: new Date(), dealerAccess: [{ dealershipId: DEALER_ID }] } };
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

// ── parseCatalogId ────────────────────────────────────────────────────────────

describe('parseCatalogId', () => {
  it('splits bc_id and catalog_id on first colon', () => {
    const { bcId, catalogId } = parseCatalogId('bc-111:cat-222');
    assert.equal(bcId, 'bc-111');
    assert.equal(catalogId, 'cat-222');
  });

  it('throws on missing colon', () => {
    assert.throws(() => parseCatalogId('nocolon'), /TikTok catalogId must be/);
  });
});

// ── TikTokCatalogClient ───────────────────────────────────────────────────────

describe('TikTokCatalogClient.batchCreate', () => {
  it('POSTs to /catalog/product/batch_create/ with Access-Token header', async () => {
    let capturedReq: { url: string; headers: Record<string, string>; body: Record<string, unknown> } | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      capturedReq = { url: String(url), headers: init.headers as Record<string, string>, body: JSON.parse(String(init.body ?? '{}')) };
      return { ok: true, status: 200, json: async () => ({ code: 0, message: 'OK', data: { success_list: [{ item_id: 'HND-TT-001' }], fail_list: [] } }) };
    }) as unknown as typeof globalThis.fetch;
    try {
      const res = await TikTokCatalogClient.batchCreate('tt-token', BC_ID, CAT_ID, [{
        item_id: 'HND-TT-001', title: '2023 Honda Civic', description: 'd', link: 'https://test', image_link: 'https://img',
        price: 25999.00, currency: 'USD', availability: 'IN_STOCK', condition: 'NEW', brand: 'Honda',
      }]);
      assert.ok(capturedReq !== null);
      const req = capturedReq as { url: string; headers: Record<string, string>; body: Record<string, unknown> };
      assert.ok(req.url.includes('/catalog/product/batch_create/'));
      assert.equal(req.headers['Access-Token'], 'tt-token');
      assert.equal(req.body['bc_id'], BC_ID);
      assert.equal(req.body['catalog_id'], CAT_ID);
      assert.equal(res.success_list?.[0]?.item_id, 'HND-TT-001');
    } finally { globalThis.fetch = orig; }
  });

  it('throws on non-zero code', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => ({ code: 40001, message: 'Invalid catalog_id', data: null }) })) as unknown as typeof globalThis.fetch;
    try {
      await assert.rejects(() => TikTokCatalogClient.batchCreate('tok', BC_ID, CAT_ID, []), /TikTok API 40001/);
    } finally { globalThis.fetch = orig; }
  });
});

// ── TikTokCatalogBridge.buildItem ─────────────────────────────────────────────

describe('TikTokCatalogBridge.buildItem', () => {
  const bridge = new TikTokCatalogBridge();
  const ctx = { dealershipId: DEALER_ID, listingBaseUrl: 'https://dealer.test' };

  it('maps new vehicle to IN_STOCK / NEW condition', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE, ctx);
    const item = bridge.buildItem(pkg, ctx);
    assert.equal(item.id, 'HND-TT-001');
    const f = item.fields as { condition: string; availability: string; price: number; brand: string; custom_label_0: string; custom_label_2: string };
    assert.equal(f.condition, 'NEW');
    assert.equal(f.availability, 'IN_STOCK');
    assert.equal(f.price, 25999.00);
    assert.equal(f.brand, 'Honda');
    assert.equal(f.custom_label_0, 'make:Honda');
    assert.equal(f.custom_label_2, 'year:2023');
  });

  it('maps certified to REFURBISHED', () => {
    const cpo: VehicleInput = { ...VEHICLE, condition: 'certified' };
    const item = bridge.buildItem(ContentPackageBuilder.fromVehicle(cpo, ctx), ctx);
    assert.equal((item.fields as { condition: string }).condition, 'REFURBISHED');
  });
});

// ── HTTP routes ───────────────────────────────────────────────────────────────

describe('PUT /tiktok-automotive-ads/catalog-config', () => {
  it('returns 200 with stored config', async () => {
    const app = buildApp(makePrisma());
    const res = await app.inject({ method: 'PUT',
      url: `/api/dealers/${DEALER_ID}/platforms/tiktok-automotive-ads/catalog-config`,
      headers: { cookie: 'op_session=mock' }, payload: { catalogId: CATALOG_ID } });
    assert.equal(res.statusCode, 200);
  });
});

describe('POST /tiktok-automotive-ads/catalog-sync', () => {
  it('returns 402 with no token', async () => {
    const app = buildApp(makePrisma({ tokenRow: null }));
    const res = await app.inject({ method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/tiktok-automotive-ads/catalog-sync`,
      headers: { cookie: 'op_session=mock' } });
    assert.equal(res.statusCode, 402);
  });

  it('returns 200 with zero vehicles', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({ ok: true, status: 200, json: async () => ({ code: 0, message: 'OK', data: { success_list: [], fail_list: [] } }) })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma());
      const res = await app.inject({ method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/tiktok-automotive-ads/catalog-sync`,
        headers: { cookie: 'op_session=mock' } });
      assert.equal(res.statusCode, 200);
    } finally { globalThis.fetch = orig; }
  });
});
