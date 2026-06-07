// Phase B2 — Operator Auth Route Tests
//
// Tests login, logout, and me via Fastify inject.
// Prisma is stubbed per test; no real DB connection is required.
// The dev x-operator-id header is NOT tested here — it belongs to the
// existing guard tests in apiSecurityContract.test.ts and dataSafetyBoundary.test.ts.

import assert from 'node:assert/strict';
import { describe, it, before } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { hashPassword } from '../services/auth/passwordService.js';
import { hashSessionToken, createRawSessionToken, SESSION_LIFETIME_MS } from '../services/auth/sessionService.js';

// ── Fixture constants ─────────────────────────────────────────────────────────

const TEST_EMAIL    = 'test-admin@example.local';
const TEST_PASSWORD = 'correct-horse-battery-stable';

// ── Fixture builders ──────────────────────────────────────────────────────────

function makeAccount(overrides: Partial<{
  id: string;
  email: string;
  passwordHash: string;
  role: string;
  isActive: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}> = {}) {
  return {
    id:          'acct-001',
    email:       TEST_EMAIL,
    passwordHash: '', // filled per-test via before()
    role:        'SUPER_ADMIN' as const,
    isActive:    true,
    lastLoginAt: null,
    createdAt:   new Date(),
    updatedAt:   new Date(),
    ...overrides,
  };
}

function makeSessionRow(overrides: Partial<{
  revokedAt: Date | null;
  expiresAt: Date;
  isActive: boolean;
  dealerAccess: Array<{ dealershipId: string }>;
}> = {}) {
  return {
    id:                'sess-001',
    tokenHash:         'irrelevant-mock',
    operatorAccountId: 'acct-001',
    createdAt:         new Date(),
    expiresAt:         overrides.expiresAt ?? new Date(Date.now() + SESSION_LIFETIME_MS),
    revokedAt:         overrides.revokedAt ?? null,
    ipAddress:         null,
    userAgent:         null,
    account: {
      id:           'acct-001',
      email:        TEST_EMAIL,
      role:         'SUPER_ADMIN' as const,
      isActive:     overrides.isActive ?? true,
      passwordHash: '[not-returned]',
      lastLoginAt:  null,
      createdAt:    new Date(),
      updatedAt:    new Date(),
      dealerAccess: overrides.dealerAccess ?? [],
    },
  };
}

function makeLoginPrisma(opts: {
  account: ReturnType<typeof makeAccount> | null;
  dealerAccess?: Array<{ dealershipId: string }>;
}): PrismaClient {
  return {
    operatorAccount: {
      findUnique: async () => opts.account,
      update:     async () => opts.account ?? {},
    },
    operatorDealerAccess: {
      findMany: async () => opts.dealerAccess ?? [],
    },
    operatorSession: {
      create: async () => ({}),
    },
  } as unknown as PrismaClient;
}

function makeMePrisma(sessionRow: ReturnType<typeof makeSessionRow> | null): PrismaClient {
  return {
    operatorSession: {
      findUnique: async () => sessionRow,
    },
  } as unknown as PrismaClient;
}

function makeLogoutPrisma(): PrismaClient {
  return {
    operatorSession: {
      updateMany: async () => ({ count: 1 }),
    },
  } as unknown as PrismaClient;
}

// ── POST /api/auth/login ──────────────────────────────────────────────────────

