import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { hashSessionToken, createRawSessionToken, SESSION_LIFETIME_MS } from '../services/auth/sessionService.js';

const { buildApp } = await import('../server/app.js');
const { resetCredentialValidationCache } = await import('../services/platform/credentialHealthService.js');
const { resetDashboardCache } = await import('../server/routes/admin.js');

type AuditEntry = { action: string; actorId: string; actorEmail: string; detail: Record<string, unknown> };

function makeApp(role: 'SUPER_ADMIN' | 'OPERATOR'): {
  app: ReturnType<typeof buildApp>;
  token: string;
  auditEntries: AuditEntry[];
} {
  const token = createRawSessionToken();
  const sessionRow = {
    id:                'sess-admin',
    tokenHash:         hashSessionToken(token),
    operatorAccountId: 'acct-admin',
    createdAt:         new Date(),
    expiresAt:         new Date(Date.now() + SESSION_LIFETIME_MS),
    revokedAt:         null,
    ipAddress:         null,
    userAgent:         null,
    account: {
      id:           'acct-admin',
      email:        'operator@example.local',
      role,
      isActive:     true,
      passwordHash: '[not-returned]',
      lastLoginAt:  null,
      createdAt:    new Date(),
      updatedAt:    new Date(),
      dealerAccess: [],
    },
  };
  const auditEntries: AuditEntry[] = [];
  
  // prisma mock for dashboard stats
  const prisma = {
    operatorSession: { findUnique: async () => sessionRow },
    adminAuditLog: {
      create: async ({ data }: { data: AuditEntry }) => {
        auditEntries.push(data);
        return { id: 'audit-1', ...data, createdAt: new Date() };
      },
	      findMany: async () => [
	        { id: 'audit-1', action: 'platform-credentials.validate', actorId: 'acct-admin', actorEmail: 'operator@example.local', detail: { dealershipId: 'dl-2', durationMs: 120 }, createdAt: new Date() }
	      ]
	    },
    dealershipProfile: {
      count: async () => 2,
      findMany: async () => [
        { id: 'dl-1', legalName: 'Dealer 1', businessCategory: 'AUTOMOTIVE', rooftopAddress: { street: '123 Main St', city: 'Denver', state: 'CO' }, rooftopLat: 39.7392, rooftopLng: -104.9903 },
        { id: 'dl-2', legalName: 'Dealer 2', businessCategory: 'AUTOMOTIVE', rooftopAddress: { street: '456 Oak Ave', city: 'Denver', state: 'CO' }, rooftopLat: null, rooftopLng: null },
      ]
    },
    publishQueueItem: {
      count: async () => 0,
      findFirst: async () => null,
      findMany: async () => []
    },
    platformApplication: {
      count: async () => 0,
      findMany: async () => []
    },
    marketplaceListing: {
      count: async () => 0,
    },
    socialPost: {
      count: async () => 0,
    },
    syncRun: {
      findFirst: async () => null,
      findMany: async () => []
    },
    syncEvent: {
      count: async () => 0,
      findMany: async () => []
    },
    platformAccount: {
      findMany: async () => []
    }
  } as unknown as PrismaClient;
  
  return { app: buildApp(prisma), token, auditEntries };
}

type InjectResult = { statusCode: number; json(): Record<string, unknown>; body: string };

describe('admin dashboard — access controls & gating', () => {
  it('401 without auth cookie/headers', async () => {
    const { app } = makeApp('SUPER_ADMIN');
    const res = await app.inject({ method: 'GET', url: '/api/admin/dashboard' }) as unknown as InjectResult;
    assert.equal(res.statusCode, 401);
  });

  it('403 for OPERATOR role', async () => {
    const { app, token } = makeApp('OPERATOR');
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/dashboard',
      headers: { Cookie: `op_session=${token}` }
    }) as unknown as InjectResult;
    assert.equal(res.statusCode, 403);
  });

  it('200 for SUPER_ADMIN with consolidated payload', async () => {
    const { app, token } = makeApp('SUPER_ADMIN');
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/dashboard',
      headers: { Cookie: `op_session=${token}` }
    }) as unknown as InjectResult;
    assert.equal(res.statusCode, 200);
    const body = res.json() as Record<string, any>;
    assert.ok(body.health, 'health section present');
    assert.ok(body.readiness, 'readiness section present');
    assert.ok(body.queueSnapshot, 'queueSnapshot section present');
    assert.ok(body.platformOverview, 'platformOverview section present');
    assert.ok(body.dealerAttention, 'dealerAttention section present');
	    assert.ok(body.recentEvents, 'recentEvents section present');
	    assert.ok(body.meta, 'meta section present');
	    assert.equal(body.recentEvents[0].dealerId, 'dl-2');
	  });
});

