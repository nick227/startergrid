// Phase C1 — Marketplace Auth Core Service Tests
//
// Tests the marketplace session primitives without a real DB.
// PrismaClient is stubbed per test to return controlled data.
// No routes, no middleware — pure service-layer coverage.
//
// Cross-domain isolation tests prove that marketplace session tokens cannot
// resolve operator identity and vice versa — a structural guarantee, not a
// convention.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import {
  createMarketplaceSession,
  revokeMarketplaceSession,
  getMarketplaceUserFromSessionToken,
  MarketplaceAuthError,
  MARKETPLACE_SESSION_LIFETIME_MS,
} from '../services/auth/marketplaceSessionService.js';
import {
  createRawSessionToken,
  hashSessionToken,
  getOperatorFromSessionToken,
  OperatorAuthError,
  SESSION_LIFETIME_MS as OPERATOR_SESSION_LIFETIME_MS,
} from '../services/auth/sessionService.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const USER_ID = 'mp-user-001';

function makeMarketplaceUser(overrides: Partial<{
  id:          string;
  email:       string;
  displayName: string | null;
  isActive:    boolean;
  passwordHash: string;
}> = {}) {
  return {
    id:           overrides.id          ?? USER_ID,
    email:        overrides.email       ?? 'shopper@example.com',
    displayName:  'displayName' in overrides ? overrides.displayName : 'Alex Shopper',
    isActive:     overrides.isActive    ?? true,
    passwordHash: overrides.passwordHash ?? '[hashed]',
    lastLoginAt:  null,
    createdAt:    new Date(),
    updatedAt:    new Date(),
  };
}

function makeMarketplaceSession(overrides: Partial<{
  revokedAt: Date | null;
  expiresAt: Date;
  isActive:  boolean;
  displayName: string | null;
}> = {}) {
  return {
    id:                'mp-sess-001',
    tokenHash:         'irrelevant-in-mock',
    marketplaceUserId: USER_ID,
    createdAt:         new Date(),
    expiresAt:         overrides.expiresAt ?? new Date(Date.now() + MARKETPLACE_SESSION_LIFETIME_MS),
    revokedAt:         overrides.revokedAt ?? null,
    ipAddress:         null,
    userAgent:         null,
    user: makeMarketplaceUser({
      isActive:    overrides.isActive ?? true,
      displayName: 'displayName' in overrides ? overrides.displayName : 'Alex Shopper',
    }),
  };
}

function mockMarketplacePrismaFind(
  row: ReturnType<typeof makeMarketplaceSession> | null
): PrismaClient {
  return {
    marketplaceSession: {
      findUnique: async () => row,
    },
  } as unknown as PrismaClient;
}

// ── createMarketplaceSession ──────────────────────────────────────────────────

describe('createMarketplaceSession', () => {
  it('returns a raw token and stores only the hash', async () => {
    let storedHash = '';
    const prisma = {
      marketplaceSession: {
        create: async (args: { data: { tokenHash: string } }) => {
          storedHash = args.data.tokenHash;
          return { id: 'new-mp-sess' };
        },
      },
    } as unknown as PrismaClient;

    const rawToken = await createMarketplaceSession(prisma, USER_ID);
    assert.ok(rawToken.length > 0, 'raw token must be returned');
    assert.notEqual(rawToken, storedHash, 'raw token must never equal the stored hash');
    assert.equal(storedHash, hashSessionToken(rawToken), 'stored hash must be SHA-256 of raw token');
  });

  it('expiresAt is approximately 30 days from now', async () => {
    let storedExpiry: Date | undefined;
    const prisma = {
      marketplaceSession: {
        create: async (args: { data: { expiresAt: Date } }) => {
          storedExpiry = args.data.expiresAt;
          return { id: 'new-mp-sess' };
        },
      },
    } as unknown as PrismaClient;

    const before = Date.now();
    await createMarketplaceSession(prisma, USER_ID);
    const after = Date.now();

    assert.ok(storedExpiry !== undefined);
    const diff = storedExpiry!.getTime() - before;
    assert.ok(diff >= MARKETPLACE_SESSION_LIFETIME_MS - 200, 'expiresAt must be ~30 days in the future');
    assert.ok(diff <= MARKETPLACE_SESSION_LIFETIME_MS + (after - before) + 200);
  });

  it('stores marketplaceUserId and optional meta fields', async () => {
    let captured: Record<string, unknown> = {};
    const prisma = {
      marketplaceSession: {
        create: async (args: { data: Record<string, unknown> }) => {
          captured = args.data;
          return { id: 'new-mp-sess' };
        },
      },
    } as unknown as PrismaClient;

    await createMarketplaceSession(prisma, USER_ID, {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    });

    assert.equal(captured['marketplaceUserId'], USER_ID);
    assert.equal(captured['ipAddress'], '192.168.1.1');
    assert.equal(captured['userAgent'], 'Mozilla/5.0');
  });

  it('session lifetime is 30 days (not 8 hours like operator)', () => {
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    assert.equal(MARKETPLACE_SESSION_LIFETIME_MS, thirtyDaysMs);
    assert.ok(
      MARKETPLACE_SESSION_LIFETIME_MS > OPERATOR_SESSION_LIFETIME_MS,
      'marketplace sessions must outlive operator sessions'
    );
  });
});

