// Phase C3 — Marketplace Favorites Route Tests
//
// Tests GET /api/marketplace/me/favorites,
//       POST /api/marketplace/me/favorites/:listingId, and
//       DELETE /api/marketplace/me/favorites/:listingId
// via Fastify inject. Prisma is stubbed per test; no real DB connection required.
//
// Design decisions exercised here:
//   • Sold/removed/unpriced vehicles are omitted from GET (not returned as unavailable).
//   • Favorites row is preserved when a vehicle becomes ineligible (so it can reappear).
//   • VIN is never selected by VEHICLE_CARD_SELECT — boundary is structural, not a filter.
//   • op_session never authenticates favorites routes (wrong cookie name).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import {
  createRawSessionToken,
  hashSessionToken,
} from '../services/auth/sessionService.js';
import { MARKETPLACE_SESSION_LIFETIME_MS } from '../services/auth/marketplaceSessionService.js';

// ── Fixture constants ─────────────────────────────────────────────────────────

const USER_ID     = 'mp-user-fav-001';
const LISTING_ID  = 'vehicle-fav-001';
const DEALER_ID   = 'dealer-fav-001';

// ── Fixture builders ──────────────────────────────────────────────────────────

function makeSessionRow(overrides: Partial<{
  revokedAt:  Date | null;
  expiresAt:  Date;
  isActive:   boolean;
}> = {}) {
  return {
    id:                'mp-sess-fav-001',
    tokenHash:         'irrelevant-mock',
    marketplaceUserId: USER_ID,
    createdAt:         new Date(),
    expiresAt:         overrides.expiresAt ?? new Date(Date.now() + MARKETPLACE_SESSION_LIFETIME_MS),
    revokedAt:         overrides.revokedAt ?? null,
    ipAddress:         null,
    userAgent:         null,
    user: {
      id:           USER_ID,
      email:        'shopper@example.local',
      displayName:  'Fav Shopper',
      isActive:     overrides.isActive ?? true,
      passwordHash: '[hash]',
      lastLoginAt:  null,
      createdAt:    new Date(),
      updatedAt:    new Date(),
    },
  };
}

function makeVehicleRow(overrides: Partial<{
  id:         string;
  priceCents: number;
  soldAt:     Date | null;
  removedAt:  Date | null;
}> = {}) {
  const id = overrides.id ?? LISTING_ID;
  return {
    id,
    dealershipId:  DEALER_ID,
    stockNumber:   'STOCK-001',
    year:          2023,
    make:          'Toyota',
    model:         'Camry',
    trim:          'SE',
    condition:     'USED',
    priceCents:    overrides.priceCents ?? 2_400_000,
    mileage:       28_000,
    exteriorColor: 'Silver',
    createdAt:     new Date('2024-01-01'),
    media:         [],
    dealership: {
      id:             DEALER_ID,
      legalName:      'Test Motors LLC',
      dbaName:        null,
      rooftopAddress: { city: 'Austin', state: 'TX' },
      websiteUrl:     null,
    },
  };
}

// ── Prisma stub builders ──────────────────────────────────────────────────────

function makeAuthPrisma(sessionRow: ReturnType<typeof makeSessionRow> | null): PrismaClient {
  return {
    marketplaceSession: {
      findUnique: async () => sessionRow,
    },
  } as unknown as PrismaClient;
}

function makeGetPrisma(
  sessionRow: ReturnType<typeof makeSessionRow> | null,
  vehicles: ReturnType<typeof makeVehicleRow>[],
): PrismaClient {
  return {
    marketplaceSession: { findUnique: async () => sessionRow },
    vehicle:            { findMany: async () => vehicles },
  } as unknown as PrismaClient;
}

function makePostPrisma(
  sessionRow: ReturnType<typeof makeSessionRow> | null,
  eligibleVehicle: ReturnType<typeof makeVehicleRow> | null,
): PrismaClient {
  return {
    marketplaceSession: { findUnique: async () => sessionRow },
    vehicle:            { findFirst: async () => eligibleVehicle },
    marketplaceFavorite: {
      upsert: async () => ({ marketplaceUserId: USER_ID, vehicleId: LISTING_ID }),
    },
  } as unknown as PrismaClient;
}

