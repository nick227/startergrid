// Regression tests for dealership people management: cross-dealership access,
// role escalation, credential takeover, owner safety, invite delivery honesty,
// and the complete first-login flow. Routes run through Fastify inject against
// an in-memory Prisma stand-in with real session cookies.

import assert from 'node:assert/strict';
import { beforeEach, describe, it } from 'node:test';
import type { PrismaClient } from '@prisma/client';
import { buildApp } from '../server/app.js';
import { hashPassword, verifyPassword } from '../services/auth/passwordService.js';
import { hashSessionToken } from '../services/auth/sessionService.js';
import { deliverInvitation, inviteEmailDeliveryEnabled } from '../services/dealership/invitationDelivery.js';
import { createDealership } from '../services/dealer/createDealershipService.js';
import { provisionDefaultChannels } from '../services/dealership/channelSetupService.js';
import { DuplicateDealershipError } from '../services/dealership/httpError.js';
import { platformSlugsForCategory } from '../data/platformCategoryMap.js';

type Row = Record<string, any>;

function matches(row: Row, where: Row | undefined): boolean {
  for (const [key, cond] of Object.entries(where ?? {})) {
    if (key === 'AND' || key === 'OR' || key === 'operator' || key === 'account') continue;
    const value = row[key];
    if (cond === null) { if (value != null) return false; continue; }
    if (cond instanceof Date) { if (+value !== +cond) return false; continue; }
    if (typeof cond === 'object') {
      if ('in' in cond && !cond.in.includes(value)) return false;
      if ('not' in cond && value === cond.not) return false;
      if ('lt' in cond && !(value < cond.lt)) return false;
      continue;
    }
    if (value !== cond) return false;
  }
  return true;
}

let seq = 0;
const nextId = (prefix: string) => `${prefix}-${++seq}`;

