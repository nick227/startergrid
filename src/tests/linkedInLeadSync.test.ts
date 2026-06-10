import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { LinkedInLeadGenClient } from '../services/leadSync/LinkedInLeadGenClient.js';
import { LinkedInLeadCaptureBridge } from '../services/leadSync/bridges/LinkedInLeadCaptureBridge.js';
import { LEAD_SYNC_BRIDGE_SLUGS } from '../server/routes/leadSync.js';
import { LEAD_SYNC_SLUGS } from '../lib/platformCapabilityManifest.js';
import { platformProfiles } from '../data/platformProfiles.js';

const DEALER_ID = 'dealer-li-test';
const ACCOUNT_ID = '98765432';
const FORM_URN = 'urn:li:leadGenForm:111222';
const SESSION_EXPIRY = new Date(Date.now() + 3600_000);

const LIVE_TOKEN = {
  id: 'tok-li', dealershipId: DEALER_ID, provider: 'microsoft', accessToken: 'li-bearer-token',
  refreshToken: null, tokenType: 'Bearer', scope: null,
  expiresAt: new Date(Date.now() + 3600_000),
  rawPayload: {}, createdAt: new Date(), updatedAt: new Date(),
};

const PLATFORM_ACCOUNT = {
  id: 'acct-li', dealershipId: DEALER_ID, platformSlug: 'linkedin-lead-gen-forms',
  state: 'LIVE' as const, accountId: ACCOUNT_ID,
  platformRepName: null, platformRepEmail: null,
  membershipStatus: null, nextAction: null, nextActionOwner: null, notes: null,
  lastChecked: null, createdAt: new Date(), updatedAt: new Date(),
};

function makeSession() {
  return {
    id: 'sess-li', tokenHash: 'x', operatorAccountId: 'op-li',
    createdAt: new Date(), expiresAt: SESSION_EXPIRY, revokedAt: null,
    ipAddress: null, userAgent: null,
    account: {
      id: 'op-li', email: 'admin@test.local', role: 'SUPER_ADMIN' as const,
      isActive: true, passwordHash: 'x', lastLoginAt: null,
      createdAt: new Date(), updatedAt: new Date(),
      dealerAccess: [{ dealershipId: DEALER_ID }],
    },
  };
}

function makePrisma(opts: {
  tokenRow?: unknown;
  platformAccount?: unknown;
  lastLead?: unknown;
  createdLead?: unknown;
} = {}): PrismaClient {
  const token = 'tokenRow' in opts ? opts.tokenRow : LIVE_TOKEN;
  const account = 'platformAccount' in opts ? opts.platformAccount : PLATFORM_ACCOUNT;
  const lastLead = 'lastLead' in opts ? opts.lastLead : null;
  const createdLead = 'createdLead' in opts
    ? opts.createdLead
    : { id: 'lead-li-001', dealershipId: DEALER_ID, platformSlug: 'linkedin-lead-gen-forms' };
  return {
    operatorSession: { findUnique: async () => makeSession() },
    dealershipProfile: { findUnique: async () => ({ id: DEALER_ID, legalName: 'T', businessCategory: 'AUTOMOTIVE' }) },
    platformOAuthToken: { findUnique: async () => token, upsert: async () => token },
    platformAccount: { findUnique: async () => account },
    lead: {
      findFirst: async () => lastLead,
      create: async () => createdLead,
    },
  } as unknown as PrismaClient;
}

// ── LinkedInLeadGenClient.listLeadForms ───────────────────────────────────────