describe('admin dashboard — operational behaviors & cache', () => {
  beforeEach(() => {
    resetCredentialValidationCache();
    resetDashboardCache();
  });

  it('does not trigger live credential validation probes on page load', async () => {
    const { app, token, auditEntries } = makeApp('SUPER_ADMIN');
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/dashboard',
      headers: { Cookie: `op_session=${token}` }
    }) as unknown as InjectResult;
    assert.equal(res.statusCode, 200);
    assert.equal(auditEntries.length, 0, 'should not validate platform credentials or create validation audit entry');
    const body = res.json() as Record<string, any>;
    assert.equal(body.health.credentials, 'unknown', 'should report unknown credentials health since cache is empty');
  });

  it('repeated call within 60s TTL is served from cache', async () => {
    const { app, token } = makeApp('SUPER_ADMIN');
    const first = await app.inject({
      method: 'GET',
      url: '/api/admin/dashboard',
      headers: { Cookie: `op_session=${token}` }
    }) as unknown as InjectResult;
    assert.equal(first.statusCode, 200);
    const firstBody = first.json() as Record<string, any>;
    assert.equal(firstBody.meta.cached, false);

    const second = await app.inject({
      method: 'GET',
      url: '/api/admin/dashboard',
      headers: { Cookie: `op_session=${token}` }
    }) as unknown as InjectResult;
    assert.equal(second.statusCode, 200);
    const secondBody = second.json() as Record<string, any>;
    assert.equal(secondBody.meta.cached, true);
    assert.equal(secondBody.meta.generatedAt, firstBody.meta.generatedAt);
  });

  it('response contains no secrets, tokens, or raw provider messages', async () => {
    const { app, token } = makeApp('SUPER_ADMIN');
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/dashboard',
      headers: { Cookie: `op_session=${token}` }
    }) as unknown as InjectResult;
    assert.equal(res.statusCode, 200);
    
    // Scan body text for common secret-like patterns
    assert.ok(!res.body.includes('access_token'), 'must not leak token strings');
    assert.ok(!res.body.includes('client_secret'), 'must not leak secret configurations');
    assert.ok(!res.body.includes('private_key'), 'must not leak private keys');
  });

  it('unknown readiness values like smoke tests are set to UNKNOWN', async () => {
    const { app, token } = makeApp('SUPER_ADMIN');
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/dashboard',
      headers: { Cookie: `op_session=${token}` }
    }) as unknown as InjectResult;
    assert.equal(res.statusCode, 200);
    const body = res.json() as Record<string, any>;
    assert.equal(body.readiness.smokeMarketplace, 'UNKNOWN');
    assert.equal(body.readiness.smokeOperator, 'UNKNOWN');
  });

  it('computes cheap DB-driven geocode check coverage', async () => {
    const { app, token } = makeApp('SUPER_ADMIN');
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/dashboard',
      headers: { Cookie: `op_session=${token}` }
    }) as unknown as InjectResult;
    assert.equal(res.statusCode, 200);
    const body = res.json() as Record<string, any>;
    
    // Out of 2 mock dealers, 1 is addressable & geocoded, 1 has null lat/lng.
    // So geoCoordinates check should evaluate to WARNING (50% coverage).
    assert.equal(body.readiness.geoCoordinates, 'WARNING');
  });
});