function memoryPrisma() {
  const t = {
    accounts: [] as Row[],
    access: [] as Row[],
    sessions: [] as Row[],
    invitations: [] as Row[],
    activity: [] as Row[],
    steps: [] as Row[],
    dealers: [] as Row[],
    accounts2: [] as Row[],
    policies: [] as Row[],
    failChannels: null as null | 'platformAccount' | 'syncPolicy',
  };
  const upsertKeyed = (rows: Row[], where: Row, create: Row, model: 'platformAccount' | 'syncPolicy') => {
    if (t.failChannels === model) throw new Error(`simulated ${model} outage`);
    const key = where.dealershipId_platformSlug;
    const row = rows.find(r => r.dealershipId === key.dealershipId && r.platformSlug === key.platformSlug);
    if (row) return row;
    const created = { ...create };
    rows.push(created);
    return created;
  };
  const withOperator = (row: Row): Row => ({ ...row, operator: t.accounts.find(a => a.id === row.operatorAccountId) });

  const prisma: Row = {
    operatorAccount: {
      findUnique: async ({ where }: Row) => t.accounts.find(a => (where.id ? a.id === where.id : a.email === where.email)) ?? null,
      findMany: async ({ where }: Row = {}) => t.accounts.filter(a => matches(a, where)),
      create: async ({ data }: Row) => {
        const { dealerAccess, ...rest } = data;
        const row = { id: nextId('acct'), isActive: true, mustChangePassword: false, firstLoginAt: null, lastLoginAt: null, avatarUrl: null, ...rest };
        t.accounts.push(row);
        if (dealerAccess?.create) t.access.push({ id: nextId('access'), operatorAccountId: row.id, ...dealerAccess.create });
        return row;
      },
      update: async ({ where, data }: Row) => {
        const row = t.accounts.find(a => a.id === where.id);
        if (!row) throw new Error('account not found');
        Object.assign(row, data);
        return row;
      },
    },
    operatorDealerAccess: {
      findFirst: async ({ where }: Row) => {
        const row = t.access.find(r => matches(r, where));
        return row ? withOperator(row) : null;
      },
      findMany: async ({ where }: Row = {}) => t.access.filter(r => matches(r, where)).map(withOperator),
      create: async ({ data }: Row) => { const row = { id: nextId('access'), ...data }; t.access.push(row); return row; },
      update: async ({ where, data }: Row) => { const row = t.access.find(r => r.id === where.id)!; Object.assign(row, data); return row; },
      delete: async ({ where }: Row) => { const i = t.access.findIndex(r => r.id === where.id); return t.access.splice(i, 1)[0]; },
      upsert: async ({ where, create, update }: Row) => {
        const key = where.operatorAccountId_dealershipId;
        const row = t.access.find(r => r.operatorAccountId === key.operatorAccountId && r.dealershipId === key.dealershipId);
        if (row) { Object.assign(row, update); return row; }
        const created = { id: nextId('access'), ...create };
        t.access.push(created);
        return created;
      },
    },
    operatorSession: {
      findUnique: async ({ where }: Row) => {
        const s = t.sessions.find(r => r.tokenHash === where.tokenHash);
        if (!s) return null;
        const account = t.accounts.find(a => a.id === s.operatorAccountId);
        return { ...s, account: { ...account, dealerAccess: t.access.filter(r => r.operatorAccountId === s.operatorAccountId) } };
      },
      create: async ({ data }: Row) => { const row = { id: nextId('sess'), revokedAt: null, ...data }; t.sessions.push(row); return row; },
      updateMany: async ({ where, data }: Row) => {
        const rows = t.sessions.filter(r => matches(r, where));
        rows.forEach(r => Object.assign(r, data));
        return { count: rows.length };
      },
    },
    operatorInvitation: {
      create: async ({ data }: Row) => {
        const row = { id: nextId('inv'), acceptedAt: null, revokedAt: null, deliveryError: null, createdAt: new Date(), ...data };
        t.invitations.push(row);
        return row;
      },
      findUnique: async ({ where }: Row) => t.invitations.find(r => (where.id ? r.id === where.id : r.tokenHash === where.tokenHash)) ?? null,
      findFirst: async ({ where }: Row) => t.invitations.find(r => matches(r, where)) ?? null,
      findMany: async ({ where }: Row = {}) => t.invitations.filter(r => matches(r, where)),
      update: async ({ where, data }: Row) => { const row = t.invitations.find(r => r.id === where.id)!; Object.assign(row, data); return row; },
      updateMany: async ({ where, data }: Row) => {
        const rows = t.invitations.filter(r => matches(r, where));
        rows.forEach(r => Object.assign(r, data));
        return { count: rows.length };
      },
    },
    dealershipActivityEvent: {
      create: async ({ data }: Row) => { const row = { id: nextId('evt'), createdAt: new Date(), ...data }; t.activity.push(row); return row; },
      findMany: async ({ where, take }: Row) => t.activity.filter(r => matches(r, where)).reverse().slice(0, take),
      findFirst: async ({ where }: Row) => t.activity.filter(r => matches(r, where)).at(-1) ?? null,
    },
    dealershipOnboardingStep: {
      createMany: async ({ data }: Row) => { data.forEach((d: Row) => t.steps.push({ createdAt: new Date(), ...d })); return { count: data.length }; },
      upsert: async ({ where, create, update }: Row) => {
        const key = where.dealershipId_stepKey;
        const row = t.steps.find(r => r.dealershipId === key.dealershipId && r.stepKey === key.stepKey);
        if (row) { Object.assign(row, update); return row; }
        const created = { createdAt: new Date(), ...create };
        t.steps.push(created);
        return created;
      },
    },
    $queryRaw: async () => [],
    platformAccount: {
      findMany: async ({ where }: Row) => t.accounts2.filter(r => r.dealershipId === where.dealershipId),
      upsert: async ({ where, create }: Row) => upsertKeyed(t.accounts2, where, create, 'platformAccount'),
    },
    syncPolicy: {
      findMany: async ({ where }: Row) => t.policies.filter(r => r.dealershipId === where.dealershipId),
      upsert: async ({ where, create }: Row) => upsertKeyed(t.policies, where, create, 'syncPolicy'),
    },
    platformApplication: { findMany: async () => [] },
    dealershipProfile: {
      findFirst: async ({ where }: Row) => t.dealers.find(d => where.OR?.some((c: Row) => c.legalName === d.legalName)) ?? null,
      findUnique: async ({ where }: Row) => {
        const dealer = t.dealers.find(d => d.id === where.id);
        if (!dealer) return null;
        const access = t.access.filter(r => r.dealershipId === dealer.id).map(withOperator);
        return {
          ...dealer,
          _count: { vehicles: 0, invitations: 0, operatorAccess: access.length },
          invitations: t.invitations.filter(r => r.dealershipId === dealer.id && r.accessRole === 'DEALER_OWNER' && !r.revokedAt),
          operatorAccess: access.filter(r => r.accessRole === 'DEALER_OWNER' || r.accessRole === 'DEALER_STAFF'),
          onboardingSteps: t.steps.filter(r => r.dealershipId === dealer.id),
        };
      },
      update: async ({ where, data }: Row) => { const d = t.dealers.find(x => x.id === where.id)!; Object.assign(d, data); return d; },
    },
  };
  prisma['$transaction'] = async (arg: unknown) =>
    typeof arg === 'function' ? arg(prisma) : Promise.all(arg as Promise<unknown>[]);
  return { prisma: prisma as unknown as PrismaClient, t };
}

function addDealer(t: ReturnType<typeof memoryPrisma>['t'], id: string) {
  t.dealers.push({
    id, legalName: `${id} Motors`, dbaName: null, lifecycleStatus: 'SETTING_UP', waitingForStock: false,
    autopilotPreference: 'OFF', launchCompletedAt: null, handoffCompletedAt: null, internalOwnerId: null, createdAt: new Date(),
  });
}