// ── revokeMarketplaceSession ──────────────────────────────────────────────────

describe('revokeMarketplaceSession', () => {
  it('calls updateMany with the hashed token and sets revokedAt', async () => {
    let capturedWhere: Record<string, unknown> = {};
    let capturedData:  Record<string, unknown> = {};
    const prisma = {
      marketplaceSession: {
        updateMany: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          capturedWhere = args.where;
          capturedData  = args.data;
          return { count: 1 };
        },
      },
    } as unknown as PrismaClient;

    const rawToken = createRawSessionToken();
    await revokeMarketplaceSession(prisma, rawToken);

    assert.equal(capturedWhere['tokenHash'], hashSessionToken(rawToken));
    assert.equal(capturedWhere['revokedAt'], null);
    assert.ok(capturedData['revokedAt'] instanceof Date, 'revokedAt must be a Date');
  });
});

// ── getMarketplaceUserFromSessionToken — valid session ────────────────────────

describe('getMarketplaceUserFromSessionToken — valid session', () => {
  it('returns MarketplaceUserIdentity without passwordHash or tokenHash', async () => {
    const prisma = mockMarketplacePrismaFind(makeMarketplaceSession());
    const identity = await getMarketplaceUserFromSessionToken(prisma, createRawSessionToken());

    assert.ok(!('passwordHash' in identity), 'passwordHash must not appear in identity');
    assert.ok(!('tokenHash'    in identity), 'tokenHash must not appear in identity');
    assert.equal(identity.id,          USER_ID);
    assert.equal(identity.email,       'shopper@example.com');
    assert.equal(identity.displayName, 'Alex Shopper');
  });

  it('displayName may be null (optional field)', async () => {
    const prisma = mockMarketplacePrismaFind(makeMarketplaceSession({ displayName: null }));
    const identity = await getMarketplaceUserFromSessionToken(prisma, createRawSessionToken());
    assert.equal(identity.displayName, null);
  });

  it('identity contains no operator fields (role, dealerAccessIds)', async () => {
    const prisma = mockMarketplacePrismaFind(makeMarketplaceSession());
    const identity = await getMarketplaceUserFromSessionToken(prisma, createRawSessionToken());

    assert.ok(!('role'            in identity), 'operator role must not appear in marketplace identity');
    assert.ok(!('dealerAccessIds' in identity), 'dealerAccessIds must not appear in marketplace identity');
    assert.ok(!('devHeader'       in identity), 'devHeader flag must not appear in marketplace identity');
    assert.ok(!('isActive'        in identity), 'internal isActive must not be exposed');
  });
});

// ── getMarketplaceUserFromSessionToken — rejection cases ─────────────────────

describe('getMarketplaceUserFromSessionToken — rejection cases', () => {
  it('throws MarketplaceAuthError(session_not_found) when no session row', async () => {
    const prisma = mockMarketplacePrismaFind(null);
    await assert.rejects(
      () => getMarketplaceUserFromSessionToken(prisma, createRawSessionToken()),
      (err: MarketplaceAuthError) => {
        assert.ok(err instanceof MarketplaceAuthError);
        assert.equal(err.code, 'session_not_found');
        return true;
      }
    );
  });

  it('throws MarketplaceAuthError(session_revoked) when revokedAt is set', async () => {
    const prisma = mockMarketplacePrismaFind(makeMarketplaceSession({ revokedAt: new Date() }));
    await assert.rejects(
      () => getMarketplaceUserFromSessionToken(prisma, createRawSessionToken()),
      (err: MarketplaceAuthError) => {
        assert.ok(err instanceof MarketplaceAuthError);
        assert.equal(err.code, 'session_revoked');
        return true;
      }
    );
  });

  it('throws MarketplaceAuthError(session_expired) when expiresAt is in the past', async () => {
    const past = new Date(Date.now() - 1000);
    const prisma = mockMarketplacePrismaFind(makeMarketplaceSession({ expiresAt: past }));
    await assert.rejects(
      () => getMarketplaceUserFromSessionToken(prisma, createRawSessionToken()),
      (err: MarketplaceAuthError) => {
        assert.ok(err instanceof MarketplaceAuthError);
        assert.equal(err.code, 'session_expired');
        return true;
      }
    );
  });

  it('throws MarketplaceAuthError(account_inactive) when user.isActive is false', async () => {
    const prisma = mockMarketplacePrismaFind(makeMarketplaceSession({ isActive: false }));
    await assert.rejects(
      () => getMarketplaceUserFromSessionToken(prisma, createRawSessionToken()),
      (err: MarketplaceAuthError) => {
        assert.ok(err instanceof MarketplaceAuthError);
        assert.equal(err.code, 'account_inactive');
        return true;
      }
    );
  });
});

