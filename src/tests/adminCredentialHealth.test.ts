// Admin platform-credential routes — SUPER_ADMIN gating, audit logging,
// validation caching, secret hygiene, and probe classification.
//
// Prisma is stubbed; no real DB or network calls are made. TikTok credentials
// are faked via env BEFORE the OAuth clients are constructed (dynamic imports
// below) — TikTok has no live probe, so a "configured" provider never triggers
// a network request in these tests.

import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { hashSessionToken, createRawSessionToken, SESSION_LIFETIME_MS } from '../services/auth/sessionService.js';
import { classifyProbeResponse } from '../services/platform/clients/credentialProbe.js';

const FAKE_TIKTOK_ID = 'tiktok-test-app-id';
const FAKE_TIKTOK_SECRET = 'tiktok-test-secret-do-not-leak';
process.env['TIKTOK_CLIENT_ID'] = FAKE_TIKTOK_ID;
process.env['TIKTOK_CLIENT_SECRET'] = FAKE_TIKTOK_SECRET;

// Imported after env setup — OAuth clients read env at construction time.
const { buildApp } = await import('../server/app.js');
const { resetCredentialValidationCache } = await import('../services/platform/credentialHealthService.js');

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
  const prisma = {
    operatorSession: { findUnique: async () => sessionRow },
    adminAuditLog: {
      create: async ({ data }: { data: AuditEntry }) => {
        auditEntries.push(data);
        return { id: 'audit-1', ...data, createdAt: new Date() };
      },
    },
  } as unknown as PrismaClient;
  return { app: buildApp(prisma), token, auditEntries };
}

type InjectResult = { statusCode: number; json(): Record<string, unknown>; body: string };

async function postValidate(app: ReturnType<typeof buildApp>, token: string): Promise<InjectResult> {
  return app.inject({
    method: 'POST',
    url: '/api/admin/platform-credentials/validate',
    headers: { Cookie: `op_session=${token}` },
  }) as unknown as Promise<InjectResult>;
}

describe('admin platform-credentials — SUPER_ADMIN gate', () => {
  it('401 without auth', async () => {
    const { app } = makeApp('SUPER_ADMIN');
    const res = await app.inject({ method: 'GET', url: '/api/admin/platform-credentials' }) as unknown as InjectResult;
    assert.equal(res.statusCode, 401);
  });

  it('403 for OPERATOR on GET list', async () => {
    const { app, token } = makeApp('OPERATOR');
    const res = await app.inject({
      method: 'GET',
      url: '/api/admin/platform-credentials',
      headers: { Cookie: `op_session=${token}` },
    }) as unknown as InjectResult;
    assert.equal(res.statusCode, 403);
    assert.deepEqual(res.json(), { error: 'Super admin access required' });
  });

  it('OPERATOR cannot validate credentials (403, no audit entry)', async () => {
    const { app, token, auditEntries } = makeApp('OPERATOR');
    const res = await postValidate(app, token);
    assert.equal(res.statusCode, 403);
    assert.equal(auditEntries.length, 0);
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
    }
    assert.ok(!res.body.includes(FAKE_TIKTOK_SECRET), 'must not leak secret values');
    assert.ok(!res.body.includes(FAKE_TIKTOK_ID), 'must not leak client ids');
  });
});