async function addAccount(
  t: ReturnType<typeof memoryPrisma>['t'],
  input: { email: string; role: string; dealers?: Array<[string, string]>; password?: string; mustChangePassword?: boolean },
): Promise<{ id: string; cookie: string }> {
  const id = nextId('acct');
  t.accounts.push({
    id, email: input.email, role: input.role, isActive: true, mustChangePassword: input.mustChangePassword ?? false,
    firstLoginAt: new Date(), lastLoginAt: new Date(), avatarUrl: null,
    passwordHash: await hashPassword(input.password ?? 'original-password-1'),
  });
  for (const [dealershipId, accessRole] of input.dealers ?? []) {
    t.access.push({ id: nextId('access'), operatorAccountId: id, dealershipId, accessRole });
  }
  const raw = `token-${id}`;
  t.sessions.push({ id: nextId('sess'), tokenHash: hashSessionToken(raw), operatorAccountId: id, revokedAt: null, expiresAt: new Date(Date.now() + 3_600_000) });
  return { id, cookie: `op_session=${raw}` };
}

describe('dealership people — authorization boundaries', () => {
  let db: ReturnType<typeof memoryPrisma>;
  let app: ReturnType<typeof buildApp>;
  let ownerA: { id: string; cookie: string };
  let coOwnerA: { id: string; cookie: string };
  let staffA: { id: string; cookie: string };
  let ownerB: { id: string; cookie: string };
  let support: { id: string; cookie: string };
  let siteAdmin: { id: string; cookie: string };
  let sharedLogin: { id: string; cookie: string };

  beforeEach(async () => {
    db = memoryPrisma();
    addDealer(db.t, 'dealer-a');
    addDealer(db.t, 'dealer-b');
    ownerA = await addAccount(db.t, { email: 'owner@a.test', role: 'DEALER_OWNER', dealers: [['dealer-a', 'DEALER_OWNER']] });
    coOwnerA = await addAccount(db.t, { email: 'coowner@a.test', role: 'DEALER_OWNER', dealers: [['dealer-a', 'DEALER_OWNER']] });
    staffA = await addAccount(db.t, { email: 'staff@a.test', role: 'DEALER_STAFF', dealers: [['dealer-a', 'DEALER_STAFF']] });
    ownerB = await addAccount(db.t, { email: 'owner@b.test', role: 'DEALER_OWNER', dealers: [['dealer-b', 'DEALER_OWNER']] });
    support = await addAccount(db.t, { email: 'support@startergrid.test', role: 'INTERNAL_SUPPORT', dealers: [['dealer-a', 'INTERNAL_SUPPORT']] });
    siteAdmin = await addAccount(db.t, { email: 'admin@startergrid.test', role: 'SUPER_ADMIN', dealers: [['dealer-a', 'DEALER_STAFF']] });
    sharedLogin = await addAccount(db.t, { email: 'group@ab.test', role: 'DEALER_STAFF', dealers: [['dealer-a', 'DEALER_STAFF'], ['dealer-b', 'DEALER_STAFF']] });
    app = buildApp(db.prisma);
  });

  const call = (cookie: string, method: 'GET' | 'POST' | 'PATCH' | 'DELETE', url: string, payload?: object) =>
    app.inject({ method, url, headers: { cookie }, ...(payload ? { payload } : {}) });

  it('blocks every people action on a dealership the actor does not belong to', async () => {
    const before = JSON.stringify(db.t);
    const attempts = [
      call(ownerB.cookie, 'GET', '/api/dealers/dealer-a/people'),
      call(ownerB.cookie, 'GET', '/api/dealers/dealer-a/activity'),
      call(ownerB.cookie, 'POST', '/api/dealers/dealer-a/people/invites', { email: 'x@x.test', accessRole: 'DEALER_OWNER' }),
      call(ownerB.cookie, 'POST', '/api/dealers/dealer-a/people/temporary-login', { email: 'x@x.test', accessRole: 'DEALER_STAFF' }),
      call(ownerB.cookie, 'PATCH', `/api/dealers/dealer-a/people/${ownerA.id}`, { resetPassword: true }),
      call(ownerB.cookie, 'DELETE', `/api/dealers/dealer-a/people/${staffA.id}`),
    ];
    for (const res of await Promise.all(attempts)) assert.equal(res.statusCode, 403, res.body);
    assert.equal(JSON.stringify(db.t), before, 'no rows may change');
  });

  it('dealer staff cannot invite, reset, change roles or remove people', async () => {
    const results = await Promise.all([
      call(staffA.cookie, 'POST', '/api/dealers/dealer-a/people/invites', { email: 'x@x.test', accessRole: 'DEALER_STAFF' }),
      call(staffA.cookie, 'PATCH', `/api/dealers/dealer-a/people/${ownerA.id}`, { accessRole: 'DEALER_STAFF' }),
      call(staffA.cookie, 'DELETE', `/api/dealers/dealer-a/people/${ownerA.id}`),
      call(staffA.cookie, 'GET', '/api/dealers/dealer-a/people'),
    ]);
    for (const res of results) assert.equal(res.statusCode, 403, res.body);
  });

  it('a dealer owner cannot create internal staff by invite, temporary login or role change', async () => {
    const invite = await call(ownerA.cookie, 'POST', '/api/dealers/dealer-a/people/invites', { email: 'new@x.test', accessRole: 'INTERNAL_SUPPORT' });
    const temp = await call(ownerA.cookie, 'POST', '/api/dealers/dealer-a/people/temporary-login', { email: 'new@x.test', accessRole: 'INTERNAL_SUPPORT' });
    const promote = await call(ownerA.cookie, 'PATCH', `/api/dealers/dealer-a/people/${staffA.id}`, { accessRole: 'INTERNAL_SUPPORT' });
    assert.equal(invite.statusCode, 403, invite.body);
    assert.equal(temp.statusCode, 403, temp.body);
    assert.equal(promote.statusCode, 403, promote.body);
    assert.equal(db.t.invitations.length, 0);
    assert.ok(!db.t.accounts.some(a => a.email === 'new@x.test'));
    assert.equal(db.t.access.find(r => r.operatorAccountId === staffA.id)?.accessRole, 'DEALER_STAFF');
  });

  it('a dealer owner cannot reset, suspend, demote or remove site-admin or internal-support accounts', async () => {
    const adminHash = db.t.accounts.find(a => a.id === siteAdmin.id)!.passwordHash;
    const results = await Promise.all([
      call(ownerA.cookie, 'PATCH', `/api/dealers/dealer-a/people/${siteAdmin.id}`, { resetPassword: true }),
      call(ownerA.cookie, 'PATCH', `/api/dealers/dealer-a/people/${siteAdmin.id}`, { isActive: false }),
      call(ownerA.cookie, 'PATCH', `/api/dealers/dealer-a/people/${support.id}`, { resetPassword: true }),
      call(ownerA.cookie, 'PATCH', `/api/dealers/dealer-a/people/${support.id}`, { accessRole: 'DEALER_STAFF' }),
      call(ownerA.cookie, 'DELETE', `/api/dealers/dealer-a/people/${support.id}`),
    ]);
    for (const res of results) {
      assert.equal(res.statusCode, 403, res.body);
      assert.ok(!res.body.includes('temporaryPassword'), 'no credential may be disclosed');
    }
    assert.equal(db.t.accounts.find(a => a.id === siteAdmin.id)!.passwordHash, adminHash);
    assert.equal(db.t.accounts.find(a => a.id === siteAdmin.id)!.isActive, true);
    assert.ok(db.t.access.some(r => r.operatorAccountId === support.id));
  });

  it('staff cannot bypass capability checks through legacy profile or connection endpoints', async () => {
    for (const [method,url,payload] of [
      ['PATCH','/api/dealers/dealer-a/profile',{autopilotPreference:'PAUSED'}],
      ['PATCH','/api/dealers/dealer-a/accounts/consumer-marketplace',{dealerEnabled:false}],
      ['POST','/api/dealers/dealer-a/accounts/consumer-marketplace/validate',{}],
    ] as const) {
      const response=await call(staffA.cookie,method,url,payload);
      assert.equal(response.statusCode,403,response.body);
    }
  });

  it('a dealer owner cannot take over an existing login through temporary login', async () => {
    const res = await call(ownerA.cookie, 'POST', '/api/dealers/dealer-a/people/temporary-login', { email: 'admin@startergrid.test', accessRole: 'DEALER_STAFF' });
    assert.equal(res.statusCode, 409, res.body);
    assert.ok(await verifyPassword(db.t.accounts.find(a => a.id === siteAdmin.id)!.passwordHash, 'original-password-1'));
  });

  it('a dealer owner cannot reset a login shared with another dealership', async () => {
    const res = await call(ownerA.cookie, 'PATCH', `/api/dealers/dealer-a/people/${sharedLogin.id}`, { resetPassword: true });
    assert.equal(res.statusCode, 403, res.body);
  });

  it('keeps at least one active owner and blocks self-demotion', async () => {
    const self = await call(ownerA.cookie, 'PATCH', `/api/dealers/dealer-a/people/${ownerA.id}`, { accessRole: 'DEALER_STAFF' });
    assert.equal(self.statusCode, 400, self.body);
    const removeSelf = await call(ownerA.cookie, 'DELETE', `/api/dealers/dealer-a/people/${ownerA.id}`);
    assert.equal(removeSelf.statusCode, 400, removeSelf.body);

    const demote = await call(ownerA.cookie, 'PATCH', `/api/dealers/dealer-a/people/${coOwnerA.id}`, { accessRole: 'DEALER_STAFF' });
    assert.equal(demote.statusCode, 200, demote.body);
    const lastOwner = await call(support.cookie, 'DELETE', `/api/dealers/dealer-a/people/${ownerA.id}`);
    assert.equal(lastOwner.statusCode, 409, lastOwner.body);
    assert.ok(db.t.access.some(r => r.operatorAccountId === ownerA.id && r.accessRole === 'DEALER_OWNER'));
  });

  it('an owner can change roles, reset and remove dealer accounts of their own dealership', async () => {
    const reset = await call(ownerA.cookie, 'PATCH', `/api/dealers/dealer-a/people/${staffA.id}`, { resetPassword: true });
    assert.equal(reset.statusCode, 200, reset.body);
    const body = reset.json() as { person: { email: string }; temporaryPassword: string };
    assert.equal(body.person.email, 'staff@a.test');
    assert.ok(body.temporaryPassword.length >= 16);
    assert.equal(db.t.accounts.find(a => a.id === staffA.id)!.mustChangePassword, true);

    const removed = await call(ownerA.cookie, 'DELETE', `/api/dealers/dealer-a/people/${staffA.id}`);
    assert.equal(removed.statusCode, 200, removed.body);
    assert.ok(!db.t.access.some(r => r.operatorAccountId === staffA.id));
    assert.ok(db.t.accounts.some(a => a.id === staffA.id), 'removal keeps the login itself');
    assert.deepEqual(db.t.activity.map(e => e.action).slice(-2), ['PASSWORD_RESET', 'PERSON_REMOVED']);
  });

  it('only internal staff can create dealerships', async () => {
    const res = await call(ownerA.cookie, 'POST', '/api/dealers', {
      legalName: 'Shadow Motors', businessCategory: 'AUTOMOTIVE',
      rooftopAddress: { street: '1', city: 'x', state: 'TX', postalCode: '1' },
      primaryContact: { name: 'x', email: 'shadow@x.test' }, password: 'password-1234',
    });
    assert.equal(res.statusCode, 403, res.body);
    const record = await call(ownerA.cookie, 'POST', '/api/admin/dealerships', {
      legalName: 'Shadow Motors', businessCategory: 'AUTOMOTIVE', primaryContact: { email: 'shadow@x.test' },
    });
    assert.equal(record.statusCode, 403, record.body);
  });

  it('lists only open invitations with an honest status and real activity', async () => {
    const res = await call(ownerA.cookie, 'POST', '/api/dealers/dealer-a/people/invites', { email: 'new@a.test', accessRole: 'DEALER_STAFF' });
    assert.equal(res.statusCode, 201, res.body);
    const created = res.json() as { delivery: string; invite: { deliveryStatus: string } };
    assert.equal(created.delivery, 'LINK_ONLY', 'no mail service is configured in tests');
    assert.equal(created.invite.deliveryStatus, 'PENDING');

    const first = db.t.invitations[0]!;
    const resend = await call(ownerA.cookie, 'POST', `/api/dealers/dealer-a/people/invites/${first.id}/resend`);
    assert.equal(resend.statusCode, 200, resend.body);
    assert.ok((resend.json() as { setupUrl: string }).setupUrl.includes('#/invite/'));

    const people = (await call(ownerA.cookie, 'GET', '/api/dealers/dealer-a/people')).json() as { invitations: Row[]; people: Row[] };
    assert.equal(people.invitations.length, 1, 'the replaced invitation is not listed');
    assert.equal(people.invitations[0]!.deliveryStatus, 'PENDING');
    assert.ok(people.invitations[0]!.createdAt);
    assert.equal(people.people.find(p => p.email === 'support@startergrid.test')?.isInternal, true);

    const activity = (await call(ownerA.cookie, 'GET', '/api/dealers/dealer-a/activity')).json() as { events: Row[] };
    assert.deepEqual(activity.events.map(e => e.action), ['INVITE_CREATED', 'INVITE_CREATED']);
  });
});