function makeDeletePrisma(
  sessionRow: ReturnType<typeof makeSessionRow> | null,
): PrismaClient {
  return {
    marketplaceSession: { findUnique: async () => sessionRow },
    marketplaceFavorite: {
      deleteMany: async () => ({ count: 1 }),
    },
  } as unknown as PrismaClient;
}

// Helper: inject with a valid mp_session cookie.
function cookieFor(rawToken: string): Record<string, string> {
  return { Cookie: `mp_session=${rawToken}` };
}

// ── Auth guard — GET ──────────────────────────────────────────────────────────

describe('GET /api/marketplace/me/favorites — auth guard', () => {
  it('returns 401 when no cookie is present', async () => {
    const app = buildApp(makeAuthPrisma(null));
    const res = await app.inject({ method: 'GET', url: '/api/marketplace/me/favorites' });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Marketplace authentication required' });
  });

  it('returns 401 when mp_session is invalid (not found)', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeAuthPrisma(null));
    const res = await app.inject({
      method: 'GET', url: '/api/marketplace/me/favorites',
      headers: cookieFor(rawToken),
    });
    assert.equal(res.statusCode, 401);
  });

  it('returns 401 when session is revoked', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeAuthPrisma(makeSessionRow({ revokedAt: new Date() })));
    const res = await app.inject({
      method: 'GET', url: '/api/marketplace/me/favorites',
      headers: cookieFor(rawToken),
    });
    assert.equal(res.statusCode, 401);
  });

  it('returns 401 when session is expired', async () => {
    const rawToken = createRawSessionToken();
    const past = new Date(Date.now() - 1000);
    const app  = buildApp(makeAuthPrisma(makeSessionRow({ expiresAt: past })));
    const res  = await app.inject({
      method: 'GET', url: '/api/marketplace/me/favorites',
      headers: cookieFor(rawToken),
    });
    assert.equal(res.statusCode, 401);
  });

  it('returns 401 when account is inactive', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeAuthPrisma(makeSessionRow({ isActive: false })));
    const res = await app.inject({
      method: 'GET', url: '/api/marketplace/me/favorites',
      headers: cookieFor(rawToken),
    });
    assert.equal(res.statusCode, 401);
  });

  it('op_session cookie cannot authenticate favorites GET', async () => {
    // Route reads mp_session — op_session is ignored → no token → 401.
    const rawToken = createRawSessionToken();
    const app = buildApp({} as unknown as PrismaClient);
    const res = await app.inject({
      method: 'GET', url: '/api/marketplace/me/favorites',
      headers: { Cookie: `op_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Marketplace authentication required' });
  });
});

// ── Auth guard — POST ─────────────────────────────────────────────────────────

describe('POST /api/marketplace/me/favorites/:listingId — auth guard', () => {
  it('returns 401 without mp_session', async () => {
    const app = buildApp(makeAuthPrisma(null));
    const res = await app.inject({
      method: 'POST', url: `/api/marketplace/me/favorites/${LISTING_ID}`,
    });
    assert.equal(res.statusCode, 401);
  });

  it('op_session cookie cannot authenticate favorites POST', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp({} as unknown as PrismaClient);
    const res = await app.inject({
      method: 'POST', url: `/api/marketplace/me/favorites/${LISTING_ID}`,
      headers: { Cookie: `op_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Marketplace authentication required' });
  });
});

// ── Auth guard — DELETE ───────────────────────────────────────────────────────

describe('DELETE /api/marketplace/me/favorites/:listingId — auth guard', () => {
  it('returns 401 without mp_session', async () => {
    const app = buildApp(makeAuthPrisma(null));
    const res = await app.inject({
      method: 'DELETE', url: `/api/marketplace/me/favorites/${LISTING_ID}`,
    });
    assert.equal(res.statusCode, 401);
  });

  it('op_session cookie cannot authenticate favorites DELETE', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp({} as unknown as PrismaClient);
    const res = await app.inject({
      method: 'DELETE', url: `/api/marketplace/me/favorites/${LISTING_ID}`,
      headers: { Cookie: `op_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Marketplace authentication required' });
  });
});

// ── GET /api/marketplace/me/favorites — success ───────────────────────────────

describe('GET /api/marketplace/me/favorites — success', () => {
  it('returns 200 with favorites array and total', async () => {
    const rawToken   = createRawSessionToken();
    const tokenHash  = hashSessionToken(rawToken);
    const sessionRow = { ...makeSessionRow(), tokenHash };
    const vehicle    = makeVehicleRow();
    const app        = buildApp(makeGetPrisma(sessionRow, [vehicle]));
    const res        = await app.inject({
      method: 'GET', url: '/api/marketplace/me/favorites',
      headers: cookieFor(rawToken),
    });
    assert.equal(res.statusCode, 200, `expected 200, got ${res.statusCode}: ${res.body}`);
    const body = res.json() as { favorites: unknown[]; total: number };
    assert.ok(Array.isArray(body.favorites), 'favorites must be an array');
    assert.equal(body.favorites.length, 1);
    assert.equal(body.total, 1);
  });

  it('returns empty favorites array when user has no eligible favorites', async () => {
    const rawToken   = createRawSessionToken();
    const sessionRow = makeSessionRow();
    const app        = buildApp(makeGetPrisma(sessionRow, []));
    const res        = await app.inject({
      method: 'GET', url: '/api/marketplace/me/favorites',
      headers: cookieFor(rawToken),
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { favorites: unknown[]; total: number };
    assert.deepEqual(body.favorites, []);
    assert.equal(body.total, 0);
  });

  it('response does not contain VIN on any vehicle card', async () => {
    const rawToken   = createRawSessionToken();
    const sessionRow = makeSessionRow();
    const vehicle    = makeVehicleRow();
    const app        = buildApp(makeGetPrisma(sessionRow, [vehicle]));
    const res        = await app.inject({
      method: 'GET', url: '/api/marketplace/me/favorites',
      headers: cookieFor(rawToken),
    });
    const body = res.json() as { favorites: Record<string, unknown>[] };
    for (const card of body.favorites) {
      assert.ok(!('vin' in card), `VIN must not appear in favorites card: ${JSON.stringify(card)}`);
    }
  });

  it('vehicle card contains no operator/internal fields', async () => {
    const rawToken   = createRawSessionToken();
    const sessionRow = makeSessionRow();
    const vehicle    = makeVehicleRow();
    const app        = buildApp(makeGetPrisma(sessionRow, [vehicle]));
    const res        = await app.inject({
      method: 'GET', url: '/api/marketplace/me/favorites',
      headers: cookieFor(rawToken),
    });
    const body = res.json() as { favorites: Record<string, unknown>[] };
    const card = body.favorites[0]!;
    assert.ok(!('syncEvents'      in card), 'must not expose syncEvents');
    assert.ok(!('publishQueue'    in card), 'must not expose publishQueue');
    assert.ok(!('applications'    in card), 'must not expose applications');
    assert.ok(!('performanceCache' in card), 'must not expose performanceCache');
    assert.ok(!('subscription'    in card), 'must not expose subscription');
    assert.ok(!('passwordHash'    in card), 'must not expose passwordHash');
    assert.ok(!('readinessScore'  in card), 'must not expose readinessScore');
  });

  it('vehicle card has expected marketplace fields', async () => {
    const rawToken   = createRawSessionToken();
    const sessionRow = makeSessionRow();
    const vehicle    = makeVehicleRow();
    const app        = buildApp(makeGetPrisma(sessionRow, [vehicle]));
    const res        = await app.inject({
      method: 'GET', url: '/api/marketplace/me/favorites',
      headers: cookieFor(rawToken),
    });
    const body = res.json() as { favorites: Record<string, unknown>[] };
    const card = body.favorites[0]!;
    assert.ok('listingId'    in card, 'card must have listingId');
    assert.ok('year'         in card, 'card must have year');
    assert.ok('make'         in card, 'card must have make');
    assert.ok('model'        in card, 'card must have model');
    assert.ok('priceCents'   in card, 'card must have priceCents');
    assert.ok('mileage'      in card, 'card must have mileage');
    assert.ok('mediaUrls'    in card, 'card must have mediaUrls');
    assert.ok('dealerId'     in card, 'card must have dealerId');
    assert.ok('listingUrl'   in card, 'card must have listingUrl');
  });

  it('GET result contains no mp_session user identity fields', async () => {
    const rawToken   = createRawSessionToken();
    const sessionRow = makeSessionRow();
    const vehicle    = makeVehicleRow();
    const app        = buildApp(makeGetPrisma(sessionRow, [vehicle]));
    const res        = await app.inject({
      method: 'GET', url: '/api/marketplace/me/favorites',
      headers: cookieFor(rawToken),
    });
    const body = res.json() as Record<string, unknown>;
    // Response shape is { favorites, total } — not identity fields
    assert.ok(!('email'       in body), 'GET response must not expose email');
    assert.ok(!('displayName' in body), 'GET response must not expose displayName');
  });
});

// ── POST /api/marketplace/me/favorites/:listingId — success ──────────────────

describe('POST /api/marketplace/me/favorites/:listingId — success', () => {
  it('returns 200 with favorited:true on successful add', async () => {
    const rawToken   = createRawSessionToken();
    const sessionRow = makeSessionRow();
    const vehicle    = makeVehicleRow();
    const app        = buildApp(makePostPrisma(sessionRow, vehicle));
    const res        = await app.inject({
      method: 'POST', url: `/api/marketplace/me/favorites/${LISTING_ID}`,
      headers: cookieFor(rawToken),
    });
    assert.equal(res.statusCode, 200, `expected 200, got ${res.statusCode}: ${res.body}`);
    const body = res.json() as { favorited: boolean; listingId: string };
    assert.equal(body.favorited, true);
    assert.equal(body.listingId, LISTING_ID);
  });

  it('adding same listing twice is idempotent (both return 200)', async () => {
    const rawToken   = createRawSessionToken();
    const sessionRow = makeSessionRow();
    const vehicle    = makeVehicleRow();

    // First call
    const app1 = buildApp(makePostPrisma(sessionRow, vehicle));
    const res1 = await app1.inject({
      method: 'POST', url: `/api/marketplace/me/favorites/${LISTING_ID}`,
      headers: cookieFor(rawToken),
    });
    assert.equal(res1.statusCode, 200);

    // Second call (same behavior — upsert no-ops in the DB)
    const app2 = buildApp(makePostPrisma(sessionRow, vehicle));
    const res2 = await app2.inject({
      method: 'POST', url: `/api/marketplace/me/favorites/${LISTING_ID}`,
      headers: cookieFor(rawToken),
    });
    assert.equal(res2.statusCode, 200);
    assert.deepEqual(res1.json(), res2.json(), 'second add must return same body as first');
  });
});

// ── POST — ineligible listings ────────────────────────────────────────────────

describe('POST /api/marketplace/me/favorites/:listingId — ineligible', () => {
  it('returns 404 when listing does not exist', async () => {
    const rawToken   = createRawSessionToken();
    const sessionRow = makeSessionRow();
    const app        = buildApp(makePostPrisma(sessionRow, null)); // vehicle not found
    const res        = await app.inject({
      method: 'POST', url: '/api/marketplace/me/favorites/nonexistent-id',
      headers: cookieFor(rawToken),
    });
    assert.equal(res.statusCode, 404);
    const body = res.json() as { error: string };
    assert.ok(body.error.length > 0, 'error message must be non-empty');
  });

  it('returns 404 for a sold vehicle (not eligible)', async () => {
    const rawToken   = createRawSessionToken();
    const sessionRow = makeSessionRow();
    // Sold vehicle: eligibility check returns null (soldAt filter excludes it)
    const app = buildApp(makePostPrisma(sessionRow, null));
    const res = await app.inject({
      method: 'POST', url: `/api/marketplace/me/favorites/${LISTING_ID}`,
      headers: cookieFor(rawToken),
    });
    assert.equal(res.statusCode, 404);
  });

  it('returns 404 for a removed vehicle (not eligible)', async () => {
    const rawToken   = createRawSessionToken();
    const sessionRow = makeSessionRow();
    const app = buildApp(makePostPrisma(sessionRow, null)); // removedAt filter excludes it
    const res = await app.inject({
      method: 'POST', url: `/api/marketplace/me/favorites/${LISTING_ID}`,
      headers: cookieFor(rawToken),
    });
    assert.equal(res.statusCode, 404);
  });

  it('returns 404 for an unpriced vehicle (priceCents = 0)', async () => {
    const rawToken   = createRawSessionToken();
    const sessionRow = makeSessionRow();
    // Unpriced: findFirst with priceCents > 0 returns null
    const app = buildApp(makePostPrisma(sessionRow, null));
    const res = await app.inject({
      method: 'POST', url: `/api/marketplace/me/favorites/${LISTING_ID}`,
      headers: cookieFor(rawToken),
    });
    assert.equal(res.statusCode, 404);
  });
});

// ── DELETE /api/marketplace/me/favorites/:listingId ───────────────────────────

describe('DELETE /api/marketplace/me/favorites/:listingId', () => {
  it('returns 200 with ok:true when favorite exists', async () => {
    const rawToken   = createRawSessionToken();
    const sessionRow = makeSessionRow();
    const app        = buildApp(makeDeletePrisma(sessionRow));
    const res        = await app.inject({
      method: 'DELETE', url: `/api/marketplace/me/favorites/${LISTING_ID}`,
      headers: cookieFor(rawToken),
    });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { ok: true });
  });

  it('returns 200 even when favorite does not exist (idempotent)', async () => {
    const rawToken   = createRawSessionToken();
    const sessionRow = makeSessionRow();
    // deleteMany with count: 0 — no-op, but still 200
    const prisma = {
      marketplaceSession: { findUnique: async () => sessionRow },
      marketplaceFavorite: { deleteMany: async () => ({ count: 0 }) },
    } as unknown as PrismaClient;
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'DELETE', url: `/api/marketplace/me/favorites/never-favorited`,
      headers: cookieFor(rawToken),
    });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { ok: true });
  });

  it('calling DELETE twice returns 200 both times (idempotent)', async () => {
    const rawToken   = createRawSessionToken();
    const sessionRow = makeSessionRow();

    const app1 = buildApp(makeDeletePrisma(sessionRow));
    const res1 = await app1.inject({
      method: 'DELETE', url: `/api/marketplace/me/favorites/${LISTING_ID}`,
      headers: cookieFor(rawToken),
    });
    assert.equal(res1.statusCode, 200);

    const app2 = buildApp(makeDeletePrisma(sessionRow));
    const res2 = await app2.inject({
      method: 'DELETE', url: `/api/marketplace/me/favorites/${LISTING_ID}`,
      headers: cookieFor(rawToken),
    });
    assert.equal(res2.statusCode, 200);
    assert.deepEqual(res1.json(), res2.json());
  });
});

// ── Marketplace boundary check ────────────────────────────────────────────────
// mp_session cannot authenticate operator routes, and vice versa.

describe('cross-domain isolation — favorites routes', () => {
  it('mp_session cookie cannot authenticate GET /api/auth/me (operator route)', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp({} as unknown as PrismaClient);
    const res = await app.inject({
      method: 'GET', url: '/api/auth/me',
      headers: { Cookie: `mp_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Operator authentication required' });
  });

  it('favorites routes are unreachable with no auth (not public routes)', async () => {
    const app = buildApp({} as unknown as PrismaClient);
    for (const { method, url } of [
      { method: 'GET',    url: '/api/marketplace/me/favorites' },
      { method: 'POST',   url: `/api/marketplace/me/favorites/${LISTING_ID}` },
      { method: 'DELETE', url: `/api/marketplace/me/favorites/${LISTING_ID}` },
    ]) {
      const res = await app.inject({ method: method as 'GET', url });
      assert.equal(res.statusCode, 401,
        `${method} ${url} must require auth, got ${res.statusCode}`);
    }
  });
});
