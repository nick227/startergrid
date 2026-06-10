// Admin platform-credential routes — SUPER_ADMIN gating and probe classification.
//
// Prisma is stubbed; no real DB or network calls are made (the gate tests never
// reach the probe, and classification tests exercise the pure classifier).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { hashSessionToken, createRawSessionToken, SESSION_LIFETIME_MS } from '../services/auth/sessionService.js';
import { classifyProbeResponse } from '../services/platform/clients/credentialProbe.js';

function makeApp(role: 'SUPER_ADMIN' | 'OPERATOR'): { app: ReturnType<typeof buildApp>; token: string } {
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
  const prisma = {
    operatorSession: { findUnique: async () => sessionRow },
  } as unknown as PrismaClient;
  return { app: buildApp(prisma), token };
}

type InjectResult = { statusCode: number; json(): Record<string, unknown> };

describe('GET /api/admin/platform-credentials — SUPER_ADMIN gate', () => {
  it('401 without auth', async () => {
    const { app } = makeApp('SUPER_ADMIN');
    const res = await app.inject({ method: 'GET', url: '/api/admin/platform-credentials' }) as unknown as InjectResult;
    assert.equal(res.statusCode, 401);
  });

  it('403 for OPERATOR role', async () => {
    const { app, token } = makeApp('OPERATOR');
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/platform-credentials',
      headers: { Cookie: `op_session=${token}` },
    }) as unknown as InjectResult;
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.json(), { error: 'Super admin access required' });
  });

  it('200 for SUPER_ADMIN with provider summaries (no secret values)', async () => {
    const { app, token } = makeApp('SUPER_ADMIN');
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/platform-credentials',
      headers: { Cookie: `op_session=${token}` },
    }) as unknown as InjectResult;
    assert.equal(res.statusCode, 200);
    const body = res.json() as { providers: Array<Record<string, unknown>> };
    assert.ok(body.providers.length > 0, 'expected at least one provider');
    for (const p of body.providers) {
      assert.equal(typeof p['provider'], 'string');
      assert.equal(typeof p['configured'], 'boolean');
      assert.ok(Array.isArray(p['platformSlugs']));
      assert.ok(Array.isArray(p['envVars']));
      assert.ok(!('clientSecret' in p) && !('clientId' in p), 'must not leak credentials');
    }
  });

  it('403 for OPERATOR on POST validate', async () => {
    const { app, token } = makeApp('OPERATOR');
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/platform-credentials/validate',
      headers: { Cookie: `op_session=${token}` },
    }) as unknown as InjectResult;
    assert.equal(res.statusCode, 403);
  });
});

describe('classifyProbeResponse — credential probe classification', () => {
  it('200 with access_token → valid (any grant)', () => {
    assert.equal(classifyProbeResponse('client_credentials', 200, { access_token: 'tok' }).status, 'valid');
    assert.equal(classifyProbeResponse('refresh_token', 200, { access_token: 'tok' }).status, 'valid');
  });

  it('client_credentials 4xx → invalid', () => {
    const outcome = classifyProbeResponse('client_credentials', 400, { error: { message: 'Error validating application', type: 'OAuthException', code: 101 } });
    assert.equal(outcome.status, 'invalid');
    assert.match(outcome.detail, /Error validating application/);
  });

  it('refresh_token invalid_grant → valid (client authenticated, bogus grant rejected)', () => {
    assert.equal(classifyProbeResponse('refresh_token', 400, { error: 'invalid_grant' }).status, 'valid');
  });

  it('refresh_token invalid_client → invalid', () => {
    assert.equal(classifyProbeResponse('refresh_token', 400, { error: 'invalid_client' }).status, 'invalid');
  });

  it('refresh_token 401 without error code → invalid', () => {
    assert.equal(classifyProbeResponse('refresh_token', 401, {}).status, 'invalid');
  });

  it('refresh_token unrecognized error → unknown with detail', () => {
    const outcome = classifyProbeResponse('refresh_token', 400, { error: 'temporarily_unavailable', error_description: 'try later' });
    assert.equal(outcome.status, 'unknown');
    assert.equal(outcome.detail, 'temporarily_unavailable: try later');
  });

  it('5xx → unknown', () => {
    assert.equal(classifyProbeResponse('client_credentials', 503, {}).status, 'unknown');
  });
});