describe('POST /api/auth/login — success', () => {
  let testHash = '';
  before(async () => { testHash = await hashPassword(TEST_PASSWORD); });

  it('returns 200 with identity body on valid credentials', async () => {
    const account = makeAccount({ passwordHash: testHash });
    const app = buildApp(makeLoginPrisma({ account }));
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    assert.equal(res.statusCode, 200, `expected 200, got ${res.statusCode}: ${res.body}`);
    const body = res.json() as Record<string, unknown>;
    assert.equal(body['email'], TEST_EMAIL);
    assert.equal(body['role'],  'SUPER_ADMIN');
    assert.ok(Array.isArray(body['dealerAccessIds']), 'dealerAccessIds must be an array');
  });

  it('response body contains no passwordHash or tokenHash', async () => {
    const account = makeAccount({ passwordHash: testHash });
    const app = buildApp(makeLoginPrisma({ account }));
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    const body = res.json() as Record<string, unknown>;
    assert.ok(!('passwordHash' in body), 'response must not include passwordHash');
    assert.ok(!('tokenHash'    in body), 'response must not include tokenHash');
  });

  it('sets op_session HttpOnly cookie', async () => {
    const account = makeAccount({ passwordHash: testHash });
    const app = buildApp(makeLoginPrisma({ account }));
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    const setCookie = res.headers['set-cookie'] as string | string[] | undefined;
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    assert.ok(cookie?.startsWith('op_session='), `set-cookie must start with op_session=, got: ${cookie}`);
    assert.ok(cookie?.includes('HttpOnly'),       'cookie must be HttpOnly');
    assert.ok(cookie?.includes('SameSite=Strict'),'cookie must be SameSite=Strict');
    assert.ok(cookie?.includes('Path=/api'),      'cookie must have Path=/api');
    assert.ok(cookie?.includes('Max-Age='),       'cookie must have Max-Age');
  });

  it('cookie does not include Secure flag in non-production', async () => {
    const account = makeAccount({ passwordHash: testHash });
    const app = buildApp(makeLoginPrisma({ account }));
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    const setCookie = res.headers['set-cookie'] as string | string[] | undefined;
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    // NODE_ENV is 'test' in CI — Secure must not be present
    assert.ok(!cookie?.includes('; Secure'), `Secure flag must not be set in non-production, got: ${cookie}`);
  });

  it('dealerAccessIds lists all dealer IDs from OperatorDealerAccess', async () => {
    const account = makeAccount({ passwordHash: testHash });
    const app = buildApp(makeLoginPrisma({
      account,
      dealerAccess: [{ dealershipId: 'dealer-aaa' }, { dealershipId: 'dealer-bbb' }],
    }));
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    const body = res.json() as { dealerAccessIds: string[] };
    assert.deepEqual(body.dealerAccessIds.sort(), ['dealer-aaa', 'dealer-bbb'].sort());
  });
});

describe('POST /api/auth/login — rejection cases', () => {
  let testHash = '';
  before(async () => { testHash = await hashPassword(TEST_PASSWORD); });

  it('returns 400 on missing email', async () => {
    const app = buildApp(makeLoginPrisma({ account: null }));
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { password: TEST_PASSWORD },
    });
    assert.equal(res.statusCode, 400);
  });

  it('returns 400 on missing password', async () => {
    const app = buildApp(makeLoginPrisma({ account: null }));
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: TEST_EMAIL },
    });
    assert.equal(res.statusCode, 400);
  });

  it('returns 400 on password shorter than 8 chars', async () => {
    const app = buildApp(makeLoginPrisma({ account: null }));
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: TEST_EMAIL, password: 'short' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('returns 401 for unknown email (not 404 — do not leak existence)', async () => {
    const app = buildApp(makeLoginPrisma({ account: null }));
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: 'nobody@example.com', password: TEST_PASSWORD },
    });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Invalid email or password' });
  });

  it('returns 401 for wrong password (same message as unknown email)', async () => {
    const account = makeAccount({ passwordHash: testHash });
    const app = buildApp(makeLoginPrisma({ account }));
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: TEST_EMAIL, password: 'wrong-password-xyz' },
    });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Invalid email or password' });
  });

  it('returns 401 for inactive account', async () => {
    const account = makeAccount({ passwordHash: testHash, isActive: false });
    const app = buildApp(makeLoginPrisma({ account }));
    const res = await app.inject({
      method: 'POST', url: '/api/auth/login',
      payload: { email: TEST_EMAIL, password: TEST_PASSWORD },
    });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Account is inactive' });
  });
});

// ── POST /api/auth/logout ─────────────────────────────────────────────────────

