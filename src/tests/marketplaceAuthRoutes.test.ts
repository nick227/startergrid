// Phase C2 — Marketplace Auth Route Tests
//
// Tests POST /api/marketplace/auth/login, POST /api/marketplace/auth/logout, and
// GET /api/marketplace/auth/me via Fastify inject. Prisma is stubbed per test;
// no real DB connection is required.
//
// Cross-domain isolation tests prove that op_session cannot authenticate
// marketplace me, and mp_session cannot authenticate operator me.

import assert from 'node:assert/strict';
import { describe, it, before } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { hashPassword } from '../services/auth/passwordService.js';
import {
  hashSessionToken,
  createRawSessionToken,
} from '../services/auth/sessionService.js';
import { MARKETPLACE_SESSION_LIFETIME_MS } from '../services/auth/marketplaceSessionService.js';

// ── Fixture constants ─────────────────────────────────────────────────────────

const TEST_EMAIL    = 'shopper@example.local';
const TEST_PASSWORD = 'correct-horse-battery-stable';
const USER_ID       = 'mp-user-test-001';

// ── Fixture builders ──────────────────────────────────────────────────────────

function makeUser(overrides: Partial<{
  id:           string;
  email:        string;
  displayName:  string | null;
  passwordHash: string;
  isActive:     boolean;
}> = {}) {
  return {
    id:           overrides.id          ?? USER_ID,
    email:        overrides.email       ?? TEST_EMAIL,
    displayName:  'displayName' in overrides ? overrides.displayName : 'Test Shopper',
    passwordHash: overrides.passwordHash ?? '[hash-placeholder]',
    isActive:     overrides.isActive    ?? true,
    lastLoginAt:  null,
    createdAt:    new Date(),
    updatedAt:    new Date(),
  };
}

function makeSessionRow(overrides: Partial<{
  revokedAt:   Date | null;
  expiresAt:   Date;
  isActive:    boolean;
  displayName: string | null;
}> = {}) {
  return {
    id:                'mp-sess-test-001',
    tokenHash:         'irrelevant-mock',
    marketplaceUserId: USER_ID,
    createdAt:         new Date(),
    expiresAt:         overrides.expiresAt ?? new Date(Date.now() + MARKETPLACE_SESSION_LIFETIME_MS),
    revokedAt:         overrides.revokedAt ?? null,
    ipAddress:         null,
    userAgent:         null,
    user: makeUser({
      isActive:    overrides.isActive    ?? true,
      displayName: 'displayName' in overrides ? overrides.displayName : 'Test Shopper',
    }),
  };
}

function makeLoginPrisma(user: ReturnType<typeof makeUser> | null): PrismaClient {
  return {
    marketplaceUser: {
      findUnique: async () => user,
      update:     async () => user ?? {},
    },
    marketplaceSession: {
      create: async () => ({ id: 'mp-sess-test-001' }),
    },
  } as unknown as PrismaClient;
}

function makeRegisterPrisma(opts: {
  existingUser?: ReturnType<typeof makeUser> | null;
  createdUser?: ReturnType<typeof makeUser>;
} = {}): PrismaClient {
  const createdUser = opts.createdUser ?? makeUser();
  return {
    marketplaceUser: {
      findUnique: async () => opts.existingUser ?? null,
      create: async (args: { data: Record<string, unknown> }) => ({
        ...createdUser,
        email: args.data['email'] as string,
        displayName: (args.data['displayName'] as string | null | undefined) ?? null,
        passwordHash: args.data['passwordHash'] as string,
      }),
      update: async () => createdUser,
    },
    marketplaceSession: {
      create: async () => ({ id: 'mp-sess-test-001' }),
    },
  } as unknown as PrismaClient;
}

function makeLogoutPrisma(): PrismaClient {
  return {
    marketplaceSession: {
      updateMany: async () => ({ count: 1 }),
    },
  } as unknown as PrismaClient;
}

function makeMePrisma(sessionRow: ReturnType<typeof makeSessionRow> | null): PrismaClient {
  return {
    marketplaceSession: {
      findUnique: async () => sessionRow,
    },
  } as unknown as PrismaClient;
}

