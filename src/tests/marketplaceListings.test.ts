import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { EbayListingClient } from '../services/marketplace/EbayListingClient.js';
import { EbayListingBridge } from '../services/marketplace/bridges/EbayListingBridge.js';
import { MarketplaceListingStore } from '../services/marketplace/MarketplaceListingStore.js';
import { ContentPackageBuilder, type VehicleInput } from '../services/distribution/ContentPackageBuilder.js';
import { LISTING_BRIDGE_SLUGS } from '../server/routes/marketplaceListings.js';
import { MARKETPLACE_LISTING_SLUGS } from '../lib/platformCapabilityManifest.js';
import { platformProfiles } from '../data/platformProfiles.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DEALER_ID = 'dealer-ml-test';
const VEHICLE_ID = 'veh-ml-001';
const SESSION_EXPIRY = new Date(Date.now() + 60 * 60 * 1000);

const VEHICLE_INPUT: VehicleInput = {
  id: VEHICLE_ID,
  vin: '1FTFW1ET5EFA12345',
  year: 2023,
  make: 'Ford',
  model: 'F-150',
  trim: 'Lariat',
  priceCents: 5500000,
  condition: 'used',
  mileage: 12000,
  exteriorColor: 'Carbonized Gray',
  stockNumber: 'FRD-ML-001',
  media: [{ url: 'https://cdn.example.com/img.jpg', sortOrder: 0 }],
};