describe('POST validate — audit logging and cache throttling', () => {
  beforeEach(() => resetCredentialValidationCache());

  it('SUPER_ADMIN validation creates an audit entry with sanitized detail', async () => {
    const { app, token, auditEntries } = makeApp('SUPER_ADMIN');
    const res = await postValidate(app, token);
    assert.equal(res.statusCode, 200);

    assert.equal(auditEntries.length, 1);
    const entry = auditEntries[0] as AuditEntry;
    assert.equal(entry.action, 'platform-credentials.validate');
    assert.equal(entry.actorId, 'acct-admin');
    assert.equal(entry.actorEmail, 'operator@example.local');
    assert.equal(typeof entry.detail['durationMs'], 'number');
    assert.equal(typeof entry.detail['providerCount'], 'number');
    const statuses = entry.detail['statuses'] as Record<string, string>;
    assert.equal(statuses['tiktok'], 'unsupported');
    assert.ok(!JSON.stringify(entry).includes(FAKE_TIKTOK_SECRET), 'audit must not persist secrets');

    const meta = (res.json() as { meta: Record<string, unknown> }).meta;
    assert.equal(meta['cached'], false);
    assert.equal(meta['checkedBy'], 'operator@example.local');
    assert.equal(typeof meta['lastCheckedAt'], 'string');
    assert.equal(typeof meta['durationMs'], 'number');
  });

  it('repeated validation is served from cache (no second live run or audit entry)', async () => {
    const { app, token, auditEntries } = makeApp('SUPER_ADMIN');
    const first = await postValidate(app, token);
    const second = await postValidate(app, token);

    assert.equal(auditEntries.length, 1, 'cached call must not create another audit entry');
    const firstMeta = (first.json() as { meta: Record<string, unknown> }).meta;
    const secondMeta = (second.json() as { meta: Record<string, unknown> }).meta;
    assert.equal(secondMeta['cached'], true);
    assert.equal(secondMeta['lastCheckedAt'], firstMeta['lastCheckedAt']);
  });

  it('response never includes env var values or raw secrets', async () => {
    const { app, token } = makeApp('SUPER_ADMIN');
    const res = await postValidate(app, token);
    assert.ok(!res.body.includes(FAKE_TIKTOK_SECRET), 'must not leak secret values');
    assert.ok(!res.body.includes(FAKE_TIKTOK_ID), 'must not leak client ids');
  });

  it('configured providers without a live probe still return No live check (unsupported)', async () => {
    const { app, token } = makeApp('SUPER_ADMIN');
    const res = await postValidate(app, token);
    const { results } = res.json() as { results: Array<Record<string, unknown>> };
    const tiktok = results.find(r => r['provider'] === 'tiktok');
    assert.ok(tiktok, 'tiktok provider expected');
    assert.equal(tiktok['configured'], true);
    assert.equal(tiktok['status'], 'unsupported');
    assert.equal(tiktok['checkMethod'], 'none');
  });
});

describe('classifyProbeResponse — sanitized credential probe classification', () => {
  it('200 with access_token → valid', () => {
    assert.equal(classifyProbeResponse('client_credentials', 200, { access_token: 'tok' }).status, 'valid');
    assert.equal(classifyProbeResponse('refresh_token', 200, { access_token: 'tok' }).status, 'valid');
  });

  it('client_credentials 4xx → invalid, raw provider message never surfaced', () => {
    const outcome = classifyProbeResponse('client_credentials', 400, {
      error: { message: 'Error validating application secret abc123', type: 'OAuthException', code: 101 },
    });
    assert.equal(outcome.status, 'invalid');
    assert.ok(!outcome.detail.includes('Error validating application'), 'raw provider message must not surface');
    assert.match(outcome.detail, /OAuthException/);
  });

  it('refresh_token invalid_grant → valid, labeled as inference', () => {
    const outcome = classifyProbeResponse('refresh_token', 400, { error: 'invalid_grant' });
    assert.equal(outcome.status, 'valid');
    assert.match(outcome.detail, /inferred/);
    assert.match(outcome.detail, /not fully validated/);
  });

  it('refresh_token invalid_client → invalid', () => {
    assert.equal(classifyProbeResponse('refresh_token', 400, { error: 'invalid_client' }).status, 'invalid');
  });

  it('refresh_token 401 without error code → invalid', () => {
    assert.equal(classifyProbeResponse('refresh_token', 401, {}).status, 'invalid');
  });

  it('unrecognized error → unknown; error_description never surfaced', () => {
    const outcome = classifyProbeResponse('refresh_token', 400, {
      error: 'temporarily_unavailable',
      error_description: 'sensitive raw provider text',
    });
    assert.equal(outcome.status, 'unknown');
    assert.ok(!outcome.detail.includes('sensitive raw provider text'));
    assert.match(outcome.detail, /temporarily_unavailable/);
  });

  it('malformed error codes are dropped entirely', () => {
    const outcome = classifyProbeResponse('refresh_token', 400, { error: 'bad code with spaces & <html>' });
    assert.equal(outcome.status, 'unknown');
    assert.ok(!outcome.detail.includes('<html>'));
  });

  it('5xx → unknown', () => {
    assert.equal(classifyProbeResponse('client_credentials', 503, {}).status, 'unknown');
  });
});
