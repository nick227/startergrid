// Phase B1 — Operator Auth Core Service Tests
//
// Tests the password and session primitives without a real DB.
// PrismaClient is stubbed per test to return controlled data.
// No routes, no middleware — pure service-layer coverage.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword, MIN_PASSWORD_LENGTH } from '../services/auth/passwordService.js';
import {
  createRawSessionToken,
  hashSessionToken,
  createOperatorSession,
  revokeOperatorSession,
  getOperatorFromSessionToken,
  OperatorAuthError,
  SESSION_LIFETIME_MS,
} from '../services/auth/sessionService.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const VALID_PASSWORD = 'correct-horse-battery-staple';
const WRONG_PASSWORD  = 'wrong-password';

// Full session+account shape returned by operatorSession.findUnique with includes
function makeSessionRow(overrides: {
  revokedAt?: Date | null;
  expiresAt?: Date;
  isActive?: boolean;
  dealerAccess?: Array<{ dealershipId: string }>;
} = {}) {
  return {
    id:                'sess-001',
    tokenHash:         'irrelevant-in-mock',
    operatorAccountId: 'acct-001',
    createdAt:         new Date(),
    expiresAt:         overrides.expiresAt ?? new Date(Date.now() + SESSION_LIFETIME_MS),
    revokedAt:         overrides.revokedAt ?? null,
    ipAddress:         null,
    userAgent:         null,
    account: {
      id:           'acct-001',
      email:        'admin@example.local',
      role:         'SUPER_ADMIN' as const,
      isActive:     overrides.isActive ?? true,
      passwordHash: '[not-returned-to-caller]',
      lastLoginAt:  null,
      createdAt:    new Date(),
      updatedAt:    new Date(),
      dealerAccess: overrides.dealerAccess ?? [],
    },
  };
}

function mockPrismaFindSession(
  row: ReturnType<typeof makeSessionRow> | null
): PrismaClient {
  return {
    operatorSession: {
      findUnique: async () => row,
    },
  } as unknown as PrismaClient;
}

// ── Password hashing ──────────────────────────────────────────────────────────

describe('hashPassword', () => {
  it('hash does not equal the raw password', async () => {
    const h = await hashPassword(VALID_PASSWORD);
    assert.notEqual(h, VALID_PASSWORD);
  });

  it('hash starts with $argon2id$ (confirms algorithm)', async () => {
    const h = await hashPassword(VALID_PASSWORD);
    assert.ok(h.startsWith('$argon2id$'), `expected argon2id hash, got: ${h.slice(0, 30)}`);
  });

  it('two hashes of the same password are different (random salt)', async () => {
    const h1 = await hashPassword(VALID_PASSWORD);
    const h2 = await hashPassword(VALID_PASSWORD);
    assert.notEqual(h1, h2, 'each hash must use a unique salt');
  });

  it(`rejects passwords shorter than ${MIN_PASSWORD_LENGTH} chars`, async () => {
    const short = 'x'.repeat(MIN_PASSWORD_LENGTH - 1);
    await assert.rejects(
      () => hashPassword(short),
      (err: Error) => err.message.includes(`at least ${MIN_PASSWORD_LENGTH}`)
    );
  });
});

describe('verifyPassword', () => {
  it('correct password verifies', async () => {
    const h = await hashPassword(VALID_PASSWORD);
    const ok = await verifyPassword(h, VALID_PASSWORD);
    assert.equal(ok, true);
  });

  it('wrong password is rejected', async () => {
    const h = await hashPassword(VALID_PASSWORD);
    const ok = await verifyPassword(h, WRONG_PASSWORD);
    assert.equal(ok, false);
  });

  it('Phase A placeholder sentinel returns false (graceful migration)', async () => {
    const sentinel = 'PHASE_A_PLACEHOLDER:not_a_real_hash:wire_argon2_in_phase_b:dev-change-me';
    const ok = await verifyPassword(sentinel, 'dev-change-me');
    assert.equal(ok, false, 'old placeholder must not verify as a valid password');
  });
});

// ── Session token primitives ──────────────────────────────────────────────────