const LIVE_TOKEN = {
  id: 'tok-1',
  dealershipId: DEALER_ID,
  provider: 'ebay',
  accessToken: 'live-access-token',
  refreshToken: 'live-refresh-token',
  tokenType: 'Bearer',
  scope: 'https://api.ebay.com/oauth/api_scope/sell.inventory',
  expiresAt: new Date(Date.now() + 3600_000),
  rawPayload: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

const ACTIVE_LISTING = {
  id: 'ml-1',
  dealershipId: DEALER_ID,
  vehicleId: VEHICLE_ID,
  platformSlug: 'ebay-motors',
  externalListingId: 'ebay-listing-123',
  externalOfferId: 'ebay-offer-456',
  status: 'ACTIVE',
  errorMessage: null,
  listedAt: new Date(),
  endedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

function makeSession(dealershipId = DEALER_ID) {
  return {
    id: 'sess-ml',
    tokenHash: 'irrelevant',
    operatorAccountId: 'op-ml',
    createdAt: new Date(),
    expiresAt: SESSION_EXPIRY,
    revokedAt: null,
    ipAddress: null,
    userAgent: null,
    account: {
      id: 'op-ml',
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
    id: VEHICLE_ID,
    dealershipId: DEALER_ID,
    vin: '1FTFW1ET5EFA12345',
    stockNumber: 'FRD-ML-001',
    year: 2023,
    make: 'Ford',
    model: 'F-150',
    trim: 'Lariat',
    mileage: 12000,
    priceCents: 5500000,
    condition: 'used',
    exteriorColor: 'Carbonized Gray',
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
    media: [{ url: 'https://cdn.example.com/img.jpg', sortOrder: 0 }],
    ...overrides,
  };
}

type PrismaStubOpts = {
  sessionExists?: boolean;
  dealerExists?: boolean;
  vehicleRow?: Record<string, unknown> | null;
  tokenRow?: Record<string, unknown> | null;
  existingListing?: Record<string, unknown> | null;
  upsertedListing?: Record<string, unknown>;
};

function makePrisma(opts: PrismaStubOpts = {}): PrismaClient {
  const session = opts.sessionExists !== false ? makeSession() : null;
  const dealer = opts.dealerExists !== false ? { id: DEALER_ID, legalName: 'Test', businessCategory: 'AUTOMOTIVE' } : null;
  const vehicle = 'vehicleRow' in opts ? opts.vehicleRow : makeVehicleRow();
  const token = 'tokenRow' in opts ? opts.tokenRow : LIVE_TOKEN;
  const existing = opts.existingListing ?? null;
  const upserted = opts.upsertedListing ?? ACTIVE_LISTING;

  return {
    operatorSession: { findUnique: async () => session },
    dealershipProfile: { findUnique: async () => dealer },
    vehicle: {
      findUnique: async () => vehicle,
    },
    platformOAuthToken: {
      findUnique: async () => token,
      upsert: async () => token,
    },
    marketplaceListing: {
      upsert: async () => upserted,
      findUnique: async () => existing,
      findMany: async () => (existing ? [existing] : []),
      updateMany: async () => ({ count: 1 }),
    },
  } as unknown as PrismaClient;
}

// ── EbayListingClient unit tests ──────────────────────────────────────────────

describe('EbayListingClient.upsertInventoryItem', () => {
  it('calls PUT /sell/inventory/v1/inventory_item/:sku with correct body', async () => {
    let capturedReq: { url: string; method: string; body: string } | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      capturedReq = { url: String(url), method: init.method ?? 'GET', body: String(init.body ?? '') };
      return { ok: true, status: 204, text: async () => '' };
    }) as unknown as typeof globalThis.fetch;
    try {
      await EbayListingClient.upsertInventoryItem('tok', {
        sku: 'SKU-001',
        condition: 'used',
        title: '2023 Ford F-150',
        description: 'Great truck',
        imageUrls: ['https://cdn.example.com/img.jpg'],
        mileage: 12000,
        year: 2023,
        make: 'Ford',
        vehicleModel: 'F-150',
        trim: 'Lariat',
        vin: '1FTFW1ET5EFA12345',
      });
      assert.ok(capturedReq !== null, 'fetch was not called');
      const req = capturedReq as { url: string; method: string; body: string };
      assert.ok(req.url.includes('/sell/inventory/v1/inventory_item/SKU-001'));
      assert.equal(req.method, 'PUT');
      const parsed = JSON.parse(req.body) as { condition?: string; product?: { title?: string } };
      assert.ok(parsed.product?.title?.includes('2023 Ford F-150'));
      assert.equal(parsed.condition, 'USED_EXCELLENT');
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe('EbayListingClient.publishOffer', () => {
  it('POST /sell/inventory/v1/offer/:offerId/publish and returns listingId', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ listingId: 'EBAY-LIST-789' }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const listingId = await EbayListingClient.publishOffer('tok', 'offer-001');
      assert.equal(listingId, 'EBAY-LIST-789');
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe('EbayListingClient.getOffer', () => {
  it('returns null when no offers found', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ offers: [] }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const result = await EbayListingClient.getOffer('tok', 'SOME-SKU');
      assert.equal(result, null);
    } finally {
      globalThis.fetch = orig;
    }
  });

  it('returns null when API throws (e.g. 404)', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false,
      status: 404,
      text: async () => JSON.stringify({ errors: [{ message: 'No offers found' }] }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const result = await EbayListingClient.getOffer('tok', 'MISSING-SKU');
      assert.equal(result, null);
    } finally {
      globalThis.fetch = orig;
    }
  });

  it('returns the first offer when present', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ offers: [{ offerId: 'offer-abc', sku: 'SKU-001', status: 'PUBLISHED' }] }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const result = await EbayListingClient.getOffer('tok', 'SKU-001');
      assert.equal(result?.offerId, 'offer-abc');
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe('EbayListingClient.withdrawOffer', () => {
  it('calls POST /sell/inventory/v1/offer/:offerId/withdraw', async () => {
    let capturedUrl = '';
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      capturedUrl = String(url);
      return { ok: true, status: 204, text: async () => '' };
    }) as unknown as typeof globalThis.fetch;
    try {
      await EbayListingClient.withdrawOffer('tok', 'offer-XYZ');
      assert.ok(capturedUrl.includes('/offer/offer-XYZ/withdraw'));
    } finally {
      globalThis.fetch = orig;
    }
  });
});

// ── ContentPackageBuilder with vin ────────────────────────────────────────────

describe('ContentPackageBuilder.fromVehicle — vin in structuredData', () => {
  it('includes vin in structuredData when provided', () => {
    const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, {
      dealershipId: DEALER_ID,
      listingBaseUrl: 'http://localhost:3000',
    });
    assert.equal((pkg.structuredData as { vin?: string }).vin, '1FTFW1ET5EFA12345');
  });

  it('sets vin to null when not provided', () => {
    const noVin = { ...VEHICLE_INPUT };
    delete (noVin as Partial<VehicleInput>).vin;
    const pkg = ContentPackageBuilder.fromVehicle(noVin, {
      dealershipId: DEALER_ID,
      listingBaseUrl: 'http://localhost:3000',
    });
    assert.equal((pkg.structuredData as { vin?: unknown }).vin, null);
  });
});

// ── EbayListingBridge.upsertListing ──────────────────────────────────────────

describe('EbayListingBridge.upsertListing', () => {
  it('returns externalListingId and externalOfferId on success (no existing offer)', async () => {
    const orig = globalThis.fetch;
    let callCount = 0;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      callCount++;
      const u = String(url);
      if (u.includes('/inventory_item/')) return { ok: true, status: 204, text: async () => '' };
      if (u.includes('/offer?sku=')) {
        return { ok: true, status: 200, text: async () => JSON.stringify({ offers: [] }) };
      }
      if (init?.method === 'POST' && u.includes('/offer') && !u.includes('/publish')) {
        return { ok: true, status: 201, text: async () => JSON.stringify({ offerId: 'new-offer-001' }) };
      }
      if (u.includes('/publish')) {
        return { ok: true, status: 200, text: async () => JSON.stringify({ listingId: 'listing-001' }) };
      }
      return { ok: true, status: 200, text: async () => '{}' };
    }) as unknown as typeof globalThis.fetch;

    process.env['EBAY_FULFILLMENT_POLICY_ID'] = 'fulfill-123';
    process.env['EBAY_PAYMENT_POLICY_ID'] = 'pay-456';
    process.env['EBAY_RETURN_POLICY_ID'] = 'return-789';

    try {
      const bridge = new EbayListingBridge();
      const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, {
        dealershipId: DEALER_ID,
        listingBaseUrl: 'http://localhost:3000',
      });
      const result = await bridge.upsertListing('tok', pkg, {
        dealershipId: DEALER_ID,
        listingBaseUrl: 'http://localhost:3000',
      });
      assert.equal(result.externalListingId, 'listing-001');
      assert.equal(result.externalOfferId, 'new-offer-001');
      assert.ok(callCount >= 4, `expected at least 4 fetch calls (upsert, getOffer, createOffer, publish), got ${callCount}`);
    } finally {
      globalThis.fetch = orig;
    }
  });

  it('updates existing offer instead of creating', async () => {
    const orig = globalThis.fetch;
    const methodsSeen: string[] = [];
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      const u = String(url);
      const method = (init?.method ?? 'GET').toUpperCase();
      methodsSeen.push(`${method} ${u.split('/sell/inventory/v1/')[1] ?? u}`);
      if (u.includes('/inventory_item/')) return { ok: true, status: 204, text: async () => '' };
      if (u.includes('/offer?sku=')) {
        return { ok: true, status: 200, text: async () => JSON.stringify({ offers: [{ offerId: 'existing-offer', sku: 'FRD-ML-001', status: 'PUBLISHED' }] }) };
      }
      if (method === 'PUT' && u.includes('/offer/')) return { ok: true, status: 204, text: async () => '' };
      if (u.includes('/publish')) return { ok: true, status: 200, text: async () => JSON.stringify({ listingId: 'listing-002' }) };
      return { ok: true, status: 200, text: async () => '{}' };
    }) as unknown as typeof globalThis.fetch;

    try {
      const bridge = new EbayListingBridge();
      const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, {
        dealershipId: DEALER_ID,
        listingBaseUrl: 'http://localhost:3000',
      });
      const result = await bridge.upsertListing('tok', pkg, {
        dealershipId: DEALER_ID,
        listingBaseUrl: 'http://localhost:3000',
      });
      assert.equal(result.externalOfferId, 'existing-offer');
      assert.equal(result.externalListingId, 'listing-002');
      const hasUpdate = methodsSeen.some(m => m.startsWith('PUT offer/'));
      assert.ok(hasUpdate, `expected PUT to existing offer; calls: ${JSON.stringify(methodsSeen)}`);
    } finally {
      globalThis.fetch = orig;
    }
  });

  it('throws when policy env vars missing', async () => {
    delete process.env['EBAY_FULFILLMENT_POLICY_ID'];
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({ ok: true, status: 204, text: async () => '' })) as unknown as typeof globalThis.fetch;
    try {
      const bridge = new EbayListingBridge();
      const pkg = ContentPackageBuilder.fromVehicle(VEHICLE_INPUT, {
        dealershipId: DEALER_ID,
        listingBaseUrl: 'http://localhost:3000',
      });
      await assert.rejects(
        bridge.upsertListing('tok', pkg, { dealershipId: DEALER_ID, listingBaseUrl: 'http://localhost:3000' }),
        /EBAY_FULFILLMENT_POLICY_ID/
      );
    } finally {
      globalThis.fetch = orig;
      process.env['EBAY_FULFILLMENT_POLICY_ID'] = 'fulfill-123';
    }
  });
});