describe('LinkedInLeadGenClient.listLeadForms', () => {
  it('GETs /rest/leadGenForms with Authorization and LinkedIn-Version headers', async () => {
    let capturedReq: { url: string; headers: Record<string, string> } | null = null;
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string, init: RequestInit) => {
      capturedReq = { url: String(url), headers: init.headers as Record<string, string> };
      return {
        ok: true, status: 200,
        json: async () => ({
          elements: [
            { id: FORM_URN, formName: '2026 Ford F-150 Lead Form', status: 'ACTIVE' },
          ],
        }),
      };
    }) as unknown as typeof globalThis.fetch;
    try {
      const forms = await LinkedInLeadGenClient.listLeadForms('li-bearer-token', ACCOUNT_ID);
      assert.ok(capturedReq !== null);
      const req = capturedReq as { url: string; headers: Record<string, string> };
      assert.ok(req.url.includes('/rest/leadGenForms'), `URL ${req.url} should include /rest/leadGenForms`);
      assert.ok(req.url.includes(encodeURIComponent(`urn:li:organization:${ACCOUNT_ID}`)), 'URL should include encoded org URN');
      assert.equal(req.headers['Authorization'], 'Bearer li-bearer-token');
      assert.equal(req.headers['LinkedIn-Version'], '202305');
      assert.equal(forms.length, 1);
      assert.equal(forms[0]!.urn, FORM_URN);
      assert.equal(forms[0]!.name, '2026 Ford F-150 Lead Form');
      assert.equal(forms[0]!.status, 'ACTIVE');
    } finally { globalThis.fetch = orig; }
  });

  it('returns empty array when no forms exist', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200, json: async () => ({ elements: [] }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const forms = await LinkedInLeadGenClient.listLeadForms('li-bearer-token', ACCOUNT_ID);
      assert.equal(forms.length, 0);
    } finally { globalThis.fetch = orig; }
  });

  it('throws on API error with status code in message', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false, status: 401,
      json: async () => ({ message: 'Invalid access token' }),
    })) as unknown as typeof globalThis.fetch;
    try {
      await assert.rejects(
        () => LinkedInLeadGenClient.listLeadForms('bad-token', ACCOUNT_ID),
        /LinkedIn Lead Gen API 401/,
      );
    } finally { globalThis.fetch = orig; }
  });
});

// ── LinkedInLeadGenClient.getLeadResponses ────────────────────────────────────

describe('LinkedInLeadGenClient.getLeadResponses', () => {
  it('GETs /rest/leadFormResponses with form URN and returns normalized leads', async () => {
    let capturedUrl = '';
    const orig = globalThis.fetch;
    globalThis.fetch = (async (url: string) => {
      capturedUrl = String(url);
      return {
        ok: true, status: 200,
        json: async () => ({
          elements: [
            {
              id: 'urn:li:leadFormResponse:999',
              leadGenForm: FORM_URN,
              submittedAt: Date.now(),
              formResponseFieldValues: [
                { questionId: 'firstName', fieldValues: [{ value: 'Jane' }] },
                { questionId: 'lastName',  fieldValues: [{ value: 'Smith' }] },
                { questionId: 'emailAddress', fieldValues: [{ value: 'jane@example.com' }] },
                { questionId: 'phoneNumber',  fieldValues: [{ value: '555-987-6543' }] },
              ],
            },
          ],
        }),
      };
    }) as unknown as typeof globalThis.fetch;
    try {
      const leads = await LinkedInLeadGenClient.getLeadResponses('li-bearer-token', FORM_URN);
      assert.ok(capturedUrl.includes('/rest/leadFormResponses'), `URL should include /rest/leadFormResponses`);
      assert.ok(capturedUrl.includes(encodeURIComponent(FORM_URN)), 'URL should include encoded form URN');
      assert.equal(leads.length, 1);
      assert.equal(leads[0]!.contactName, 'Jane Smith');
      assert.equal(leads[0]!.contactEmail, 'jane@example.com');
      assert.equal(leads[0]!.contactPhone, '555-987-6543');
      assert.equal(leads[0]!.externalId, 'urn:li:leadFormResponse:999');
    } finally { globalThis.fetch = orig; }
  });

  it('filters out responses older than since date', async () => {
    const orig = globalThis.fetch;
    const pastMs = Date.now() - 86_400_000; // 24 h ago
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({
        elements: [
          { id: 'old', leadGenForm: FORM_URN, submittedAt: pastMs - 1000, formResponseFieldValues: [] },
          { id: 'new', leadGenForm: FORM_URN, submittedAt: Date.now(), formResponseFieldValues: [] },
        ],
      }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const since = new Date(pastMs);
      const leads = await LinkedInLeadGenClient.getLeadResponses('tok', FORM_URN, since);
      assert.equal(leads.length, 1);
      assert.equal(leads[0]!.externalId, 'new');
    } finally { globalThis.fetch = orig; }
  });

  it('throws on API error', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: false, status: 403,
      json: async () => ({ message: 'Forbidden' }),
    })) as unknown as typeof globalThis.fetch;
    try {
      await assert.rejects(
        () => LinkedInLeadGenClient.getLeadResponses('bad', FORM_URN),
        /LinkedIn Lead Responses API 403/,
      );
    } finally { globalThis.fetch = orig; }
  });
});

