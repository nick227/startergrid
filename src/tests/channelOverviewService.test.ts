import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { platformProfiles } from '../data/platformProfiles.js';
import { CHANNEL_PURPOSES, channelCapabilities, primaryPurpose } from '../services/channels/channelPurpose.js';
import { channelOverviewItem, getChannelOverview, summarizePurposes } from '../services/channels/channelOverviewService.js';
import { buildSetupPlan } from '../services/channels/channelSetupService.js';
import type { PlatformAccountDetail } from '../services/publishing/platformAccountService.js';
import { buildApp } from '../server/app.js';
import { isolatedDatabaseUrl } from './helpers/isolatedDatabase.js';

function account(slug: string, over: Partial<PlatformAccountDetail> = {}): PlatformAccountDetail {
  const p = platformProfiles.find(x => x.slug === slug)!;
  return {
    platformSlug: p.slug, platformName: p.name, integrationClass: p.integrationClass, connectionType: p.connectionType ?? null,
    state: 'ACCOUNT_NEEDED', accountId: null, connectionConfig: null, connectionFields: p.connectionFields,
    oauthProvider: p.oauthProvider ?? null, oauthConnected: false, oauthExpired: false, highestConfirmedLevel: null,
    partnerSignup: p.partnerSignup ?? null, integrationUrls: p.integrationUrls ?? null,
    systemSetupReady: true, siteEnabled: true, dealerEnabled: false,
    ...over,
  } as PlatformAccountDetail;
}
const none = { distribution: { verifiedLive: 0, inProgress: 0, problems: 0 }, openIncidents: 0 };
const item = (a: PlatformAccountDetail, evidence = none) => channelOverviewItem(a, buildSetupPlan(a), evidence);

describe('channel purpose', () => {
  it('gives every channel exactly one of the four purposes', () => {
    const allowed = new Set(CHANNEL_PURPOSES.map(p => p.purpose));
    for (const p of platformProfiles) assert.ok(allowed.has(primaryPurpose(p)), p.slug);
  });

  it('classifies channels by what they are for, not by their profile kind alone', () => {
    const purpose = (slug: string) => primaryPurpose(platformProfiles.find(p => p.slug === slug)!);
    assert.equal(purpose('cargurus-dealer'), 'MARKETPLACE');
    assert.equal(purpose('consumer-marketplace'), 'MARKETPLACE');
    assert.equal(purpose('facebook-marketplace-general'), 'MARKETPLACE');
    assert.equal(purpose('google-vehicle-ads'), 'SOCIAL_ADVERTISING');
    assert.equal(purpose('facebook-business-page'), 'SOCIAL_ADVERTISING');
    assert.equal(purpose('linkedin-lead-gen-forms'), 'SOCIAL_ADVERTISING');
    assert.equal(purpose('dealer-storefront'), 'INVENTORY_FEED');
    assert.equal(purpose('shopify-catalog'), 'INVENTORY_FEED');
    assert.equal(purpose('adf-xml-lead-routing'), 'LEAD_DELIVERY');
  });

  it('keeps other abilities as capabilities instead of extra purposes', () => {
    const caps = (slug: string) => channelCapabilities(platformProfiles.find(p => p.slug === slug)!);
    assert.deepEqual(caps('cargurus-dealer'), ['LISTINGS', 'PARTNER_FEED']);
    assert.deepEqual(caps('linkedin-lead-gen-forms'), ['LEADS']);
    assert.deepEqual(caps('facebook-business-page'), ['SOCIAL_POSTS']);
  });
});