describe('invite acceptance and first login', () => {
  it('accepts an invite, signs in, and records the sign-in for onboarding', async () => {
    const db = memoryPrisma();
    addDealer(db.t, 'dealer-a');
    const support = await addAccount(db.t, { email: 'support@startergrid.test', role: 'INTERNAL_SUPPORT', dealers: [['dealer-a', 'INTERNAL_SUPPORT']] });
    const app = buildApp(db.prisma);
    const created = await app.inject({ method: 'POST', url: '/api/dealers/dealer-a/people/invites', headers: { cookie: support.cookie }, payload: { email: 'Owner@Lakeview.test', accessRole: 'DEALER_OWNER' } });
    assert.equal(created.statusCode, 201, created.body);
    const token = (created.json() as { setupUrl: string }).setupUrl.split('#/invite/')[1]!;

    const preview = await app.inject({ method: 'GET', url: `/api/auth/invites/${token}` });
    assert.equal(preview.statusCode, 200, preview.body);
    assert.equal((preview.json() as { accountExists: boolean }).accountExists, false);

    const accepted = await app.inject({ method: 'POST', url: `/api/auth/invites/${token}/accept`, payload: { password: 'a-strong-password' } });
    assert.equal(accepted.statusCode, 200, accepted.body);
    const cookie = String(accepted.headers['set-cookie']).split(';')[0]!;
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });
    assert.equal(me.statusCode, 200, me.body);
    assert.deepEqual((me.json() as { dealerAccessIds: string[] }).dealerAccessIds, ['dealer-a']);
    const owner = db.t.accounts.find(a => a.email === 'owner@lakeview.test')!;
    assert.equal(owner.role, 'DEALER_OWNER');
    assert.ok(owner.firstLoginAt, 'accepting counts as the first sign-in');
    assert.equal(db.t.steps.find(s => s.stepKey === 'ACCESS')?.status, 'COMPLETE');

    const reuse = await app.inject({ method: 'POST', url: `/api/auth/invites/${token}/accept`, payload: { password: 'a-strong-password' } });
    assert.equal(reuse.statusCode, 409, 'invite links work once');
  });

  it('forces a temporary-password user to change it before using the app', async () => {
    const db = memoryPrisma();
    addDealer(db.t, 'dealer-a');
    const support = await addAccount(db.t, { email: 'support@startergrid.test', role: 'INTERNAL_SUPPORT', dealers: [['dealer-a', 'INTERNAL_SUPPORT']] });
    const app = buildApp(db.prisma);
    const issued = await app.inject({ method: 'POST', url: '/api/dealers/dealer-a/people/temporary-login', headers: { cookie: support.cookie }, payload: { email: 'temp@a.test', accessRole: 'DEALER_STAFF' } });
    assert.equal(issued.statusCode, 201, issued.body);
    const { temporaryPassword, accountId } = issued.json() as { temporaryPassword: string; accountId: string };

    const raw = 'temp-session';
    db.t.sessions.push({ id: 'sess-temp', tokenHash: hashSessionToken(raw), operatorAccountId: accountId, revokedAt: null, expiresAt: new Date(Date.now() + 3_600_000) });
    const cookie = `op_session=${raw}`;
    const blocked = await app.inject({ method: 'GET', url: '/api/dealers/dealer-a/inventory', headers: { cookie } });
    assert.equal(blocked.statusCode, 403);
    assert.equal((blocked.json() as { code: string }).code, 'MUST_CHANGE_PASSWORD');
    const me = await app.inject({ method: 'GET', url: '/api/auth/me', headers: { cookie } });
    assert.equal((me.json() as { mustChangePassword: boolean }).mustChangePassword, true);

    const changed = await app.inject({ method: 'POST', url: '/api/auth/change-password', headers: { cookie }, payload: { currentPassword: temporaryPassword, newPassword: 'my-own-password' } });
    assert.equal(changed.statusCode, 200, changed.body);
    assert.equal(db.t.accounts.find(a => a.id === accountId)!.mustChangePassword, false);
  });

  it('rejects an internal-support invite that was not issued by a site administrator', async () => {
    const db = memoryPrisma();
    addDealer(db.t, 'dealer-a');
    const owner = await addAccount(db.t, { email: 'owner@a.test', role: 'DEALER_OWNER', dealers: [['dealer-a', 'DEALER_OWNER']] });
    const raw = 'legacy-token';
    db.t.invitations.push({
      id: 'inv-legacy', dealershipId: 'dealer-a', email: 'mole@x.test', accessRole: 'INTERNAL_SUPPORT', tokenHash: hashSessionToken(raw),
      expiresAt: new Date(Date.now() + 3_600_000), acceptedAt: null, revokedAt: null, invitedBy: owner.id, deliveryStatus: 'PENDING', createdAt: new Date(),
    });
    const app = buildApp(db.prisma);
    const res = await app.inject({ method: 'POST', url: `/api/auth/invites/${raw}/accept`, payload: { password: 'a-strong-password' } });
    assert.equal(res.statusCode, 403, res.body);
    assert.ok(!db.t.accounts.some(a => a.email === 'mole@x.test'));
  });

  it('never downgrades an existing internal membership when the invitee accepts', async () => {
    const db = memoryPrisma();
    addDealer(db.t, 'dealer-a');
    const owner = await addAccount(db.t, { email: 'owner@a.test', role: 'DEALER_OWNER', dealers: [['dealer-a', 'DEALER_OWNER']] });
    const support = await addAccount(db.t, { email: 'support@startergrid.test', role: 'INTERNAL_SUPPORT', dealers: [['dealer-a', 'INTERNAL_SUPPORT']] });
    const app = buildApp(db.prisma);
    const created = await app.inject({ method: 'POST', url: '/api/dealers/dealer-a/people/invites', headers: { cookie: owner.cookie }, payload: { email: 'support@startergrid.test', accessRole: 'DEALER_STAFF' } });
    const token = (created.json() as { setupUrl: string }).setupUrl.split('#/invite/')[1]!;
    const res = await app.inject({ method: 'POST', url: `/api/auth/invites/${token}/accept`, payload: { password: 'original-password-1' } });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(db.t.access.find(r => r.operatorAccountId === support.id)?.accessRole, 'INTERNAL_SUPPORT');
  });
});

