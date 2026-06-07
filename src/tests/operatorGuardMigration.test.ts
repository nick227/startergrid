// Phase B3 — Operator Guard Migration Tests
//
// Covers session-cookie auth in production, dev-header fallback in dev/test,
// SUPER_ADMIN global access, and OPERATOR dealer scoping via OperatorDealerAccess.
//
// NODE_ENV is overridden per describe block where production behavior is under test.
// Prisma is stubbed; no real DB connection is required.

import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { hashSessionToken, createRawSessionToken, SESSION_LIFETIME_MS } from '../services/auth/sessionService.js';

// ── Fixture builders ──────────────────────────────────────────────────────────

function makeSessionRow(overrides: Partial<{
  revokedAt: Date | null;
  expiresAt: Date;
  isActive: boolean;
  role: 'SUPER_ADMIN' | 'OPERATOR';
  dealerAccess: Array<{ dealershipId: string }>;
}> = {}) {
  return {
    id:                'sess-b3',
    tokenHash:         'irrelevant-mock',
    operatorAccountId: 'acct-b3',
    createdAt:         new Date(),
    expiresAt:         overrides.expiresAt ?? new Date(Date.now() + SESSION_LIFETIME_MS),
    revokedAt:         overrides.revokedAt ?? null,
    ipAddress:         null,
    userAgent:         null,
    account: {
      id:           'acct-b3',
      email:        'operator@example.local',
      role:         overrides.role ?? 'SUPER_ADMIN' as const,
      isActive:     overrides.isActive ?? true,
      passwordHash: '[not-returned]',
      lastLoginAt:  null,
      createdAt:    new Date(),
      updatedAt:    new Date(),
      dealerAccess: overrides.dealerAccess ?? [],
    },
  };
}

// Prisma stub used for session-based auth tests.
// operatorSession.findUnique returns `sessionRow`; dealershipProfile.findUnique returns null (→ 404).
function makeSessionPrisma(
  sessionRow: ReturnType<typeof makeSessionRow> | null
): PrismaClient {
  return {
    operatorSession: {
      findUnique: async () => sessionRow,
    },
    dealershipProfile: {
      findUnique: async () => null,
      findMany:   async () => [],
    },
    platformApplication: {
      findMany: async () => [],
    },
  } as unknown as PrismaClient;
}

// Minimal stub for tests where auth blocks DB calls before they happen.
const nullPrisma = {} as unknown as PrismaClient;

// Inject helper with typed response.
type InjectResult = { statusCode: number; json(): Record<string, unknown> };
async function inj(
  app: ReturnType<typeof buildApp>,
  method: 'GET' | 'POST' | 'PATCH',
  url: string,
  opts: { headers?: Record<string, string> } = {}
): Promise<InjectResult> {
  return app.inject({ method, url, ...opts }) as unknown as Promise<InjectResult>;
}

// ── 1. Production: op_session cookie required ─────────────────────────────────
//
// In production, the only accepted auth mechanism is a valid op_session cookie.
// x-operator-id header and DEV_OPERATOR_ID env var must be rejected.