// ── MarketplaceListingStore unit tests ────────────────────────────────────────

describe('MarketplaceListingStore.upsert', () => {
  it('calls prisma.marketplaceListing.upsert with correct where clause', async () => {
    let capturedWhere: unknown = null;
    const fakePrisma = {
      marketplaceListing: {
        upsert: async (args: { where: unknown }) => {
          capturedWhere = args.where;
          return ACTIVE_LISTING;
        },
      },
    } as unknown as PrismaClient;

    await MarketplaceListingStore.upsert(fakePrisma, DEALER_ID, VEHICLE_ID, 'ebay-motors', { status: 'ACTIVE' });
    assert.deepEqual(capturedWhere, { vehicleId_platformSlug: { vehicleId: VEHICLE_ID, platformSlug: 'ebay-motors' } });
  });
});

describe('MarketplaceListingStore.findOne', () => {
  it('calls findUnique with composite key', async () => {
    let capturedWhere: unknown = null;
    const fakePrisma = {
      marketplaceListing: {
        findUnique: async (args: { where: unknown }) => {
          capturedWhere = args.where;
          return null;
        },
      },
    } as unknown as PrismaClient;

    await MarketplaceListingStore.findOne(fakePrisma, VEHICLE_ID, 'ebay-motors');
    assert.deepEqual(capturedWhere, { vehicleId_platformSlug: { vehicleId: VEHICLE_ID, platformSlug: 'ebay-motors' } });
  });
});