function makeProfileUpdatePrisma(opts: {
  sessionRow?: ReturnType<typeof makeSessionRow> | null;
  user?: ReturnType<typeof makeUser> | null;
  onUpdate?: (data: Record<string, unknown>) => void;
} = {}): PrismaClient {
  const sessionRow = 'sessionRow' in opts ? opts.sessionRow : makeSessionRow();
  const user = 'user' in opts ? opts.user : makeUser();
  return {
    marketplaceSession: {
      findUnique: async () => sessionRow,
    },
    marketplaceUser: {
      findUnique: async () => user,
      update: async (args: { data: Record<string, unknown> }) => {
        opts.onUpdate?.(args.data);
        return {
          id: USER_ID,
          email: TEST_EMAIL,
          displayName: Object.prototype.hasOwnProperty.call(args.data, 'displayName')
            ? args.data['displayName']
            : user?.displayName ?? null,
        };
      },
    },
  } as unknown as PrismaClient;
}

// ── POST /api/marketplace/auth/register ──────────────────────────────────────

describe('POST /api/marketplace/auth/register', () => {
  it('returns 200 with consumer identity and sets mp_session cookie', async () => {
    const app = buildApp(makeRegisterPrisma());
    const res = await app.inject({
      method: 'POST',
      url: '/api/marketplace/auth/register',
      payload: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
        displayName: 'Test Shopper',
      },
    });

    assert.equal(res.statusCode, 200, `expected 200, got ${res.statusCode}: ${res.body}`);
    const body = res.json() as Record<string, unknown>;
    assert.equal(body['id'], USER_ID);
    assert.equal(body['email'], TEST_EMAIL);
    assert.equal(body['displayName'], 'Test Shopper');

    const setCookie = res.headers['set-cookie'] as string | string[] | undefined;
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    assert.ok(cookie?.startsWith('mp_session='));
    assert.ok(cookie?.includes('HttpOnly'));
  });

  it('normalizes email to lowercase before persistence and response', async () => {
    const app = buildApp(makeRegisterPrisma());
    const res = await app.inject({
      method: 'POST',
      url: '/api/marketplace/auth/register',
      payload: {
        email: 'Shopper@Example.Local',
        password: TEST_PASSWORD,
      },
    });

    assert.equal(res.statusCode, 200);
    const body = res.json() as Record<string, unknown>;
    assert.equal(body['email'], 'shopper@example.local');
  });

  it('returns 409 when the email already exists', async () => {
    const app = buildApp(makeRegisterPrisma({
      existingUser: makeUser(),
    }));
    const res = await app.inject({
      method: 'POST',
      url: '/api/marketplace/auth/register',
      payload: {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      },
    });

    assert.equal(res.statusCode, 409);
    assert.deepEqual(res.json(), { error: 'An account with that email already exists' });
  });

  it('returns 400 on invalid email', async () => {
    const app = buildApp(makeRegisterPrisma());
    const res = await app.inject({
      method: 'POST',
      url: '/api/marketplace/auth/register',
      payload: {
        email: 'nope',
        password: TEST_PASSWORD,
      },
    });
    assert.equal(res.statusCode, 400);
  });

  it('returns 400 on short password', async () => {
    const app = buildApp(makeRegisterPrisma());
    const res = await app.inject({
      method: 'POST',
      url: '/api/marketplace/auth/register',
      payload: {
        email: TEST_EMAIL,
        password: 'short',
      },
    });
    assert.equal(res.statusCode, 400);
  });
});

// ── POST /api/marketplace/auth/login — success ────────────────────────────────