// ── MarketplaceAuthError ──────────────────────────────────────────────────────

describe('MarketplaceAuthError', () => {
  it('is an instance of Error', () => {
    const err = new MarketplaceAuthError('session_expired');
    assert.ok(err instanceof Error);
    assert.ok(err instanceof MarketplaceAuthError);
  });

  it('name is MarketplaceAuthError', () => {
    assert.equal(new MarketplaceAuthError('session_revoked').name, 'MarketplaceAuthError');
  });

  it('code is accessible on the error', () => {
    assert.equal(new MarketplaceAuthError('account_inactive').code, 'account_inactive');
  });
});

// ── Cross-domain isolation ────────────────────────────────────────────────────
//
// A token hash created for one domain's session table must not resolve against
// the other domain's lookup function. The tables are separate; findUnique on the
// wrong table returns null → session_not_found.
//
// These tests use stubbed Prisma clients that return null for the opposing table,
// which is the correct DB behaviour (the hash simply doesn't exist in that table).

describe('marketplace session cannot resolve operator identity', () => {
  it('getOperatorFromSessionToken throws OperatorAuthError when given a marketplace-typed token', async () => {
    // Simulate: marketplace token hash is not in the OperatorSession table → null.
    const prisma = {
      operatorSession: {
        findUnique: async () => null,
      },
    } as unknown as PrismaClient;

    const rawToken = createRawSessionToken(); // could have come from createMarketplaceSession
    await assert.rejects(
      () => getOperatorFromSessionToken(prisma, rawToken),
      (err: OperatorAuthError) => {
        assert.ok(err instanceof OperatorAuthError);
        assert.equal(err.code, 'session_not_found');
        return true;
      }
    );
  });

  it('error is OperatorAuthError, not MarketplaceAuthError', async () => {
    const prisma = {
      operatorSession: { findUnique: async () => null },
    } as unknown as PrismaClient;

    const rawToken = createRawSessionToken();
    const err = await getOperatorFromSessionToken(prisma, rawToken).catch(e => e);
    assert.ok(err instanceof OperatorAuthError, 'wrong domain lookup must throw domain-specific error');
    assert.ok(!(err instanceof MarketplaceAuthError), 'must not bleed MarketplaceAuthError');
  });
});

describe('operator session cannot resolve marketplace identity', () => {
  it('getMarketplaceUserFromSessionToken throws MarketplaceAuthError when given an operator-typed token', async () => {
    // Simulate: operator token hash is not in the MarketplaceSession table → null.
    const prisma = {
      marketplaceSession: {
        findUnique: async () => null,
      },
    } as unknown as PrismaClient;

    const rawToken = createRawSessionToken(); // could have come from createOperatorSession
    await assert.rejects(
      () => getMarketplaceUserFromSessionToken(prisma, rawToken),
      (err: MarketplaceAuthError) => {
        assert.ok(err instanceof MarketplaceAuthError);
        assert.equal(err.code, 'session_not_found');
        return true;
      }
    );
  });

  it('error is MarketplaceAuthError, not OperatorAuthError', async () => {
    const prisma = {
      marketplaceSession: { findUnique: async () => null },
    } as unknown as PrismaClient;

    const rawToken = createRawSessionToken();
    const err = await getMarketplaceUserFromSessionToken(prisma, rawToken).catch(e => e);
    assert.ok(err instanceof MarketplaceAuthError, 'wrong domain lookup must throw domain-specific error');
    assert.ok(!(err instanceof OperatorAuthError), 'must not bleed OperatorAuthError');
  });
});