// ── LinkedInLeadCaptureBridge ─────────────────────────────────────────────────

describe('LinkedInLeadCaptureBridge', () => {
  const bridge = new LinkedInLeadCaptureBridge();

  it('platformSlug is linkedin-lead-gen-forms', () => {
    assert.equal(bridge.platformSlug, 'linkedin-lead-gen-forms');
  });

  it('oauthProvider is microsoft', () => {
    assert.equal(bridge.oauthProvider, 'microsoft');
  });

  it('listLeadForms delegates to LinkedInLeadGenClient', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({ elements: [{ id: FORM_URN, formName: 'Test Form', status: 'ACTIVE' }] }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const forms = await bridge.listLeadForms('tok', ACCOUNT_ID);
      assert.equal(forms.length, 1);
      assert.equal(forms[0]!.urn, FORM_URN);
    } finally { globalThis.fetch = orig; }
  });

  it('getLeadResponses delegates to LinkedInLeadGenClient', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({
        elements: [
          {
            id: 'urn:li:leadFormResponse:1',
            leadGenForm: FORM_URN,
            submittedAt: Date.now(),
            formResponseFieldValues: [
              { questionId: 'firstName', fieldValues: [{ value: 'Bob' }] },
            ],
          },
        ],
      }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const leads = await bridge.getLeadResponses('tok', FORM_URN);
      assert.equal(leads.length, 1);
      assert.equal(leads[0]!.contactName, 'Bob');
    } finally { globalThis.fetch = orig; }
  });
});

// ── HTTP routes ───────────────────────────────────────────────────────────────