describe('POST /api/marketplace/auth/login — success', () => {
  let testHash = '';
  before(async () => { testHash = await hashPassword(TEST_PASSWORD); });

  it('returns 200 with consumer identity', async () => {
    const user = makeUser({ passwordHash: testHash });
    const app  = buildApp(makeLoginPrisma(user));
    const res  = await app.inject({
      method: 'POST', url: '/api/marketplace/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    assert.equal(res.statusCode, 200, `expected 200, got ${res.statusCode}: ${res.body}`);
    const body = res.json() as Record<string, unknown>;
    assert.equal(body['id'],    USER_ID);
    assert.equal(body['email'], TEST_EMAIL);
    assert.ok('displayName' in body, 'response must include displayName');
  });

  it('response body contains no passwordHash or tokenHash', async () => {
    const user = makeUser({ passwordHash: testHash });
    const app  = buildApp(makeLoginPrisma(user));
    const res  = await app.inject({
      method: 'POST', url: '/api/marketplace/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    const body = res.json() as Record<string, unknown>;
    assert.ok(!('passwordHash' in body), 'response must not include passwordHash');
    assert.ok(!('tokenHash'    in body), 'response must not include tokenHash');
    assert.ok(!('isActive'     in body), 'response must not include isActive');
  });

  it('response body contains no operator fields', async () => {
    const user = makeUser({ passwordHash: testHash });
    const app  = buildApp(makeLoginPrisma(user));
    const res  = await app.inject({
      method: 'POST', url: '/api/marketplace/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    const body = res.json() as Record<string, unknown>;
    assert.ok(!('role'            in body), 'response must not include operator role');
    assert.ok(!('dealerAccessIds' in body), 'response must not include dealerAccessIds');
  });

  it('sets mp_session HttpOnly cookie with correct attributes', async () => {
    const user = makeUser({ passwordHash: testHash });
    const app  = buildApp(makeLoginPrisma(user));
    const res  = await app.inject({
      method: 'POST', url: '/api/marketplace/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    const setCookie = res.headers['set-cookie'] as string | string[] | undefined;
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    assert.ok(cookie?.startsWith('mp_session='),   `cookie must start with mp_session=, got: ${cookie}`);
    assert.ok(cookie?.includes('HttpOnly'),         'cookie must be HttpOnly');
    assert.ok(cookie?.includes('SameSite=Strict'), 'cookie must be SameSite=Strict');
    assert.ok(cookie?.includes('Path=/api/marketplace'), 'cookie must have Path=/api/marketplace');
    assert.ok(cookie?.includes('Max-Age='),         'cookie must have Max-Age');
  });

  it('cookie Max-Age is 30 days (2592000 seconds)', async () => {
    const user = makeUser({ passwordHash: testHash });
    const app  = buildApp(makeLoginPrisma(user));
    const res  = await app.inject({
      method: 'POST', url: '/api/marketplace/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    const setCookie = res.headers['set-cookie'] as string | string[] | undefined;
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    assert.ok(cookie?.includes('Max-Age=2592000'), `cookie Max-Age must be 2592000, got: ${cookie}`);
  });

  it('cookie does not include Secure flag in non-production', async () => {
    const user = makeUser({ passwordHash: testHash });
    const app  = buildApp(makeLoginPrisma(user));
    const res  = await app.inject({
      method: 'POST', url: '/api/marketplace/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    const setCookie = res.headers['set-cookie'] as string | string[] | undefined;
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    assert.ok(!cookie?.includes('; Secure'), `Secure flag must not be set in non-production, got: ${cookie}`);
  });
});

// ── POST /api/marketplace/auth/login — rejection cases ───────────────────────

describe('POST /api/marketplace/auth/login — rejection cases', () => {
  let testHash = '';
  before(async () => { testHash = await hashPassword(TEST_PASSWORD); });

  it('returns 400 on missing email', async () => {
    const app = buildApp(makeLoginPrisma(null));
    const res = await app.inject({
      method: 'POST', url: '/api/marketplace/auth/login',
      payload: { password: TEST_PASSWORD },
    });
    assert.equal(res.statusCode, 400);
  });

  it('returns 400 on missing password', async () => {
    const app = buildApp(makeLoginPrisma(null));
    const res = await app.inject({
      method: 'POST', url: '/api/marketplace/auth/login',
      payload: { email: TEST_EMAIL },
    });
    assert.equal(res.statusCode, 400);
  });

  it('returns 400 on password shorter than 8 chars', async () => {
    const app = buildApp(makeLoginPrisma(null));
    const res = await app.inject({
      method: 'POST', url: '/api/marketplace/auth/login',
      payload: { email: TEST_EMAIL, password: 'short' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('returns 401 for unknown email — same message as wrong password', async () => {
    const app = buildApp(makeLoginPrisma(null));
    const res = await app.inject({
      method: 'POST', url: '/api/marketplace/auth/login',
      payload: { email: 'nobody@example.com', password: TEST_PASSWORD },
    });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Invalid email or password' });
  });

  it('returns 401 for wrong password — same message as unknown email', async () => {
    const user = makeUser({ passwordHash: testHash });
    const app  = buildApp(makeLoginPrisma(user));
    const res  = await app.inject({
      method: 'POST', url: '/api/marketplace/auth/login',
      payload: { email: TEST_EMAIL, password: 'wrong-password-xyz' },
    });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Invalid email or password' });
  });

  it('both unknown-email and wrong-password return identical error bodies', async () => {
    const user = makeUser({ passwordHash: testHash });

    const unknownEmailApp = buildApp(makeLoginPrisma(null));
    const unknownEmailRes = await unknownEmailApp.inject({
      method: 'POST', url: '/api/marketplace/auth/login',
      payload: { email: 'nobody@example.com', password: TEST_PASSWORD },
    });

    const wrongPassApp = buildApp(makeLoginPrisma(user));
    const wrongPassRes = await wrongPassApp.inject({
      method: 'POST', url: '/api/marketplace/auth/login',
      payload: { email: TEST_EMAIL, password: 'wrong-password-xyz' },
    });

    assert.deepEqual(unknownEmailRes.json(), wrongPassRes.json(),
      'unknown-email and wrong-password must return identical error bodies');
  });

  it('returns 401 for inactive user', async () => {
    const user = makeUser({ passwordHash: testHash, isActive: false });
    const app  = buildApp(makeLoginPrisma(user));
    const res  = await app.inject({
      method: 'POST', url: '/api/marketplace/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Account is inactive' });
  });
});

// ── POST /api/marketplace/auth/logout ────────────────────────────────────────

describe('POST /api/marketplace/auth/logout', () => {
  it('returns 200 with ok:true and clears the cookie', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeLogoutPrisma());
    const res = await app.inject({
      method: 'POST', url: '/api/marketplace/auth/logout',
      headers: { Cookie: `mp_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { ok: true });

    const setCookie = res.headers['set-cookie'] as string | string[] | undefined;
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    assert.ok(cookie?.includes('mp_session=;'), 'cookie value must be cleared (empty after =)');
    assert.ok(cookie?.includes('Max-Age=0'),    'Max-Age must be 0 to expire the cookie');
  });

  it('returns 200 even when no mp_session cookie is present (idempotent)', async () => {
    const app = buildApp(makeLogoutPrisma());
    const res = await app.inject({ method: 'POST', url: '/api/marketplace/auth/logout' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { ok: true });
  });
});

// ── GET /api/marketplace/auth/me — authenticated ─────────────────────────────

describe('GET /api/marketplace/auth/me — authenticated', () => {
  it('returns 200 with consumer identity for a valid session', async () => {
    const rawToken   = createRawSessionToken();
    const tokenHash  = hashSessionToken(rawToken);
    const sessionRow = { ...makeSessionRow(), tokenHash };
    const app = buildApp(makeMePrisma(sessionRow));
    const res = await app.inject({
      method: 'GET', url: '/api/marketplace/auth/me',
      headers: { Cookie: `mp_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 200, `expected 200, got ${res.statusCode}: ${res.body}`);
    const body = res.json() as Record<string, unknown>;
    assert.equal(body['id'],    USER_ID);
    assert.equal(body['email'], TEST_EMAIL);
    assert.ok('displayName' in body);
  });

  it('response does not contain passwordHash or tokenHash', async () => {
    const rawToken = createRawSessionToken();
    const app      = buildApp(makeMePrisma(makeSessionRow()));
    const res      = await app.inject({
      method: 'GET', url: '/api/marketplace/auth/me',
      headers: { Cookie: `mp_session=${rawToken}` },
    });
    const body = res.json() as Record<string, unknown>;
    assert.ok(!('passwordHash' in body), 'me response must not include passwordHash');
    assert.ok(!('tokenHash'    in body), 'me response must not include tokenHash');
  });

  it('response does not contain operator fields', async () => {
    const rawToken = createRawSessionToken();
    const app      = buildApp(makeMePrisma(makeSessionRow()));
    const res      = await app.inject({
      method: 'GET', url: '/api/marketplace/auth/me',
      headers: { Cookie: `mp_session=${rawToken}` },
    });
    const body = res.json() as Record<string, unknown>;
    assert.ok(!('role'            in body), 'me response must not include operator role');
    assert.ok(!('dealerAccessIds' in body), 'me response must not include dealerAccessIds');
    assert.ok(!('devHeader'       in body), 'me response must not include devHeader');
    assert.ok(!('isActive'        in body), 'me response must not expose isActive');
  });

  it('displayName may be null', async () => {
    const rawToken = createRawSessionToken();
    const app      = buildApp(makeMePrisma(makeSessionRow({ displayName: null })));
    const res      = await app.inject({
      method: 'GET', url: '/api/marketplace/auth/me',
      headers: { Cookie: `mp_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { displayName: unknown };
    assert.equal(body.displayName, null);
  });
});

// ── PATCH /api/marketplace/auth/me ───────────────────────────────────────────

describe('PATCH /api/marketplace/auth/me', () => {
  it('updates displayName and returns a safe consumer identity', async () => {
    let updated: Record<string, unknown> | null = null;
    const rawToken = createRawSessionToken();
    const app = buildApp(makeProfileUpdatePrisma({
      onUpdate: data => { updated = data; },
    }));

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/marketplace/auth/me',
      headers: { Cookie: `mp_session=${rawToken}` },
      payload: { displayName: 'New Shopper' },
    });

    assert.equal(res.statusCode, 200, `expected 200, got ${res.statusCode}: ${res.body}`);
    assert.deepEqual(res.json(), {
      id: USER_ID,
      email: TEST_EMAIL,
      displayName: 'New Shopper',
    });
    assert.equal(updated?.['displayName'], 'New Shopper');
    assert.ok(!('passwordHash' in res.json()), 'profile update response must not include passwordHash');
  });

  it('requires the current password before changing password', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeProfileUpdatePrisma());

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/marketplace/auth/me',
      headers: { Cookie: `mp_session=${rawToken}` },
      payload: { newPassword: 'new-password-value' },
    });

    assert.equal(res.statusCode, 400);
  });

  it('returns 401 when the current password is wrong', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeProfileUpdatePrisma({
      user: makeUser({ passwordHash: await hashPassword(TEST_PASSWORD) }),
    }));

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/marketplace/auth/me',
      headers: { Cookie: `mp_session=${rawToken}` },
      payload: {
        currentPassword: 'wrong-password-value',
        newPassword: 'new-password-value',
      },
    });

    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Current password is incorrect' });
  });

  it('updates the password hash when the current password is correct', async () => {
    let updated: Record<string, unknown> | null = null;
    const rawToken = createRawSessionToken();
    const app = buildApp(makeProfileUpdatePrisma({
      user: makeUser({ passwordHash: await hashPassword(TEST_PASSWORD) }),
      onUpdate: data => { updated = data; },
    }));

    const res = await app.inject({
      method: 'PATCH',
      url: '/api/marketplace/auth/me',
      headers: { Cookie: `mp_session=${rawToken}` },
      payload: {
        currentPassword: TEST_PASSWORD,
        newPassword: 'new-password-value',
      },
    });

    assert.equal(res.statusCode, 200, `expected 200, got ${res.statusCode}: ${res.body}`);
    assert.equal(typeof updated?.['passwordHash'], 'string');
    assert.notEqual(updated?.['passwordHash'], TEST_PASSWORD);
  });
});

// ── GET /api/marketplace/auth/me — rejection cases ───────────────────────────

describe('GET /api/marketplace/auth/me — rejection cases', () => {
  it('returns 401 when no cookie is present', async () => {
    const app = buildApp(makeMePrisma(null));
    const res = await app.inject({ method: 'GET', url: '/api/marketplace/auth/me' });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Marketplace authentication required' });
  });

  it('returns 401 when session row is not found', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeMePrisma(null));
    const res = await app.inject({
      method: 'GET', url: '/api/marketplace/auth/me',
      headers: { Cookie: `mp_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Marketplace authentication required' });
  });

  it('returns 401 when session is revoked', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeMePrisma(makeSessionRow({ revokedAt: new Date() })));
    const res = await app.inject({
      method: 'GET', url: '/api/marketplace/auth/me',
      headers: { Cookie: `mp_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
  });

  it('returns 401 when session is expired', async () => {
    const rawToken = createRawSessionToken();
    const past = new Date(Date.now() - 1000);
    const app  = buildApp(makeMePrisma(makeSessionRow({ expiresAt: past })));
    const res  = await app.inject({
      method: 'GET', url: '/api/marketplace/auth/me',
      headers: { Cookie: `mp_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
  });

  it('returns 401 when account is inactive', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeMePrisma(makeSessionRow({ isActive: false })));
    const res = await app.inject({
      method: 'GET', url: '/api/marketplace/auth/me',
      headers: { Cookie: `mp_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
  });
});

// ── Cross-domain isolation ────────────────────────────────────────────────────
//
// The cookie name is the domain boundary:
//   - /api/marketplace/auth/me looks for mp_session only.
//   - /api/auth/me             looks for op_session only.
//
// Sending the wrong cookie name must not grant access to the wrong domain.

describe('op_session cookie cannot authenticate marketplace me', () => {
  it('GET /api/marketplace/auth/me with op_session cookie returns 401', async () => {
    // Route reads mp_session; op_session is silently ignored → no cookie found → 401.
    const rawToken = createRawSessionToken();
    const app = buildApp({} as unknown as PrismaClient);
    const res = await app.inject({
      method: 'GET', url: '/api/marketplace/auth/me',
      headers: { Cookie: `op_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Marketplace authentication required' });
  });

  it('sending only op_session never reaches the marketplace session table', async () => {
    // Prisma stub has no marketplaceSession — if the route did try to look it up, it would throw.
    let marketplaceLookupCalled = false;
    const prisma = {
      marketplaceSession: {
        findUnique: async () => { marketplaceLookupCalled = true; return null; },
      },
    } as unknown as PrismaClient;

    const rawToken = createRawSessionToken();
    const app = buildApp(prisma);
    await app.inject({
      method: 'GET', url: '/api/marketplace/auth/me',
      headers: { Cookie: `op_session=${rawToken}` },
    });
    assert.equal(marketplaceLookupCalled, false, 'marketplace session table must not be queried when mp_session is absent');
  });
});

describe('mp_session cookie cannot authenticate operator me', () => {
  it('GET /api/auth/me with mp_session cookie returns 401', async () => {
    // Route reads op_session; mp_session is silently ignored → no cookie found → 401.
    const rawToken = createRawSessionToken();
    const app = buildApp({} as unknown as PrismaClient);
    const res = await app.inject({
      method: 'GET', url: '/api/auth/me',
      headers: { Cookie: `mp_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Operator authentication required' });
  });

  it('sending only mp_session never reaches the operator session table', async () => {
    let operatorLookupCalled = false;
    const prisma = {
      operatorSession: {
        findUnique: async () => { operatorLookupCalled = true; return null; },
      },
    } as unknown as PrismaClient;

    const rawToken = createRawSessionToken();
    const app = buildApp(prisma);
    await app.inject({
      method: 'GET', url: '/api/auth/me',
      headers: { Cookie: `mp_session=${rawToken}` },
    });
    assert.equal(operatorLookupCalled, false, 'operator session table must not be queried when op_session is absent');
  });
});