// ── HTTP route tests ──────────────────────────────────────────────────────────

describe('POST /listings — 400 when platform not supported', () => {
  it('returns 400 for unknown platform', async () => {
    const prisma = makePrisma();
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/cargurus-dealer/listings`,
      headers: authCookie(),
      payload: { vehicleId: VEHICLE_ID },
    });
    assert.equal(res.statusCode, 400);
  });
});

describe('POST /listings — 401 when unauthenticated', () => {
  it('returns 401 with no session', async () => {
    const prisma = makePrisma({ sessionExists: false });
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/ebay-motors/listings`,
      payload: { vehicleId: VEHICLE_ID },
    });
    assert.equal(res.statusCode, 401);
  });
});

describe('POST /listings — 400 when vehicleId missing', () => {
  it('returns 400 when body has no vehicleId', async () => {
    const prisma = makePrisma();
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/ebay-motors/listings`,
      headers: authCookie(),
      payload: {},
    });
    assert.equal(res.statusCode, 400);
  });
});

describe('POST /listings — 404 when vehicle not found', () => {
  it('returns 404 when vehicle row is null', async () => {
    const prisma = makePrisma({ vehicleRow: null });
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/ebay-motors/listings`,
      headers: authCookie(),
      payload: { vehicleId: VEHICLE_ID },
    });
    assert.equal(res.statusCode, 404);
  });
});