describe('channel display status', () => {
  it('is NOT_SET_UP until the dealership starts, even when StarterGrid has not turned it on', () => {
    assert.equal(item(account('cargurus-dealer')).displayStatus, 'NOT_SET_UP');
    assert.equal(item(account('google-vehicle-ads', { systemSetupReady: false })).displayStatus, 'NOT_SET_UP');
  });

  it('is SETTING_UP with who it is waiting on', () => {
    const turnedOn = item(account('cargurus-dealer', { dealerEnabled: true }));
    assert.equal(turnedOn.displayStatus, 'SETTING_UP');
    assert.equal(turnedOn.waitingOn, 'DEALERSHIP');
    const review = item(account('cargurus-dealer', { state: 'PENDING_REVIEW', accountId: 'CG-12345', connectionConfig: { sftpUsername: 'u', sftpPassword: '***' } }));
    assert.equal(review.displayStatus, 'SETTING_UP');
    assert.equal(review.waitingOn, 'PARTNER');
    assert.equal(review.displayReason, 'Waiting for CarGurus. Nothing for you to do right now.');
  });

  it('is CONNECTED once setup is complete, without claiming anything is live', () => {
    const done = item(account('cargurus-dealer', { state: 'ACTIVE', accountId: 'CG-12345' }));
    assert.equal(done.displayStatus, 'CONNECTED');
    assert.equal(done.displayReason, 'Set up. No listings confirmed live yet.');
    assert.equal(done.connection.state, 'NOT_CHECKED', 'a hand-set ACTIVE is not a verified connection');
    const checked = item(account('cargurus-dealer', { state: 'READY', accountId: 'CG-12345' }));
    assert.equal(checked.connection.state, 'VERIFIED');
  });

  it('says vehicles are live only from verified distribution evidence', () => {
    const live = item(account('consumer-marketplace', { dealerEnabled: true }), { distribution: { verifiedLive: 3, inProgress: 2, problems: 0 }, openIncidents: 0 });
    assert.equal(live.displayStatus, 'CONNECTED');
    assert.equal(live.displayReason, '3 vehicles confirmed live.');
    const queued = item(account('consumer-marketplace', { dealerEnabled: true }), { distribution: { verifiedLive: 0, inProgress: 5, problems: 0 }, openIncidents: 0 });
    assert.doesNotMatch(queued.displayReason, /live\./, 'in-progress sends are not live');
  });

  it('is NEEDS_ATTENTION for a failed connection, expired sign-in, hold, or delivery problems', () => {
    assert.match(item(account('cars-com', { state: 'FAILED', accountId: 'X' })).displayReason, /did not accept/);
    assert.match(item(account('google-vehicle-ads', { oauthExpired: true })).displayReason, /sign-in expired/);
    assert.match(item(account('cars-com', { state: 'SUSPENDED' })).displayReason, /on hold/);
    const problems = item(account('consumer-marketplace', { dealerEnabled: true }), { distribution: { verifiedLive: 1, inProgress: 0, problems: 2 }, openIncidents: 0 });
    assert.equal(problems.displayStatus, 'NEEDS_ATTENTION');
    assert.match(problems.displayReason, /2 vehicles are not confirmed/);
    for (const i of [problems, item(account('cars-com', { state: 'FAILED' }))]) assert.equal(i.displayStatus, 'NEEDS_ATTENTION');
  });

  it('counts each channel once, under its primary purpose', () => {
    const items = [
      item(account('cargurus-dealer', { dealerEnabled: true })),
      item(account('linkedin-lead-gen-forms', { oauthConnected: true, state: 'READY', accountId: 'li-1' })), // ads + leads capability
      item(account('adf-xml-lead-routing', { accountId: 'leads@crm.test', dealerEnabled: true })),
      item(account('cars-com')),
    ];
    const purposes = summarizePurposes(items);
    const total = purposes.reduce((n, p) => n + p.total, 0);
    assert.equal(total, items.length);
    const counted = purposes.reduce((n, p) => n + Object.values(p.counts).reduce((a, b) => a + b, 0), 0);
    assert.equal(counted, items.length);
    assert.equal(purposes.find(p => p.purpose === 'LEAD_DELIVERY')!.counts.CONNECTED, 1);
    assert.equal(purposes.find(p => p.purpose === 'SOCIAL_ADVERTISING')!.counts.CONNECTED, 1, 'LinkedIn counts once despite leads');
  });

  it('requires access to the dealership', async () => {
    const previous = process.env['DEV_OPERATOR_DEALER_IDS'];
    process.env['DEV_OPERATOR_DEALER_IDS'] = 'other-dealer';
    try {
      const app = buildApp({} as PrismaClient);
      assert.equal((await app.inject({ method: 'GET', url: '/api/dealers/d1/channels/overview' })).statusCode, 401);
      const res = await app.inject({ method: 'GET', url: '/api/dealers/d1/channels/overview', headers: { 'x-operator-id': 'dev-operator' } });
      assert.equal(res.statusCode, 403);
    } finally {
      if (previous === undefined) delete process.env['DEV_OPERATOR_DEALER_IDS']; else process.env['DEV_OPERATOR_DEALER_IDS'] = previous;
    }
  });
});

const dbUrl = isolatedDatabaseUrl();
describe('channel overview (isolated MySQL)', { skip: !dbUrl }, () => {
  it('reads accounts, distribution targets and incidents from the real schema', async () => {
    const db = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    try {
      const dealer = await db.dealershipProfile.create({ data: {
        legalName: 'Overview Motors', rooftopAddress: {}, primaryContact: {}, desiredChannels: [], businessCategory: 'AUTOMOTIVE',
      } });
      await db.platformAccount.create({ data: { dealershipId: dealer.id, platformSlug: 'cars-com', dealerEnabled: true, state: 'FAILED', accountId: 'X1' } });
      await db.platformAccount.create({ data: { dealershipId: dealer.id, platformSlug: 'cargurus-dealer', dealerEnabled: true, state: 'PENDING_REVIEW', accountId: 'CG-12345' } });
      const overview = await getChannelOverview(db, dealer.id);
      const byChannel = new Map(overview.channels.map(c => [c.channel, c]));
      assert.equal(byChannel.get('cars-com')?.displayStatus, 'NEEDS_ATTENTION');
      assert.equal(byChannel.get('cargurus-dealer')?.displayStatus, 'SETTING_UP');
      assert.equal(overview.purposes.reduce((n, p) => n + p.total, 0), overview.channels.length);
      const one = await getChannelOverview(db, dealer.id, 'cars-com');
      assert.deepEqual(one.channels.map(c => c.channel), ['cars-com']);
      await db.dealershipProfile.delete({ where: { id: dealer.id } });
    } finally {
      await db.$disconnect();
    }
  });
});