describe('production — requireOperator', () => {
  let origEnv: string | undefined;
  before(() => { origEnv = process.env['NODE_ENV']; process.env['NODE_ENV'] = 'production'; });
  after(()  => { process.env['NODE_ENV'] = origEnv; });

  it('returns 401 when no auth is provided', async () => {
    const app = buildApp(nullPrisma);
    const res = await inj(app, 'GET', '/api/dealers');
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Operator authentication required' });
  });

  it('returns 401 when only x-operator-id header is provided (no cookie)', async () => {
    const app = buildApp(nullPrisma);
    const res = await inj(app, 'GET', '/api/dealers', {
      headers: { 'x-operator-id': 'any-id' },
    });
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Operator authentication required' });
  });

  it('allows access with a valid op_session cookie', async () => {
    const rawToken = createRawSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const sessionRow = { ...makeSessionRow(), tokenHash };
    const app = buildApp(makeSessionPrisma(sessionRow));
    const res = await inj(app, 'GET', '/api/dealers', {
      headers: { Cookie: `op_session=${rawToken}` },
    });
    // Auth passes → route hits DB → returns 200 with empty array
    assert.notEqual(res.statusCode, 401, `expected not 401, got ${res.statusCode}`);
  });

  it('returns 401 with an invalid op_session cookie (session not found)', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeSessionPrisma(null)); // session not in DB
    const res = await inj(app, 'GET', '/api/dealers', {
      headers: { Cookie: `op_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
  });

  it('returns 401 with a revoked op_session cookie', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeSessionPrisma(makeSessionRow({ revokedAt: new Date() })));
    const res = await inj(app, 'GET', '/api/dealers', {
      headers: { Cookie: `op_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
  });

  it('returns 401 with an expired op_session cookie', async () => {
    const rawToken = createRawSessionToken();
    const past = new Date(Date.now() - 1000);
    const app = buildApp(makeSessionPrisma(makeSessionRow({ expiresAt: past })));
    const res = await inj(app, 'GET', '/api/dealers', {
      headers: { Cookie: `op_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
  });

  it('returns 401 when account is inactive', async () => {
    const rawToken = createRawSessionToken();
    const app = buildApp(makeSessionPrisma(makeSessionRow({ isActive: false })));
    const res = await inj(app, 'GET', '/api/dealers', {
      headers: { Cookie: `op_session=${rawToken}` },
    });
    assert.equal(res.statusCode, 401);
  });
});

// ── 2. Development: x-operator-id header fallback works ──────────────────────
//
// NODE_ENV=test (the test runner default) is treated identically to development.

describe('development/test — x-operator-id fallback', () => {
  it('x-operator-id header grants access to operator routes', async () => {
    const app = buildApp({
      dealershipProfile: { findMany: async () => [] },
    } as unknown as PrismaClient);
    const res = await inj(app, 'GET', '/api/dealers', {
      headers: { 'x-operator-id': 'dev-op' },
    });
    assert.equal(res.statusCode, 200);
  });

  it('no auth → 401 in dev/test (same message as production)', async () => {
    const app = buildApp(nullPrisma);
    const res = await inj(app, 'GET', '/api/dealers');
    assert.equal(res.statusCode, 401);
    assert.deepEqual(res.json(), { error: 'Operator authentication required' });
  });

  it('op_session cookie takes precedence over x-operator-id header in dev/test', async () => {
    const rawToken = createRawSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const sessionRow = { ...makeSessionRow(), tokenHash };
    // Stub has operatorSession (for cookie) + dealershipProfile (for route)
    const prismaStub = makeSessionPrisma(sessionRow);
    const app = buildApp(prismaStub);
    // Send both cookie and header — cookie must win (real session identity loaded)
    const res = await inj(app, 'GET', '/api/dealers', {
      headers: {
        Cookie: `op_session=${rawToken}`,
        'x-operator-id': 'should-be-ignored',
      },
    });
    assert.notEqual(res.statusCode, 401);
  });
});

// ── 3. SUPER_ADMIN — global dealer access ────────────────────────────────────
//
// A SUPER_ADMIN session may access any dealership regardless of OperatorDealerAccess.

describe('SUPER_ADMIN dealer access via session cookie', () => {
  it('SUPER_ADMIN can access any dealership', async () => {
    const rawToken = createRawSessionToken();
    const tokenHash = hashSessionToken(rawToken);
    const sessionRow = {
      ...makeSessionRow({ role: 'SUPER_ADMIN', dealerAccess: [] }),
      tokenHash,
    };
    const app = buildApp(makeSessionPrisma(sessionRow));
    // Route will hit DB (dealershipProfile.findUnique → null → 404), but NOT 401/403
    const res = await inj(app, 'GET', '/api/dealers/any-dealer/accounts', {
      headers: { Cookie: `op_session=${rawToken}` },
    });
    assert.notEqual(res.statusCode, 401, 'SUPER_ADMIN must not get 401');
    assert.notEqual(res.statusCode, 403, 'SUPER_ADMIN must not get 403');
  });
});

// ── 4. OPERATOR — scoped dealer access via OperatorDealerAccess ───────────────
//
// An OPERATOR session may only access dealerships listed in their OperatorDealerAccess rows.

describe('OPERATOR scoped dealer access via session cookie', () => {
  const ALLOWED_DEALER    = 'dealer-assigned-001';
  const UNASSIGNED_DEALER = 'dealer-other-999';

  function makeOperatorApp(assignedDealerIds: string[]): ReturnType<typeof buildApp> {
    const rawToken   = createRawSessionToken();
    const tokenHash  = hashSessionToken(rawToken);
    const sessionRow = {
      ...makeSessionRow({
        role:         'OPERATOR',
        dealerAccess: assignedDealerIds.map(id => ({ dealershipId: id })),
      }),
      tokenHash,
    };
    const app = buildApp(makeSessionPrisma(sessionRow));
    // Attach the raw token to the app so tests can construct the cookie header.
    (app as unknown as { _testToken: string })._testToken = rawToken;
    return app;
  }

  it('OPERATOR can access their assigned dealership', async () => {
    const app = makeOperatorApp([ALLOWED_DEALER]);
    const token = (app as unknown as { _testToken: string })._testToken;
    const res = await inj(app, 'GET', `/api/dealers/${ALLOWED_DEALER}/accounts`, {
      headers: { Cookie: `op_session=${token}` },
    });
    // Auth + dealer scope pass → DB returns null → 404 (not 401/403)
    assert.notEqual(res.statusCode, 401, 'assigned dealer must not get 401');
    assert.notEqual(res.statusCode, 403, 'assigned dealer must not get 403');
    assert.equal(res.statusCode, 404, 'dealer not in DB → 404');
  });

  it('OPERATOR cannot access an unassigned dealership → 403', async () => {
    const app = makeOperatorApp([ALLOWED_DEALER]);
    const token = (app as unknown as { _testToken: string })._testToken;
    const res = await inj(app, 'GET', `/api/dealers/${UNASSIGNED_DEALER}/accounts`, {
      headers: { Cookie: `op_session=${token}` },
    });
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.json(), { error: 'Operator does not have access to this dealership' });
  });

  it('OPERATOR with no assigned dealers cannot access any dealership → 403', async () => {
    const app = makeOperatorApp([]);
    const token = (app as unknown as { _testToken: string })._testToken;
    const res = await inj(app, 'GET', `/api/dealers/${ALLOWED_DEALER}/accounts`, {
      headers: { Cookie: `op_session=${token}` },
    });
    assert.equal(res.statusCode, 403);
  });

  it('OPERATOR with multiple assigned dealers can access each one', async () => {
    const dealers = ['dealer-alpha', 'dealer-beta'];
    const app = makeOperatorApp(dealers);
    const token = (app as unknown as { _testToken: string })._testToken;

    for (const dealerId of dealers) {
      const res = await inj(app, 'GET', `/api/dealers/${dealerId}/accounts`, {
        headers: { Cookie: `op_session=${token}` },
      });
      assert.notEqual(res.statusCode, 403, `should not be 403 for assigned dealer ${dealerId}`);
    }
  });
});

// ── 5. Dev-header dealer scoping: DEV_OPERATOR_DEALER_IDS ────────────────────
//
// In dev/test when using x-operator-id, the DEV_OPERATOR_DEALER_IDS env var
// restricts dealer access (mirrors the old behavior). In production this path
// is never reached because requireOperator rejects non-cookie auth.

describe('dev-header path — DEV_OPERATOR_DEALER_IDS scoping', () => {
  let origDealerIds: string | undefined;
  before(() => { origDealerIds = process.env['DEV_OPERATOR_DEALER_IDS']; });
  after(()  => {
    if (origDealerIds === undefined) {
      delete process.env['DEV_OPERATOR_DEALER_IDS'];
    } else {
      process.env['DEV_OPERATOR_DEALER_IDS'] = origDealerIds;
    }
  });

  it('unrestricted (no DEV_OPERATOR_DEALER_IDS) — x-operator-id can access any dealer', async () => {
    delete process.env['DEV_OPERATOR_DEALER_IDS'];
    const app = buildApp(makeSessionPrisma(null)); // dealershipProfile.findUnique → null → 404
    const res = await inj(app, 'GET', '/api/dealers/any-dealer/accounts', {
      headers: { 'x-operator-id': 'dev-op' },
    });
    assert.notEqual(res.statusCode, 401);
    assert.notEqual(res.statusCode, 403);
  });

  it('DEV_OPERATOR_DEALER_IDS set — access allowed for listed dealer', async () => {
    process.env['DEV_OPERATOR_DEALER_IDS'] = 'allowed-dealer-001,allowed-dealer-002';
    const app = buildApp(makeSessionPrisma(null));
    const res = await inj(app, 'GET', '/api/dealers/allowed-dealer-001/accounts', {
      headers: { 'x-operator-id': 'dev-op' },
    });
    assert.notEqual(res.statusCode, 403, 'listed dealer must not be 403');
  });

  it('DEV_OPERATOR_DEALER_IDS set — access denied for unlisted dealer → 403', async () => {
    process.env['DEV_OPERATOR_DEALER_IDS'] = 'allowed-dealer-001';
    const app = buildApp(nullPrisma);
    const res = await inj(app, 'GET', '/api/dealers/other-dealer-999/accounts', {
      headers: { 'x-operator-id': 'dev-op' },
    });
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.json(), { error: 'Operator does not have access to this dealership' });
  });
});