describe('invitation delivery is reported honestly', () => {
  const invite = { inviteId: 'inv-1', email: 'o@x.test', dealershipName: 'Lakeview', roleLabel: 'an owner', setupUrl: 'https://app/#/invite/t' };
  const prod = { NODE_ENV: 'production', SMTP_ENABLED: 'true' };

  it('is link-only unless a production mail server is configured', async () => {
    assert.equal(inviteEmailDeliveryEnabled({ NODE_ENV: 'development', SMTP_ENABLED: 'true' }), false);
    const { prisma, t } = memoryPrisma();
    t.invitations.push({ id: 'inv-1', deliveryStatus: 'PENDING' });
    let sent = 0;
    const result = await deliverInvitation(prisma, invite, { NODE_ENV: 'production' }, async () => { sent += 1; });
    assert.equal(result.delivery, 'LINK_ONLY');
    assert.equal(sent, 0);
    assert.equal(t.invitations[0]!.deliveryStatus, 'PENDING');
  });

  it('marks SENT only after the mail server accepts, FAILED with the reason otherwise', async () => {
    const { prisma, t } = memoryPrisma();
    t.invitations.push({ id: 'inv-1', deliveryStatus: 'PENDING' });
    const ok = await deliverInvitation(prisma, invite, prod, async (msg) => { assert.ok(msg.body.includes(invite.setupUrl)); });
    assert.equal(ok.delivery, 'EMAIL_SENT');
    assert.equal(t.invitations[0]!.deliveryStatus, 'SENT');

    const failed = await deliverInvitation(prisma, invite, prod, async () => { throw new Error('550 mailbox unavailable'); });
    assert.equal(failed.delivery, 'EMAIL_FAILED');
    assert.equal(t.invitations[0]!.deliveryStatus, 'FAILED');
    assert.equal(t.invitations[0]!.deliveryError, '550 mailbox unavailable');
  });
});