describe('createRawSessionToken', () => {
  it('returns a non-empty string', () => {
    const token = createRawSessionToken();
    assert.ok(token.length > 0);
  });

  it('returns a 64-char hex string (32 random bytes)', () => {
    const token = createRawSessionToken();
    assert.equal(token.length, 64);
    assert.match(token, /^[0-9a-f]{64}$/);
  });

  it('two tokens are different (random)', () => {
    const t1 = createRawSessionToken();
    const t2 = createRawSessionToken();
    assert.notEqual(t1, t2);
  });
});

describe('hashSessionToken', () => {
  it('hash does not equal the raw token', () => {
    const raw  = createRawSessionToken();
    const hash = hashSessionToken(raw);
    assert.notEqual(hash, raw);
  });

  it('hash is a 64-char hex string (SHA-256 output)', () => {
    const hash = hashSessionToken(createRawSessionToken());
    assert.equal(hash.length, 64);
    assert.match(hash, /^[0-9a-f]{64}$/);
  });

  it('same input always produces the same hash (deterministic)', () => {
    const raw = createRawSessionToken();
    assert.equal(hashSessionToken(raw), hashSessionToken(raw));
  });

  it('different inputs produce different hashes', () => {
    const t1 = createRawSessionToken();
    const t2 = createRawSessionToken();
    assert.notEqual(hashSessionToken(t1), hashSessionToken(t2));
  });
});

// ── createOperatorSession ─────────────────────────────────────────────────────

describe('createOperatorSession', () => {
  it('returns a raw token and stores only the hash', async () => {
    let storedHash = '';
    const prisma = {
      operatorSession: {
        create: async (args: { data: { tokenHash: string } }) => {
          storedHash = args.data.tokenHash;
          return { id: 'new-sess' };
        },
      },
    } as unknown as PrismaClient;

    const rawToken = await createOperatorSession(prisma, 'acct-001');
    assert.ok(rawToken.length > 0, 'raw token must be returned');
    assert.notEqual(rawToken, storedHash, 'raw token must never equal the stored hash');
    assert.equal(storedHash, hashSessionToken(rawToken), 'stored hash must be SHA-256 of raw token');
  });

  it('stores expiresAt approximately 8 hours from now', async () => {
    let storedExpiry: Date | undefined;
    const prisma = {
      operatorSession: {
        create: async (args: { data: { expiresAt: Date } }) => {
          storedExpiry = args.data.expiresAt;
          return { id: 'new-sess' };
        },
      },
    } as unknown as PrismaClient;

    const before = Date.now();
    await createOperatorSession(prisma, 'acct-001');
    const after = Date.now();

    assert.ok(storedExpiry !== undefined);
    const diff = storedExpiry!.getTime() - before;
    assert.ok(diff >= SESSION_LIFETIME_MS - 100, 'expiresAt must be ~8h in the future');
    assert.ok(diff <= SESSION_LIFETIME_MS + (after - before) + 100);
  });

  it('passes ipAddress and userAgent to create', async () => {
    let captured: Record<string, unknown> = {};
    const prisma = {
      operatorSession: {
        create: async (args: { data: Record<string, unknown> }) => {
          captured = args.data;
          return { id: 'new-sess' };
        },
      },
    } as unknown as PrismaClient;

    await createOperatorSession(prisma, 'acct-001', {
      ipAddress: '127.0.0.1',
      userAgent: 'TestAgent/1.0',
    });

    assert.equal(captured['ipAddress'], '127.0.0.1');
    assert.equal(captured['userAgent'], 'TestAgent/1.0');
  });
});

// ── revokeOperatorSession ─────────────────────────────────────────────────────

describe('revokeOperatorSession', () => {
  it('calls updateMany with the hashed token and sets revokedAt', async () => {
    let capturedWhere: Record<string, unknown> = {};
    let capturedData: Record<string, unknown>  = {};
    const prisma = {
      operatorSession: {
        updateMany: async (args: { where: Record<string, unknown>; data: Record<string, unknown> }) => {
          capturedWhere = args.where;
          capturedData  = args.data;
          return { count: 1 };
        },
      },
    } as unknown as PrismaClient;

    const rawToken = createRawSessionToken();
    await revokeOperatorSession(prisma, rawToken);

    assert.equal(capturedWhere['tokenHash'], hashSessionToken(rawToken));
    assert.equal(capturedWhere['revokedAt'], null);
    assert.ok(capturedData['revokedAt'] instanceof Date, 'revokedAt must be a Date');
  });
});