describe('POST /api/auth/logout', () => {
  it('returns 200 with ok:true and clears cookie', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeLogoutPrisma());
    const res = await app.inject({
      method: 'POST', url: '/api/auth/logout',
      headers: { Cookie: `op_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { ok: true });

    const setCookie = res.headers['set-cookie'] as string | string[] | undefined;
    const cookie = Array.isArray(setCookie) ? setCookie[0] : setCookie;
    assert.ok(cookie?.includes('op_session=;'), 'cookie value must be cleared (empty after =)');
    assert.ok(cookie?.includes('Max-Age=0'), 'Max-Age must be 0 to expire the cookie');
  });

  it('returns 200 even when no op_session cookie is present (idempotent)', async () => {
    const app = buildApp(makeLogoutPrisma());
    const res = await app.inject({ method: 'POST', url: '/api/auth/logout' });
    assert.equal(res.statusCode, 200);
    assert.deepEqual(res.json(), { ok: true });
  });
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

describe('GET /api/auth/me — authenticated', () => {
  it('returns 200 with identity for a valid session', async () => {
    const rawToken = createRawSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const sessionRow = { ...makeSessionRow(), tokenHash };
    const app = buildApp(makeMePrisma(sessionRow));
    const res = await app.inject({
      method: 'GET', url: '/api/auth/me',
      headers: { Cookie: `op_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 200, `expected 200, got ${res.statusCode}: ${res.body}`);
    const body = res.json() as Record<string, unknown>;
    assert.equal(body['email'], TEST_EMAIL);
    assert.equal(body['role'],  'SUPER_ADMIN');
    assert.ok(Array.isArray(body['dealerAccessIds']));
  });

  it('response does not contain passwordHash or tokenHash', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeMePrisma(makeSessionRow()));
    const res = await app.inject({
      method: 'GET', url: '/api/auth/me',
      headers: { Cookie: `op_session=${rawToken}` },
    });
    const body = res.json() as Record<string, unknown>;
    assert.ok(!('passwordHash' in body), 'me response must not include passwordHash');
    assert.ok(!('tokenHash'    in body), 'me response must not include tokenHash');
  });

  it('SUPER_ADMIN with empty dealerAccessIds is a valid authenticated state', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeMePrisma(makeSessionRow({ dealerAccess: [] })));
    const res = await app.inject({
      method: 'GET', url: '/api/auth/me',
      headers: { Cookie: `op_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 200);
    assert.deepEqual((res.json() as { dealerAccessIds: string[] }).dealerAccessIds, []);
  });
});

describe('GET /api/auth/me — rejection cases', () => {
  it('returns 401 when no cookie is present', async () => {
    const app = buildApp(makeMePrisma(null));
    const res = await app.inject({ method: 'GET', url: '/api/auth/me' });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Operator authentication required' });
  });

  it('returns 401 when session row is not found', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeMePrisma(null));
    const res = await app.inject({
      method: 'GET', url: '/api/auth/me',
      headers: { Cookie: `op_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
  });

  it('returns 401 when session is revoked', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeMePrisma(makeSessionRow({ revokedAt: new Date() })));
    const res = await app.inject({
      method: 'GET', url: '/api/auth/me',
      headers: { Cookie: `op_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
  });

  it('returns 401 when session is expired', async () => {
    const rawToken = createRawSessionToken();
    const past = new Date(Date.now() - 1000);
    const app = buildApp(makeMePrisma(makeSessionRow({ expiresAt: past })));
    const res = await app.inject({
      method: 'GET', url: '/api/auth/me',
      headers: { Cookie: `op_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
  });

  it('returns 401 when account is inactive', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeMePrisma(makeSessionRow({ isActive: false })));
    const res = await app.inject({
      method: 'GET', url: '/api/auth/me',
      headers: { Cookie: `op_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
  });
});

// ── Cross-route: dev header still works on guarded operator routes ─────────────
// This confirms that adding auth routes did not disturb the existing guard.

describe('existing dev-header operator guard — unaffected by auth routes', () => {
  it('x-operator-id still grants access to /api/dealers', async () => {
    const app = buildApp({
      dealershipProfile: { findMany: async () => [] },
      // auth routes need these — but this test hits /api/dealers, not auth
    } as unknown as PrismaClient);
    const res = await app.inject({
      method: 'GET', url: '/api/dealers',
      headers: { 'x-operator-id': 'dev-operator' },
    });
    assert.equal(res.statusCode, 200);
  });

  it('/api/dealers still 401 without any auth', async () => {
    const app = buildApp({
      dealershipProfile: { findMany: async () => [] },
    } as unknown as PrismaClient);
    const res = await app.inject({ method: 'GET', url: '/api/dealers' });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Operator authentication required' });
  });
});
