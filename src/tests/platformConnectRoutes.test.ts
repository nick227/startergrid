import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';

// ── Stub helpers ──────────────────────────────────────────────────────────────

const SESSION_EXPIRY = new Date(Date.now() + 60 * 60 * 1000);

function makeOperatorSession(dealershipId: string) {
  return {
    id: 'sess-1',
    tokenHash: 'irrelevant',
    operatorAccountId: 'op-1',
    createdAt: new Date(),
    expiresAt: SESSION_EXPIRY,
    revokedAt: null,
    ipAddress: null,
    userAgent: null,
    account: {
      id: 'op-1',
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

function makeDealer(id = 'dealer-1') {
  return { id, legalName: 'Test Dealer', businessCategory: 'AUTOMOTIVE' };
}

function makeConnectPrisma(opts: {
  dealershipId?: string;
  sessionExists?: boolean;
  dealerExists?: boolean;
  stateRow?: Record<string, unknown> | null;
  stateUsed?: boolean;
  stateExpired?: boolean;
}): PrismaClient {
  const dealershipId = opts.dealershipId ?? 'dealer-1';
  const session = opts.sessionExists !== false ? makeOperatorSession(dealershipId) : null;
  const dealer = opts.dealerExists !== false ? makeDealer(dealershipId) : null;

  return {
    operatorSession: {
      findUnique: async () => session,
    },
    dealershipProfile: {
      findUnique: async () => dealer,
    },
    oAuthState: {
      create: async (args: { data: Record<string, unknown> }) => ({ id: 'state-1', ...args.data }),
      findUnique: async () => opts.stateRow ?? null,
      update: async (args: { data: Record<string, unknown> }) => ({ id: 'state-1', ...args.data }),
    },
    platformOAuthToken: {
      upsert: async () => ({}),
    },
    platformAccount: {
      updateMany: async () => ({ count: 1 }),
    },
  } as unknown as PrismaClient;
}

// Standard auth cookie to simulate a logged-in operator
function authCookieHeader(value = 'mock-session-token'): string {
  return `op_session=${value}`;
}

// ── GET /api/dealers/:dealershipId/platforms/:platformSlug/connect-url ────────

describe('GET connect-url — happy path for Google Vehicle Ads', () => {
  it('returns 200 with authUrl and state', async () => {
    const prisma = makeConnectPrisma({});
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'GET',
      url: '/api/dealers/dealer-1/platforms/google-vehicle-ads/connect-url',
      headers: { cookie: authCookieHeader() },
    });
    assert.equal(res.statusCode, 200, `expected 200, got ${res.statusCode}: ${res.body}`);
    const body = res.json() as { authUrl?: string; state?: string };
    assert.ok(typeof body.authUrl === 'string', 'authUrl must be a string');
    assert.ok(typeof body.state === 'string', 'state must be a string');
    assert.ok(body.authUrl!.includes('accounts.google.com'), 'authUrl should be Google');
    assert.ok(body.authUrl!.includes('state='), 'authUrl should include state param');
  });
});

describe('GET connect-url — unknown platform', () => {
  it('returns 404', async () => {
    const prisma = makeConnectPrisma({});
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'GET',
      url: '/api/dealers/dealer-1/platforms/nonexistent-platform/connect-url',
      headers: { cookie: authCookieHeader() },
    });
    assert.equal(res.statusCode, 404);
  });
});

describe('GET connect-url — platform without OAuth (cargurus-dealer)', () => {
  it('returns 400', async () => {
    const prisma = makeConnectPrisma({});
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'GET',
      url: '/api/dealers/dealer-1/platforms/cargurus-dealer/connect-url',
      headers: { cookie: authCookieHeader() },
    });
    assert.equal(res.statusCode, 400);
  });
});

describe('GET connect-url — unauthenticated', () => {
  it('returns 401', async () => {
    const prisma = makeConnectPrisma({ sessionExists: false });
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'GET',
      url: '/api/dealers/dealer-1/platforms/google-vehicle-ads/connect-url',
    });
    assert.equal(res.statusCode, 401);
  });
});

// ── GET /api/oauth/callback ───────────────────────────────────────────────────

describe('GET /api/oauth/callback — missing state', () => {
  it('returns 400 HTML with error message', async () => {
    const prisma = makeConnectPrisma({});
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'GET',
      url: '/api/oauth/callback?code=someCode',
    });
    assert.equal(res.statusCode, 400);
    assert.ok(res.headers['content-type']?.toString().includes('text/html'));
  });
});

describe('GET /api/oauth/callback — missing code', () => {
  it('returns 400 HTML', async () => {
    const prisma = makeConnectPrisma({});
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'GET',
      url: '/api/oauth/callback?state=someState',
    });
    assert.equal(res.statusCode, 400);
  });
});

describe('GET /api/oauth/callback — provider error param', () => {
  it('returns 200 HTML with error message', async () => {
    const prisma = makeConnectPrisma({});
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'GET',
      url: '/api/oauth/callback?error=access_denied&error_description=User+denied+access',
    });
    // Returns 200 (popup page) with error content
    assert.ok(res.headers['content-type']?.toString().includes('text/html'));
    assert.ok(res.body.includes('User denied access') || res.body.includes('access_denied'));
  });
});

describe('GET /api/oauth/callback — invalid state (no DB row)', () => {
  it('returns 400 HTML', async () => {
    const prisma = makeConnectPrisma({ stateRow: null });
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'GET',
      url: '/api/oauth/callback?state=invalid-state&code=code123',
    });
    assert.equal(res.statusCode, 400);
    assert.ok(res.headers['content-type']?.toString().includes('text/html'));
    assert.ok(res.body.includes('Invalid') || res.body.includes('expired'));
  });
});

describe('GET /api/oauth/callback — already-used state', () => {
  it('returns 400 HTML', async () => {
    const stateRow = {
      id: 'state-1',
      state: 'used-state',
      dealershipId: 'dealer-1',
      platformSlug: 'google-vehicle-ads',
      provider: 'google',
      codeVerifier: null,
      returnUrl: null,
      expiresAt: new Date(Date.now() + 60_000),
      usedAt: new Date(), // already used
      createdAt: new Date(),
    };
    const prisma = makeConnectPrisma({ stateRow });
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'GET',
      url: '/api/oauth/callback?state=used-state&code=code123',
    });
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.includes('already used'));
  });
});

describe('GET /api/oauth/callback — expired state', () => {
  it('returns 400 HTML', async () => {
    const stateRow = {
      id: 'state-1',
      state: 'expired-state',
      dealershipId: 'dealer-1',
      platformSlug: 'google-vehicle-ads',
      provider: 'google',
      codeVerifier: null,
      returnUrl: null,
      expiresAt: new Date(Date.now() - 1000), // already expired
      usedAt: null,
      createdAt: new Date(),
    };
    const prisma = makeConnectPrisma({ stateRow });
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'GET',
      url: '/api/oauth/callback?state=expired-state&code=code123',
    });
    assert.equal(res.statusCode, 400);
    assert.ok(res.body.includes('expired'));
  });
});

// ── DELETE oauth-token ────────────────────────────────────────────────────────

describe('DELETE oauth-token — non-OAuth platform', () => {
  it('returns 400', async () => {
    const prisma = makeConnectPrisma({});
    const app = buildApp(prisma);
    const res = await app.inject({
      method: 'DELETE',
      url: '/api/dealers/dealer-1/platforms/cargurus-dealer/oauth-token',
      headers: { cookie: authCookieHeader() },
    });
    assert.equal(res.statusCode, 400);
  });
});