describe('dealership creation from essentials', () => {
  it('creates the dealership, owner invitation and activity together', async () => {
    const { prisma, t } = memoryPrisma();
    const staff = await addAccount(t, { email: 'support@startergrid.test', role: 'INTERNAL_SUPPORT' });
    const p = prisma as unknown as Row;
    p['dealershipProfile'].create = async ({ data }: Row) => {
      const row = { id: 'dealer-new', dbaName: null, logoUrl: null, createdAt: new Date(), handoffCompletedAt: null, launchCompletedAt: null, waitingForStock: false, autopilotPreference: 'OFF', ...data };
      t.dealers.push(row);
      return row;
    };

    const result = await createDealership(prisma, {
      legalName: 'Lakeview Motors',
      businessCategory: 'AUTOMOTIVE',
      primaryContact: { email: 'owner@lakeview.test', name: 'Jordan' },
    }, {
      createdByOperatorId: staff.id,
      grantAccessToOperatorId: staff.id,
      internalOwnerId: staff.id,
      inviteOwnerEmail: 'owner@lakeview.test',
      actorEmail: 'support@startergrid.test',
    });
    assert.equal(result.dealer.id, 'dealer-new');
    assert.ok(result.invite?.setupUrl.includes('#/invite/'));
    assert.equal(t.invitations.length, 1);
    assert.equal(t.dealers[0]!.internalOwnerId, staff.id);
    assert.deepEqual(t.activity.map(e => e.action), ['INTERNAL_OWNER_ASSIGNED', 'DEALERSHIP_CREATED', 'INVITE_CREATED']);
    assert.equal(t.steps.find(s => s.stepKey === 'ACCESS')?.ownerKind, 'DEALER', 'the owner now has the next move');
  });
});

