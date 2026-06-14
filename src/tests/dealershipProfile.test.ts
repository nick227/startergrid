import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import {
  computePublishingWarnings,
  summarizeNotificationChannels,
} from '../services/dealer/dealershipProfileService.js';

const DEALER_ID = 'dealer-profile-test';
const OTHER_DEALER_ID = 'dealer-other';
const SESSION_EXPIRY = new Date(Date.now() + 60 * 60 * 1000);

const BASE_ROW = {
  id: DEALER_ID,
  legalName: 'Messy Motors Inc',
  dbaName: 'Messy Motors' as string | null,
  businessCategory: 'AUTOMOTIVE',
  websiteUrl: 'https://messymotors.example.com' as string | null,
  logoUrl: null,
  dealerLicense: 'TX-123',
  primaryContact: {
    name: 'Earl Tibbets',
    email: 'earl@messymotors.example.com',
    phone: '+15125550199',
  },
  rooftopAddress: {
    street: '88 Salvage Yard Ln',
    city: 'Pflugerville',
    state: 'TX',
    postalCode: '78660',
    country: 'US',
  },
  notificationChannels: {
    email: { enabled: true },
    discord: { webhookUrl: 'https://discord.com/api/webhooks/abc/xyz' },
    autoResponse: { enabled: true },
  },
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-06-01T00:00:00Z'),
};

function makeSession(role: 'SUPER_ADMIN' | 'OPERATOR' = 'SUPER_ADMIN', dealershipId = DEALER_ID) {
  return {
    id: 'sess-profile',
    tokenHash: 'irrelevant',
    operatorAccountId: 'op-profile',
    createdAt: new Date(),
    expiresAt: SESSION_EXPIRY,
    revokedAt: null,
    ipAddress: null,
    userAgent: null,
    account: {
      id: 'op-profile',
      email: 'operator@test.local',
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

function makePrisma(opts: {
  session?: ReturnType<typeof makeSession> | null;
  row?: typeof BASE_ROW | null;
  onUpdate?: (data: Record<string, unknown>) => void;
} = {}): PrismaClient {
  let row = opts.row === undefined ? { ...BASE_ROW } : opts.row ? { ...opts.row } : null;
  const session = 'session' in opts ? opts.session : makeSession();

  return {
    operatorSession: { findUnique: async () => session },
    dealershipProfile: {
      findUnique: async () => row,
      update: async ({ data }: { data: Record<string, unknown> }) => {
        if (!row) throw new Error('missing');
        opts.onUpdate?.(data);
        if (data.legalName !== undefined) row.legalName = data.legalName as string;
        if (data.dbaName !== undefined) row.dbaName = data.dbaName as string | null;
        if (data.websiteUrl !== undefined) row.websiteUrl = data.websiteUrl as string | null;
        if (data.primaryContact !== undefined) {
          row.primaryContact = data.primaryContact as typeof BASE_ROW.primaryContact;
        }
        if (data.rooftopAddress !== undefined) {
          row.rooftopAddress = data.rooftopAddress as typeof BASE_ROW.rooftopAddress;
        }
        row.updatedAt = new Date('2026-06-14T00:00:00Z');
        return row;
      },
    },
  } as unknown as PrismaClient;
}

describe('dealership profile helpers', () => {
  it('summarizes configured notification channels without secrets', () => {
    const summary = summarizeNotificationChannels(BASE_ROW.notificationChannels);
    assert.equal(summary.email.enabled, true);
    assert.equal(summary.discord.configured, true);
    assert.equal(summary.telegram.configured, false);
    assert.equal(summary.autoResponse.enabled, true);
  });

  it('flags missing website and contact for publishing readiness', () => {
    const warnings = computePublishingWarnings({
      websiteUrl: null,
      primaryContact: { name: 'Earl', email: '', phone: null },
      rooftopAddress: { street: '', city: '', state: '', postalCode: '', country: 'US' },
    });
    assert.ok(warnings.some(w => w.field === 'websiteUrl' && w.severity === 'critical'));
    assert.ok(warnings.some(w => w.field === 'primaryContact.email'));
    assert.ok(warnings.some(w => w.field === 'rooftopAddress.city'));
  });
});

describe('GET /api/dealers/:dealershipId/profile', () => {
  it('returns 401 with no session', async () => {
    const app = buildApp(makePrisma({ session: null }));
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/profile`,
    });
    assert.equal(res.statusCode, 401);
  });

  it('returns 403 when operator lacks dealership access', async () => {
    const app = buildApp(makePrisma({ session: makeSession('OPERATOR', OTHER_DEALER_ID) }));
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/profile`,
      headers: authCookie(),
    });
    assert.equal(res.statusCode, 403);
  });

  it('returns full profile for authorized operator', async () => {
    const app = buildApp(makePrisma({ session: makeSession('OPERATOR', DEALER_ID) }));
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/profile`,
      headers: authCookie(),
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { profile: { legalName: string; notificationChannels: { discord: { configured: boolean } } } };
    assert.equal(body.profile.legalName, 'Messy Motors Inc');
    assert.equal(body.profile.notificationChannels.discord.configured, true);
  });

  it('returns 404 when dealer missing', async () => {
    const app = buildApp(makePrisma({ row: null }));
    const res = await app.inject({
      method: 'GET',
      url: `/api/dealers/${DEALER_ID}/profile`,
      headers: authCookie(),
    });
    assert.equal(res.statusCode, 404);
  });
});

describe('PATCH /api/dealers/:dealershipId/profile', () => {
  it('returns 403 when operator lacks dealership access', async () => {
    const app = buildApp(makePrisma({ session: makeSession('OPERATOR', OTHER_DEALER_ID) }));
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/dealers/${DEALER_ID}/profile`,
      headers: authCookie(),
      payload: { websiteUrl: 'https://updated.example.com' },
    });
    assert.equal(res.statusCode, 403);
  });

  it('validates request body', async () => {
    const app = buildApp(makePrisma());
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/dealers/${DEALER_ID}/profile`,
      headers: authCookie(),
      payload: { websiteUrl: 'not-a-url' },
    });
    assert.equal(res.statusCode, 400);
  });

  it('merges partial profile updates', async () => {
    let captured: Record<string, unknown> | undefined;
    const app = buildApp(makePrisma({ onUpdate: data => { captured = data; } }));
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/dealers/${DEALER_ID}/profile`,
      headers: authCookie(),
      payload: {
        websiteUrl: 'https://www.messymotors.com',
        primaryContact: { phone: '+15125550999' },
        rooftopAddress: { city: 'Austin' },
      },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { profile: { websiteUrl: string; primaryContact: { phone: string }; rooftopAddress: { city: string } } };
    assert.equal(body.profile.websiteUrl, 'https://www.messymotors.com');
    assert.equal(body.profile.primaryContact.phone, '+15125550999');
    assert.equal(body.profile.rooftopAddress.city, 'Austin');
    assert.equal((captured?.primaryContact as { email: string }).email, 'earl@messymotors.example.com');
  });

  it('allows super admin to update any dealer', async () => {
    const app = buildApp(makePrisma({ session: makeSession('SUPER_ADMIN', OTHER_DEALER_ID) }));
    const res = await app.inject({
      method: 'PATCH',
      url: `/api/dealers/${DEALER_ID}/profile`,
      headers: authCookie(),
      payload: { dbaName: 'Messy Motors Updated' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json() as { profile: { dbaName: string } };
    assert.equal(body.profile.dbaName, 'Messy Motors Updated');
  });
});
