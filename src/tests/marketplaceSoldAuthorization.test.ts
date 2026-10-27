// POST /api/marketplace/vehicles/:listingId/sold — authorization.
//
// The listing id is public (it is in every marketplace URL), so it must never authorize
// recording a sale. Only an operator with access to the vehicle's dealership may mark it
// sold; anonymous and cross-dealership callers must leave inventory untouched.

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';

const DEALER_ID = 'dealer-sold-a';
const OTHER_DEALER_ID = 'dealer-sold-b';
const LISTING_ID = 'veh-sold-001';
const URL = `/api/marketplace/vehicles/${LISTING_ID}/sold`;

type Writes = { vehicleUpdates: unknown[]; listingUpdates: unknown[]; notifications: unknown[] };

function makeSession(role: 'OPERATOR' | 'SUPER_ADMIN', dealerAccessIds: string[]) {
  return {
    id: 'sess-sold',
    tokenHash: 'irrelevant',
    operatorAccountId: 'op-sold',
    createdAt: new Date(),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    revokedAt: null,
    account: {
      id: 'op-sold',
      email: 'operator@test.local',
      role,
      isActive: true,
      avatarUrl: null,
      mustChangePassword: false,
      dealerAccess: dealerAccessIds.map(dealershipId => ({ dealershipId })),
    },
  };
}

function makePrisma(session: ReturnType<typeof makeSession> | null, writes: Writes): PrismaClient {
  return {
    operatorSession: { findUnique: async () => session },
    vehicle: {
      findFirst: async () => ({
        id: LISTING_ID, dealershipId: DEALER_ID, year: 2021, make: 'Honda', model: 'Civic', stockNumber: 'SOLD-1',
      }),
      update: async (args: unknown) => { writes.vehicleUpdates.push(args); return {}; },
    },
    marketplaceListing: {
      updateMany: async (args: unknown) => { writes.listingUpdates.push(args); return { count: 0 }; },
    },
    dealerNotification: {
      create: async (args: unknown) => { writes.notifications.push(args); return {}; },
    },
  } as unknown as PrismaClient;
}

function emptyWrites(): Writes {
  return { vehicleUpdates: [], listingUpdates: [], notifications: [] };
}

function assertNoWrites(writes: Writes) {
  assert.equal(writes.vehicleUpdates.length, 0, 'vehicle must not be updated');
  assert.equal(writes.listingUpdates.length, 0, 'listing must not be ended');
  assert.equal(writes.notifications.length, 0, 'dealer must not be notified');
}

const cookie = { cookie: 'op_session=mock-session-token' };

describe('POST /api/marketplace/vehicles/:listingId/sold — authorization', () => {
  let savedNodeEnv: string | undefined;
  let savedDevOperator: string | undefined;

  beforeEach(() => {
    savedNodeEnv = process.env['NODE_ENV'];
    savedDevOperator = process.env['DEV_OPERATOR_ID'];
    delete process.env['DEV_OPERATOR_ID'];
  });

  afterEach(() => {
    if (savedNodeEnv === undefined) delete process.env['NODE_ENV'];
    else process.env['NODE_ENV'] = savedNodeEnv;
    if (savedDevOperator === undefined) delete process.env['DEV_OPERATOR_ID'];
    else process.env['DEV_OPERATOR_ID'] = savedDevOperator;
  });

  it('rejects an anonymous request with 401 and changes nothing', async () => {
    const writes = emptyWrites();
    const app = buildApp(makePrisma(null, writes));
    const res = await app.inject({ method: 'POST', url: URL });
    assert.equal(res.statusCode, 401);
    assertNoWrites(writes);
  });

  it('rejects an unknown or revoked session cookie with 401 and changes nothing', async () => {
    const writes = emptyWrites();
    const app = buildApp(makePrisma(null, writes));
    const res = await app.inject({ method: 'POST', url: URL, headers: cookie });
    assert.equal(res.statusCode, 401);
    assertNoWrites(writes);
  });

  it('rejects the dev operator header in production with 401 and changes nothing', async () => {
    process.env['NODE_ENV'] = 'production';
    const writes = emptyWrites();
    const app = buildApp(makePrisma(null, writes));
    const res = await app.inject({ method: 'POST', url: URL, headers: { 'x-operator-id': 'attacker' } });
    assert.equal(res.statusCode, 401);
    assertNoWrites(writes);
  });

  it('rejects an operator of another dealership with 403 and changes nothing', async () => {
    const writes = emptyWrites();
    const app = buildApp(makePrisma(makeSession('OPERATOR', [OTHER_DEALER_ID]), writes));
    const res = await app.inject({ method: 'POST', url: URL, headers: cookie });
    assert.equal(res.statusCode, 403);
    assertNoWrites(writes);
  });

  it('lets an operator of the vehicle\'s dealership mark it sold', async () => {
    const writes = emptyWrites();
    const app = buildApp(makePrisma(makeSession('OPERATOR', [DEALER_ID]), writes));
    const res = await app.inject({ method: 'POST', url: URL, headers: cookie });
    assert.equal(res.statusCode, 200);
    assert.equal(writes.vehicleUpdates.length, 1);
    assert.equal(writes.notifications.length, 1);
  });

  it('lets internal staff (SUPER_ADMIN) mark it sold', async () => {
    const writes = emptyWrites();
    const app = buildApp(makePrisma(makeSession('SUPER_ADMIN', []), writes));
    const res = await app.inject({ method: 'POST', url: URL, headers: cookie });
    assert.equal(res.statusCode, 200);
    assert.equal(writes.vehicleUpdates.length, 1);
  });
});