describe('admin blocked dealers — access controls, gating & functionality', () => {
  beforeEach(() => {
    resetDashboardCache();
  });

  it('401 without auth cookie/headers', async () => {
    const { app } = makeApp('SUPER_ADMIN');
    const res = await app.inject({ method: 'GET', url: '/api/admin/blocked-dealers' }) as unknown as InjectResult;
    assert.equal(res.statusCode, 401);
  });

  it('403 for OPERATOR role', async () => {
    const { app, token } = makeApp('OPERATOR');
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/blocked-dealers',
      headers: { Cookie: `op_session=${token}` }
    }) as unknown as InjectResult;
    assert.equal(res.statusCode, 403);
  });

  it('200 for SUPER_ADMIN with paginated payload and summaries', async () => {
    const { app, token } = makeApp('SUPER_ADMIN');
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/blocked-dealers',
      headers: { Cookie: `op_session=${token}` }
    }) as unknown as InjectResult;
    assert.equal(res.statusCode, 200);
    const body = res.json() as Record<string, any>;
    assert.ok(Array.isArray(body.items), 'items is array');
    assert.ok(body.pagination, 'pagination present');
    assert.ok(body.summary, 'summary present');
    assert.ok(body.meta, 'meta present');
    assert.equal(body.meta.cached, false);
  });

	  it('filters by severity, category, source, platform, and search query', async () => {
    const { app, token } = makeApp('SUPER_ADMIN');
    
    // Filter by severity critical
    const resCrit = await app.inject({
      method: 'GET',
      url: '/api/admin/blocked-dealers?severity=critical',
      headers: { Cookie: `op_session=${token}` }
    }) as unknown as InjectResult;
    assert.equal(resCrit.statusCode, 200);
    const bodyCrit = resCrit.json() as Record<string, any>;
    assert.ok(bodyCrit.items.every((item: any) => item.severity === 'critical'));

    // Filter by source
    const resSrc = await app.inject({
      method: 'GET',
      url: '/api/admin/blocked-dealers?source=geo',
      headers: { Cookie: `op_session=${token}` }
    }) as unknown as InjectResult;
    assert.equal(resSrc.statusCode, 200);
    const bodySrc = resSrc.json() as Record<string, any>;
    assert.ok(bodySrc.items.every((item: any) => item.source === 'geo'));

    // Search query q
    const resQ = await app.inject({
      method: 'GET',
      url: '/api/admin/blocked-dealers?q=Dealer',
      headers: { Cookie: `op_session=${token}` }
    }) as unknown as InjectResult;
    assert.equal(resQ.statusCode, 200);
    const bodyQ = resQ.json() as Record<string, any>;
	    assert.ok(bodyQ.items.every((item: any) => item.dealerName.includes('Dealer') || item.reason.includes('Dealer')));
	  });

	  it('filters by dealerId', async () => {
	    const { app, token } = makeApp('SUPER_ADMIN');
	    const res = await app.inject({
	      method: 'GET',
	      url: '/api/admin/blocked-dealers?dealerId=dl-2',
	      headers: { Cookie: `op_session=${token}` }
	    }) as unknown as InjectResult;
	    assert.equal(res.statusCode, 200);
	    const body = res.json() as Record<string, any>;
	    assert.ok(body.items.length > 0, 'expected mock dealer dl-2 to have at least one blocker');
	    assert.ok(body.items.every((item: any) => item.dealerId === 'dl-2'));
	    assert.equal(body.summary.total, body.items.length);
	  });

  it('serves from cache on repeated requests', async () => {
    const { app, token } = makeApp('SUPER_ADMIN');
    
    const res1 = await app.inject({
      method: 'GET',
      url: '/api/admin/blocked-dealers?limit=5',
      headers: { Cookie: `op_session=${token}` }
    }) as unknown as InjectResult;
    assert.equal(res1.statusCode, 200);
    const body1 = res1.json() as Record<string, any>;
    assert.equal(body1.meta.cached, false);

    const res2 = await app.inject({
      method: 'GET',
      url: '/api/admin/blocked-dealers?limit=5',
      headers: { Cookie: `op_session=${token}` }
    }) as unknown as InjectResult;
    assert.equal(res2.statusCode, 200);
    const body2 = res2.json() as Record<string, any>;
    assert.equal(body2.meta.cached, true);
    assert.equal(body2.meta.generatedAt, body1.meta.generatedAt);
  });

  it('sanitizes secrets and sensitive details', async () => {
    const { app, token } = makeApp('SUPER_ADMIN');
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/blocked-dealers',
      headers: { Cookie: `op_session=${token}` }
    }) as unknown as InjectResult;
    assert.equal(res.statusCode, 200);
    assert.ok(!res.body.includes('access_token'), 'must not leak tokens');
    assert.ok(!res.body.includes('client_secret'), 'must not leak secrets');
  });
});