describe('POST /listings — 402 when no OAuth token', () => {
  it('returns 402 when no token row in DB', async () => {
    const prisma = makePrisma({ tokenRow: null });
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/ebay-motors/listings`,
      headers: authCookie(),
      payload: { vehicleId: VEHICLE_ID },
    });
    assert.equal(res.statusCode, 402);
  });
});

describe('POST /listings — 502 when eBay API fails', () => {
  it('returns 502 and FAILED listing record', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ errors: [{ message: 'eBay internal error' }] }),
    })) as unknown as typeof globalThis.fetch;

    const failedListing = { ...ACTIVE_LISTING, status: 'FAILED', errorMessage: 'eBay internal error' };
    const prisma = makePrisma({ upsertedListing: failedListing });

    process.env['EBAY_FULFILLMENT_POLICY_ID'] = 'fulfill-123';
    process.env['EBAY_PAYMENT_POLICY_ID'] = 'pay-456';
    process.env['EBAY_RETURN_POLICY_ID'] = 'return-789';

    try {
      const app = buildApp(prisma);
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/ebay-motors/listings`,
        headers: authCookie(),
        payload: { vehicleId: VEHICLE_ID },
      });
      assert.equal(res.statusCode, 502);
      const body = res.json() as { error?: string };
      assert.ok(typeof body.error === 'string', 'error field should be present');
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe('POST /listings — 201 on success', () => {
  it('returns 201 with ACTIVE listing', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      const u = String(url);
      const method = (init?.method ?? 'GET').toUpperCase();
      if (u.includes('/inventory_item/')) return { ok: true, status: 204, text: async () => '' };
      if (u.includes('/offer?sku=')) return { ok: true, status: 200, text: async () => JSON.stringify({ offers: [] }) };
      if (method === 'POST' && u.endsWith('/offer')) return { ok: true, status: 201, text: async () => JSON.stringify({ offerId: 'offer-abc' }) };
      if (u.includes('/publish')) return { ok: true, status: 200, text: async () => JSON.stringify({ listingId: 'listing-abc' }) };
      return { ok: true, status: 200, text: async () => '{}' };
    }) as unknown as typeof globalThis.fetch;

    process.env['EBAY_FULFILLMENT_POLICY_ID'] = 'fulfill-123';
    process.env['EBAY_PAYMENT_POLICY_ID'] = 'pay-456';
    process.env['EBAY_RETURN_POLICY_ID'] = 'return-789';

    try {
      const prisma = makePrisma();
      const app = buildApp(prisma);
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/ebay-motors/listings`,
        headers: authCookie(),
        payload: { vehicleId: VEHICLE_ID },
      });
      assert.equal(res.statusCode, 201, `expected 201, got ${res.statusCode}: ${res.body}`);
      const body = res.json() as { listing?: { status?: string } };
      assert.ok(body.listing, 'listing should be present in response');
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe('DELETE /listings/:vehicleId — 401 unauthenticated', () => {
  it('returns 401 with no session', async () => {
    const prisma = makePrisma({ sessionExists: false });
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/dealers/${DEALER_ID}/platforms/ebay-motors/listings/${VEHICLE_ID}`,
    });
    assert.equal(res.statusCode, 401);
  });
});

describe('DELETE /listings/:vehicleId — 404 when listing not found', () => {
  it('returns 404 when no listing row', async () => {
    const prisma = makePrisma({ existingListing: null });
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/dealers/${DEALER_ID}/platforms/ebay-motors/listings/${VEHICLE_ID}`,
      headers: authCookie(),
    });
    assert.equal(res.statusCode, 404);
  });
});

describe('DELETE /listings/:vehicleId — 409 when no offerId', () => {
  it('returns 409 when externalOfferId is null', async () => {
    const noOffer = { ...ACTIVE_LISTING, externalOfferId: null };
    const prisma = makePrisma({ existingListing: noOffer });
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/dealers/${DEALER_ID}/platforms/ebay-motors/listings/${VEHICLE_ID}`,
      headers: authCookie(),
    });
    assert.equal(res.statusCode, 409);
  });
});

