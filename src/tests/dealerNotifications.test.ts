import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const DEALER_ID = 'dealer-dn-test';
const SESSION_EXPIRY = new Date(Date.now() + 60 * 60 * 1000);

const SOLD_NOTIFICATION = {
  id: 'dn-1',
  type: 'VEHICLE_SOLD_MARKETPLACE',
  payload: {
    vehicleId: 'veh-dn-001',
    stockNumber: 'DN-001',
    platformSlug: 'consumer-marketplace',
  },
  deliveryStatus: 'PENDING',
  deliveredAt: null,
  createdAt: new Date('2026-06-12T10:00:00Z'),
};

function makeSession(role: 'SUPER_ADMIN' | 'OPERATOR' = 'SUPER_ADMIN', dealershipId = DEALER_ID) {
  return {
    id: 'sess-dn',
    tokenHash: 'irrelevant',
    operatorAccountId: 'op-dn',
    createdAt: new Date(),
    expiresAt: SESSION_EXPIRY,
    revokedAt: null,
    ipAddress: null,
    userAgent: null,
    account: {
      id: 'op-dn',
      email: 'admin@test.local',
      role,
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

type FindManyArgs = {
  where?: Record<string, unknown>;
  take?: number;
  orderBy?: Record<string, unknown>;
};

function makePrisma(opts: {
  session?: ReturnType<typeof makeSession> | null;
  rows?: Array<Record<string, unknown>>;
  capture?: (args: FindManyArgs) => void;
} = {}): PrismaClient {
  const session = 'session' in opts ? opts.session : makeSession();
  const rows = opts.rows ?? [SOLD_NOTIFICATION];

  return {
    operatorSession: { findUnique: async () => session },
    dealerNotification: {
      findMany: async (args: FindManyArgs) => {
        opts.capture?.(args);
        return rows;
      },
    },
  } as unknown as PrismaClient;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('GET /api/dealers/:dealershipId/notifications', () => {
  it('returns 401 with no session', async () => {
    const app = buildApp(makePrisma({ session: null }));
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/notifications`,
    });
    assert.equal(res.statusCode, 401);
  });

  it('returns 403 when operator lacks access to the dealership', async () => {
    const app = buildApp(makePrisma({ session: makeSession('OPERATOR', 'some-other-dealer') }));
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/notifications`,
      headers: authCookie(),
    });
    assert.equal(res.statusCode, 403);
  });

  it('returns notifications most recent first with total', async () => {
    let captured: FindManyArgs | undefined;
    const app = buildApp(makePrisma({ capture: args => { captured = args; } }));
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/notifications`,
      headers: authCookie(),
    });

    assert.equal(res.statusCode, 200);
    const body = res.json() as { notifications: Array<{ id: string; type: string }>; total: number };
    assert.equal(body.total, 1);
    assert.equal(body.notifications[0]?.id, 'dn-1');
    assert.equal(body.notifications[0]?.type, 'VEHICLE_SOLD_MARKETPLACE');

    assert.deepEqual(captured?.orderBy, { createdAt: 'desc' });
    assert.equal(captured?.take, 50);
    assert.deepEqual(captured?.where, { dealershipId: DEALER_ID });
  });

  it('applies type filter and clamps limit to 200', async () => {
    let captured: FindManyArgs | undefined;
    const app = buildApp(makePrisma({ capture: args => { captured = args; } }));
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/notifications?type=VEHICLE_SOLD_MARKETPLACE&limit=9999`,
      headers: authCookie(),
    });

    assert.equal(res.statusCode, 200);
    assert.deepEqual(captured?.where, {
      dealershipId: DEALER_ID,
      type: 'VEHICLE_SOLD_MARKETPLACE',
    });
    assert.equal(captured?.take, 200);
  });
});