// ── getOperatorFromSessionToken ───────────────────────────────────────────────

describe('getOperatorFromSessionToken — valid session', () => {
  it('returns OperatorIdentity without passwordHash or tokenHash', async () => {
    const prisma = mockPrismaFindSession(makeSessionRow());
    const rawToken = createRawSessionToken();
    const identity = await getOperatorFromSessionToken(prisma, rawToken);

    assert.ok(!('passwordHash' in identity), 'passwordHash must not appear in identity');
    assert.ok(!('tokenHash' in identity),    'tokenHash must not appear in identity');
    assert.equal(identity.id,    'acct-001');
    assert.equal(identity.email, 'admin@example.local');
    assert.equal(identity.role,  'SUPER_ADMIN');
  });

  it('SUPER_ADMIN with empty dealerAccessIds is valid', async () => {
    const prisma = mockPrismaFindSession(makeSessionRow({ dealerAccess: [] }));
    const identity = await getOperatorFromSessionToken(prisma, createRawSessionToken());
    assert.deepEqual(identity.dealerAccessIds, []);
    assert.equal(identity.role, 'SUPER_ADMIN');
  });

  it('dealerAccessIds contains the dealershipId values from OperatorDealerAccess', async () => {
    const prisma = mockPrismaFindSession(makeSessionRow({
      dealerAccess: [
        { dealershipId: 'dealer-aaa' },
        { dealershipId: 'dealer-bbb' },
      ],
    }));
    const identity = await getOperatorFromSessionToken(prisma, createRawSessionToken());
    assert.deepEqual(identity.dealerAccessIds.sort(), ['dealer-aaa', 'dealer-bbb'].sort());
  });
});

describe('getOperatorFromSessionToken — rejection cases', () => {
  it('throws OperatorAuthError(session_not_found) when session row is missing', async () => {
    const prisma = mockPrismaFindSession(null);
    await assert.rejects(
      () => getOperatorFromSessionToken(prisma, createRawSessionToken()),
      (err: OperatorAuthError) => {
        assert.ok(err instanceof OperatorAuthError);
        assert.equal(err.code, 'session_not_found');
        return true;
      }
    );
  });

  it('throws OperatorAuthError(session_revoked) when revokedAt is set', async () => {
    const prisma = mockPrismaFindSession(makeSessionRow({ revokedAt: new Date() }));
    await assert.rejects(
      () => getOperatorFromSessionToken(prisma, createRawSessionToken()),
      (err: OperatorAuthError) => {
        assert.ok(err instanceof OperatorAuthError);
        assert.equal(err.code, 'session_revoked');
        return true;
      }
    );
  });

  it('throws OperatorAuthError(session_expired) when expiresAt is in the past', async () => {
    const past = new Date(Date.now() - 1000);
    const prisma = mockPrismaFindSession(makeSessionRow({ expiresAt: past }));
    await assert.rejects(
      () => getOperatorFromSessionToken(prisma, createRawSessionToken()),
      (err: OperatorAuthError) => {
        assert.ok(err instanceof OperatorAuthError);
        assert.equal(err.code, 'session_expired');
        return true;
      }
    );
  });

  it('throws OperatorAuthError(account_inactive) when account.isActive is false', async () => {
    const prisma = mockPrismaFindSession(makeSessionRow({ isActive: false }));
    await assert.rejects(
      () => getOperatorFromSessionToken(prisma, createRawSessionToken()),
      (err: OperatorAuthError) => {
        assert.ok(err instanceof OperatorAuthError);
        assert.equal(err.code, 'account_inactive');
        return true;
      }
    );
  });
});

// ── OperatorAuthError ─────────────────────────────────────────────────────────

describe('OperatorAuthError', () => {
  it('is an instance of Error', () => {
    const err = new OperatorAuthError('session_expired');
    assert.ok(err instanceof Error);
    assert.ok(err instanceof OperatorAuthError);
  });

  it('name is OperatorAuthError', () => {
    assert.equal(new OperatorAuthError('session_revoked').name, 'OperatorAuthError');
  });

  it('code is accessible on the error', () => {
    assert.equal(new OperatorAuthError('account_inactive').code, 'account_inactive');
  });
});