describe('GET /linkedin-lead-gen-forms/lead-forms', () => {
  it('returns 400 for unknown platform slug', async () => {
    const app = buildApp(makePrisma());
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/platforms/not-a-lead-platform/lead-forms`,
      headers: { cookie: 'op_session=mock' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('returns 400 when accountId not configured', async () => {
    const app = buildApp(makePrisma({ platformAccount: { ...PLATFORM_ACCOUNT, accountId: null } }));
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/platforms/linkedin-lead-gen-forms/lead-forms`,
      headers: { cookie: 'op_session=mock' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('returns 402 when no OAuth token', async () => {
    const app = buildApp(makePrisma({ tokenRow: null }));
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/platforms/linkedin-lead-gen-forms/lead-forms`,
      headers: { cookie: 'op_session=mock' },
    });
    assert.equal(res.statusCode, 402);
  });

  it('returns 200 with forms array on success', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({
        elements: [{ id: FORM_URN, formName: 'Fleet Inquiry Form', status: 'ACTIVE' }],
      }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma());
      const res = await app.inject({
        method: 'GET',
        url: `/api/dealers/${DEALER_ID}/platforms/linkedin-lead-gen-forms/lead-forms`,
        headers: { cookie: 'op_session=mock' },
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body) as { forms: unknown[] };
      assert.ok(Array.isArray(body.forms));
      assert.equal(body.forms.length, 1);
    } finally { globalThis.fetch = orig; }
  });
});

describe('POST /linkedin-lead-gen-forms/lead-sync', () => {
  it('returns 400 for unknown platform slug', async () => {
    const app = buildApp(makePrisma());
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/not-a-lead-platform/lead-sync`,
      headers: { cookie: 'op_session=mock' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('returns 402 when no OAuth token', async () => {
    const app = buildApp(makePrisma({ tokenRow: null }));
    const res = await app.inject({
      method: 'POST',
      url: `/api/dealers/${DEALER_ID}/platforms/linkedin-lead-gen-forms/lead-sync`,
      headers: { cookie: 'op_session=mock' },
    });
    assert.equal(res.statusCode, 402);
  });

  it('returns 200 with zero counts when no forms', async () => {
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => ({
      ok: true, status: 200,
      json: async () => ({ elements: [] }),
    })) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma());
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/linkedin-lead-gen-forms/lead-sync`,
        headers: { cookie: 'op_session=mock' },
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body) as { fetched: number; saved: number; skipped: number };
      assert.equal(body.fetched, 0);
      assert.equal(body.saved, 0);
      assert.equal(body.skipped, 0);
    } finally { globalThis.fetch = orig; }
  });

  it('returns fetched/saved counts when leads come back', async () => {
    let callCount = 0;
    const orig = globalThis.fetch;
    globalThis.fetch = (async () => {
      callCount++;
      // First call = listLeadForms, subsequent = getLeadResponses
      if (callCount === 1) {
        return {
          ok: true, status: 200,
          json: async () => ({ elements: [{ id: FORM_URN, formName: 'Test', status: 'ACTIVE' }] }),
        };
      }
      return {
        ok: true, status: 200,
        json: async () => ({
          elements: [{
            id: 'urn:li:leadFormResponse:42',
            leadGenForm: FORM_URN,
            submittedAt: Date.now(),
            formResponseFieldValues: [
              { questionId: 'firstName', fieldValues: [{ value: 'Alice' }] },
              { questionId: 'emailAddress', fieldValues: [{ value: 'alice@example.com' }] },
            ],
          }],
        }),
      };
    }) as unknown as typeof globalThis.fetch;
    try {
      const app = buildApp(makePrisma());
      const res = await app.inject({
        method: 'POST',
        url: `/api/dealers/${DEALER_ID}/platforms/linkedin-lead-gen-forms/lead-sync`,
        headers: { cookie: 'op_session=mock' },
      });
      assert.equal(res.statusCode, 200);
      const body = JSON.parse(res.body) as { fetched: number; saved: number; skipped: number };
      assert.equal(body.fetched, 1);
      assert.equal(body.saved, 1);
      assert.equal(body.skipped, 0);
    } finally { globalThis.fetch = orig; }
  });
});

// ── Manifest consistency ──────────────────────────────────────────────────────

describe('LinkedIn Lead Gen manifest consistency', () => {
  it('linkedin-lead-gen-forms is in LEAD_SYNC_SLUGS', () => {
    assert.ok(LEAD_SYNC_SLUGS.has('linkedin-lead-gen-forms'));
  });

  it('linkedin-lead-gen-forms is in LEAD_SYNC_BRIDGE_SLUGS', () => {
    assert.ok(LEAD_SYNC_BRIDGE_SLUGS.has('linkedin-lead-gen-forms'));
  });

  it('LinkedInLeadCaptureBridge.platformSlug matches registry key', () => {
    const bridge = new LinkedInLeadCaptureBridge();
    assert.equal(bridge.platformSlug, 'linkedin-lead-gen-forms');
  });

  it('LinkedInLeadCaptureBridge.oauthProvider matches profile oauthProvider', () => {
    const bridge = new LinkedInLeadCaptureBridge();
    const profile = platformProfiles.find(p => p.slug === 'linkedin-lead-gen-forms');
    assert.ok(profile, 'linkedin-lead-gen-forms profile not found');
    assert.equal(bridge.oauthProvider, profile.oauthProvider);
  });

  it('profile has leadSync:true', () => {
    const profile = platformProfiles.find(p => p.slug === 'linkedin-lead-gen-forms');
    assert.ok(profile?.leadSync, 'linkedin-lead-gen-forms missing leadSync:true');
  });

  it('profile has liveValidationNote', () => {
    const profile = platformProfiles.find(p => p.slug === 'linkedin-lead-gen-forms');
    assert.ok(profile?.liveValidationNote, 'linkedin-lead-gen-forms missing liveValidationNote');
  });

  it('profile does NOT have catalogSync:true', () => {
    const profile = platformProfiles.find(p => p.slug === 'linkedin-lead-gen-forms');
    assert.ok(!profile?.catalogSync, 'linkedin-lead-gen-forms should not be a catalog sync platform');
  });

  it('linkedin-lead-gen-forms is NOT in CATALOG_SYNC_SLUGS (wrong lane)', async () => {
    const { CATALOG_SYNC_SLUGS } = await import('../lib/platformCapabilityManifest.js');
    assert.ok(!CATALOG_SYNC_SLUGS.has('linkedin-lead-gen-forms'));
  });
});