describe('default channel setup is recoverable, never ambiguous', () => {
  let seqDealer = 0;
  async function setup() {
    const db = memoryPrisma();
    const staff = await addAccount(db.t, { email: 'support@startergrid.test', role: 'INTERNAL_SUPPORT' });
    (db.prisma as unknown as Row)['dealershipProfile'].create = async ({ data }: Row) => {
      const row = { id: `dealer-${++seqDealer}`, dbaName: null, logoUrl: null, createdAt: new Date(), handoffCompletedAt: null, launchCompletedAt: null, waitingForStock: false, autopilotPreference: 'OFF', ...data };
      db.t.dealers.push(row);
      return row;
    };
    const create = () => createDealership(db.prisma, {
      legalName: 'Lakeview Motors', businessCategory: 'AUTOMOTIVE', primaryContact: { email: 'owner@lakeview.test' },
    }, { createdByOperatorId: staff.id, grantAccessToOperatorId: staff.id, inviteOwnerEmail: 'owner@lakeview.test', actorEmail: 'support@startergrid.test' });
    return { ...db, staff, create };
  }
  const expected = platformSlugsForCategory('AUTOMOTIVE').length;

  it('provisions every default destination when nothing fails', async () => {
    const { t, create } = await setup();
    const result = await create();
    assert.equal(result.channelSetup.status, 'READY');
    assert.equal(t.accounts2.length, expected);
    assert.equal(t.policies.length, expected);
    assert.notEqual(t.steps.find(s => s.stepKey === 'CHANNELS')?.status, 'BLOCKED');
  });

  it('keeps the dealership and invite, reports NEEDS_ATTENTION and blocks the next step when provisioning fails', async () => {
    const { t, create } = await setup();
    t.failChannels = 'platformAccount';
    const result = await create();
    assert.equal(t.dealers.length, 1, 'the committed dealership is kept');
    assert.equal(t.invitations.length, 1, 'and so is the owner invitation');
    assert.equal(result.channelSetup.status, 'NEEDS_ATTENTION');
    assert.equal(result.channelSetup.missing.length, expected);
    assert.match(result.channelSetup.message ?? '', /Retry channel setup/);
    const step = t.steps.find(s => s.stepKey === 'CHANNELS');
    assert.equal(step?.status, 'BLOCKED');
    assert.equal(step?.ownerKind, 'OUR_TEAM');
    const recorded = t.activity.find(e => e.action === 'CHANNEL_SETUP_INCOMPLETE');
    assert.ok(recorded, 'the failure is recorded, not just logged');
    assert.match(String(recorded.detail.error), /simulated platformAccount outage/);
  });

  it('a retry repairs setup idempotently and clears the blocked step', async () => {
    const { prisma, t, staff, create } = await setup();
    t.failChannels = 'platformAccount';
    const { dealer } = await create();
    t.failChannels = null;
    const actor = { id: staff.id, email: 'support@startergrid.test' };
    const first = await provisionDefaultChannels(prisma, dealer.id, actor, { retry: true });
    const second = await provisionDefaultChannels(prisma, dealer.id, actor, { retry: true });
    assert.equal(first.status, 'READY');
    assert.equal(second.status, 'READY');
    assert.equal(t.accounts2.length, expected, 'retries never duplicate channel accounts');
    assert.equal(t.policies.length, expected, 'or sync policies');
    assert.notEqual(t.steps.find(s => s.stepKey === 'CHANNELS')?.status, 'BLOCKED');
    assert.equal(t.activity.filter(e => e.action === 'CHANNEL_SETUP_COMPLETED').length, 2);
  });

  it('repeating the same create returns the existing dealership instead of a duplicate', async () => {
    const { t, create } = await setup();
    t.failChannels = 'syncPolicy';
    const { dealer } = await create();
    t.failChannels = null;
    await assert.rejects(create(), (err: unknown) => err instanceof DuplicateDealershipError && err.existingDealershipId === dealer.id);
    assert.equal(t.dealers.length, 1);
    assert.equal(t.invitations.length, 1);
  });

  it('the API answers 201 with channelSetup, and a repeated create gets 409 with the existing id', async () => {
    const db = await setup();
    const app = buildApp(db.prisma);
    db.t.failChannels = 'platformAccount';
    const payload = { legalName: 'Harbor Motors', businessCategory: 'AUTOMOTIVE', primaryContact: { email: 'o@harbor.test' }, inviteOwnerEmail: 'o@harbor.test' };
    const headers = { cookie: (await addAccount(db.t, { email: 'admin@startergrid.test', role: 'SUPER_ADMIN' })).cookie };
    const first = await app.inject({ method: 'POST', url: '/api/admin/dealerships', headers, payload });
    assert.equal(first.statusCode, 201, first.body);
    const body = first.json() as { dealer: { id: string }; channelSetup: { status: string }; invite: { setupUrl: string } };
    assert.equal(body.channelSetup.status, 'NEEDS_ATTENTION');
    assert.ok(body.invite.setupUrl);

    const again = await app.inject({ method: 'POST', url: '/api/admin/dealerships', headers, payload });
    assert.equal(again.statusCode, 409, again.body);
    assert.equal((again.json() as { existingDealershipId: string }).existingDealershipId, body.dealer.id);

    db.t.failChannels = null;
    const retry = await app.inject({ method: 'POST', url: `/api/admin/dealerships/${body.dealer.id}/channel-setup`, headers });
    assert.equal(retry.statusCode, 200, retry.body);
    assert.equal((retry.json() as { channelSetup: { status: string } }).channelSetup.status, 'READY');
    assert.equal(db.t.dealers.length, 1);
  });

  it('staff without access to the existing dealership are not told its id', async () => {
    const db = await setup();
    db.t.dealers.push({ id: 'dealer-hidden', legalName: 'Hidden Motors', createdAt: new Date() });
    const app = buildApp(db.prisma);
    const res = await app.inject({ method: 'POST', url: '/api/admin/dealerships', headers: { cookie: db.staff.cookie },
      payload: { legalName: 'Hidden Motors', businessCategory: 'AUTOMOTIVE', primaryContact: { email: 'x@hidden.test' } } });
    assert.equal(res.statusCode, 409, res.body);
    assert.equal((res.json() as { existingDealershipId?: string }).existingDealershipId, undefined);
  });
});