describe('DELETE /listings/:vehicleId — 402 when no OAuth token', () => {
  it('returns 402 when no token', async () => {
    const prisma = makePrisma({ existingListing: ACTIVE_LISTING, tokenRow: null });
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'DELETE',
      url: `/api/dealers/${DEALER_ID}/platforms/ebay-motors/listings/${VEHICLE_ID}`,
      headers: authCookie(),
    });
    assert.equal(res.statusCode, 402);
  });
});

describe('DELETE /listings/:vehicleId — 204 on success', () => {
  it('calls withdrawOffer and returns 204', async () => {
    let withdrawCalled = false;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      if (String(url).includes('/withdraw')) withdrawCalled = true;
      return { ok: true, status: 204, text: async () => '' };
    }) as unknown as typeof globalThis.fetch;

    try {
      const prisma = makePrisma({ existingListing: ACTIVE_LISTING });
      const app = buildApp(prisma);
      const res = await app.inject({
        method: 'DELETE',
        url: `/api/dealers/${DEALER_ID}/platforms/ebay-motors/listings/${VEHICLE_ID}`,
        headers: authCookie(),
      });
      assert.equal(res.statusCode, 204, `expected 204, got ${res.statusCode}: ${res.body}`);
      assert.ok(withdrawCalled, 'withdrawOffer should have been called');
    } finally {
      globalThis.fetch = orig;
    }
  });
});

describe('GET /listings — returns listing array', () => {
  it('returns 200 with listings array', async () => {
    const prisma = makePrisma({ existingListing: ACTIVE_LISTING });
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/platforms/ebay-motors/listings`,
      headers: authCookie(),
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { listings?: unknown[] };
    assert.ok(Array.isArray(body.listings), 'listings should be an array');
  });
});

describe('GET /listings/:vehicleId — returns single listing', () => {
  it('returns 200 with listing', async () => {
    const prisma = makePrisma({ existingListing: ACTIVE_LISTING });
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/platforms/ebay-motors/listings/${VEHICLE_ID}`,
      headers: authCookie(),
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { listing?: { status?: string } };
    assert.equal(body.listing?.status, 'ACTIVE');
  });

  it('returns 404 when listing not found', async () => {
    const prisma = makePrisma({ existingListing: null });
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/platforms/ebay-motors/listings/${VEHICLE_ID}`,
      headers: authCookie(),
    });
    assert.equal(res.statusCode, 404);
  });
});

// ── Manifest consistency ──────────────────────────────────────────────────────

describe('LISTING_BRIDGE_SLUGS manifest consistency', () => {
  it('contains ebay-motors', () => {
    assert.ok(LISTING_BRIDGE_SLUGS.has('ebay-motors'), 'ebay-motors missing from LISTING_BRIDGE_SLUGS');
  });

  it('every bridge slug has marketplaceListing:true on its profile', () => {
    for (const slug of LISTING_BRIDGE_SLUGS) {
      const profile = platformProfiles.find(p => p.slug === slug);
      assert.ok(profile?.marketplaceListing, `${slug} is in LISTING_BRIDGE_SLUGS but missing marketplaceListing:true`);
    }
  });

  it('every bridge slug is in MARKETPLACE_LISTING_SLUGS', () => {
    for (const slug of LISTING_BRIDGE_SLUGS) {
      assert.ok(MARKETPLACE_LISTING_SLUGS.has(slug), `${slug} in LISTING_BRIDGE_SLUGS but not in MARKETPLACE_LISTING_SLUGS`);
    }
  });

  it('EbayListingBridge.platformSlug matches registry key', () => {
    const bridge = new EbayListingBridge();
    assert.equal(bridge.platformSlug, 'ebay-motors');
  });

  it('EbayListingBridge.oauthProvider matches profile oauthProvider', () => {
    const bridge = new EbayListingBridge();
    const profile = platformProfiles.find(p => p.slug === 'ebay-motors');
    assert.ok(profile, 'ebay-motors profile not found');
    assert.equal(bridge.oauthProvider, profile.oauthProvider);
  });
});
