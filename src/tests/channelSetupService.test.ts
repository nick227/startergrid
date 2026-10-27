import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import { platformProfiles } from '../data/platformProfiles.js';
import { brandName, buildSetupPlan, getChannelSetupPlans, isTechnicalField, type ChannelSetupPlan } from '../services/channels/channelSetupService.js';
import type { PlatformAccountDetail } from '../services/publishing/platformAccountService.js';
import { buildApp } from '../server/app.js';
import { isolatedDatabaseUrl } from './helpers/isolatedDatabase.js';

// Account detail for a real platform profile, as listPlatformAccounts would return it.
function account(slug: string, over: Partial<PlatformAccountDetail> = {}): PlatformAccountDetail {
  const p = platformProfiles.find(x => x.slug === slug)!;
  return {
    platformSlug: p.slug, platformName: p.name, integrationClass: p.integrationClass, connectionType: p.connectionType ?? null,
    state: 'ACCOUNT_NEEDED', accountId: null, connectionConfig: null, connectionFields: p.connectionFields,
    oauthProvider: p.oauthProvider ?? null, oauthConnected: false, oauthExpired: false,
    partnerSignup: p.partnerSignup ?? null, integrationUrls: p.integrationUrls ?? null,
    systemSetupReady: true, siteEnabled: true, dealerEnabled: true,
    ...over,
  } as PlatformAccountDetail;
}
const current = (plan: ChannelSetupPlan) => plan.steps.find(s => s.id === plan.currentStepId);
const states = (plan: ChannelSetupPlan) => plan.steps.map(s => `${s.id}:${s.state}`);

describe('channel setup plan', () => {
  it('keeps every channel to at most four short steps with exactly one current step', () => {
    for (const p of platformProfiles) {
      const plan = buildSetupPlan(account(p.slug));
      assert.ok(plan.steps.length <= 4, `${p.slug} has ${plan.steps.length} steps`);
      assert.equal(plan.steps.filter(s => s.state === 'TODO' || s.state === 'BLOCKED').length <= 1, true, `${p.slug} asks for more than one thing at once`);
      for (const s of plan.steps) {
        assert.ok(s.title.split(' ').length <= 7, `${p.slug}: "${s.title}"`);
        assert.ok(s.instruction.length <= 140, `${p.slug}: "${s.instruction}"`);
        assert.doesNotMatch(`${s.title} ${s.instruction}`, /sftp|api key|oauth|endpoint|credential|token/i, `${p.slug} leaks jargon: ${s.instruction}`);
      }
    }
  });

  it('walks a feed partner from account to approval, one owner at a time', () => {
    const fresh = buildSetupPlan(account('cargurus-dealer'));
    assert.equal(fresh.name, 'CarGurus');
    assert.equal(fresh.status, 'NEEDS_YOU');
    assert.equal(fresh.headline, 'Next: get a CarGurus account.');
    assert.deepEqual(states(fresh), ['get-account:TODO', 'enter-details:WAITING', 'support-connect:WAITING', 'provider-approval:WAITING']);
    assert.equal(current(fresh)!.action.kind, 'OPEN_PROVIDER_SITE');
    assert.deepEqual(current(fresh)!.action.markDone, { label: 'I asked them', patch: { state: 'PENDING_REVIEW' } });
    assert.deepEqual(fresh.steps[1]!.action.fields.map(f => [f.key, f.saveAs]), [['accountId', 'accountId']], 'rep contact and SFTP fields are not dealer steps');

    const idEntered = buildSetupPlan(account('cargurus-dealer', { state: 'CREDENTIALS_NEEDED', accountId: 'CG-12345' }));
    assert.equal(idEntered.status, 'WAITING');
    assert.equal(current(idEntered)!.owner, 'INTERNAL_SUPPORT');
    assert.match(idEntered.headline, /Nothing for you to do/);

    const review = buildSetupPlan(account('cargurus-dealer', { state: 'PENDING_REVIEW', accountId: 'CG-12345', connectionConfig: { sftpUsername: 'u', sftpPassword: '****' } }));
    assert.equal(current(review)!.owner, 'PARTNER');
    assert.equal(review.headline, 'Waiting for CarGurus. Nothing for you to do right now.');
    assert.equal(review.providerEstimate, '1–2 weeks');

    const live = buildSetupPlan(account('cargurus-dealer', { state: 'ACTIVE', accountId: 'CG-12345' }));
    assert.equal(live.status, 'READY');
    assert.equal(live.headline, 'CarGurus is set up.');
    assert.doesNotMatch(live.headline, /live|listed|publish/i, 'set up never claims listings are live');
  });

  it('turns provider follow-ups and rejected details back into a dealer step', () => {
    const needsInfo = buildSetupPlan(account('cars-com', { state: 'NEEDS_INFO', accountId: 'X1' }));
    assert.equal(current(needsInfo)!.id, 'provider-approval');
    assert.equal(current(needsInfo)!.owner, 'DEALERSHIP');
    const rejected = buildSetupPlan(account('cars-com', { state: 'FAILED', accountId: 'X1' }));
    assert.equal(current(rejected)!.id, 'enter-details');
    assert.match(current(rejected)!.instruction, /did not accept/);
  });

  it('asks a sign-in channel to sign in with the company, not the product', () => {
    const plan = buildSetupPlan(account('google-vehicle-ads'));
    assert.equal(current(plan)!.title, 'Sign in to Google');
    assert.equal(current(plan)!.action.kind, 'CONNECT_ACCOUNT');
    assert.ok(!plan.steps.some(s => s.id === 'support-connect'), 'no file-transfer step for sign-in channels');
    const expired = buildSetupPlan(account('google-vehicle-ads', { oauthExpired: true }));
    assert.equal(current(expired)!.action.label, 'Sign in again');
    const failed = buildSetupPlan(account('facebook-business-page', { oauthConnected: true, state: 'FAILED' }));
    assert.equal(failed.status, 'BLOCKED');
  });

  it('puts StarterGrid first when the channel is not turned on for the site yet', () => {
    const plan = buildSetupPlan(account('google-vehicle-ads', { systemSetupReady: false }));
    assert.equal(plan.status, 'BLOCKED');
    assert.equal(current(plan)!.id, 'startergrid-enable');
    assert.ok(plan.steps.slice(1).every(s => s.state === 'WAITING'), 'the dealer is not asked to start yet');
  });

  it('asks for a real CRM email and nothing technical', () => {
    const empty = buildSetupPlan(account('adf-xml-lead-routing'));
    assert.equal(empty.name, 'CRM lead delivery');
    assert.deepEqual(states(empty), ['crm-email:TODO']);
    assert.equal(current(empty)!.action.fields[0]!.label, 'CRM lead email');
    const webhook = buildSetupPlan(account('adf-xml-lead-routing', { accountId: 'https://crm.test/hook' }));
    assert.match(current(webhook)!.instruction, /only send leads to an email address/);
    assert.equal(buildSetupPlan(account('adf-xml-lead-routing', { accountId: 'leads@crm.test' })).status, 'READY');
  });

  it('is honest that manual-posting channels need the dealer to post', () => {
    const plan = buildSetupPlan(account('etsy'));
    assert.equal(current(plan)!.title, 'Get an Etsy account');
    assert.deepEqual(current(plan)!.action.markDone, { label: 'I have an account', patch: { state: 'ACTIVE' } });
    assert.match(plan.postingNote!, /can't post to Etsy/);
    assert.ok(!plan.steps.some(s => s.id === 'provider-approval'));
  });

  it('says whether a finished step was observed by StarterGrid or reported by someone', () => {
    const reported = buildSetupPlan(account('cargurus-dealer', { state: 'PENDING_REVIEW' }));
    assert.equal(reported.steps[0]!.doneBasis, 'REPORTED', '"I asked them" is self-reported');
    const observed = buildSetupPlan(account('cargurus-dealer', { state: 'PENDING_REVIEW', accountId: 'CG-12345' }));
    assert.equal(observed.steps[0]!.doneBasis, 'OBSERVED');
    assert.equal(observed.steps[1]!.doneBasis, 'OBSERVED');
    assert.equal(observed.steps[3]!.doneBasis, null, 'not done yet');
    const handActive = buildSetupPlan(account('etsy', { state: 'ACTIVE' }));
    assert.equal(handActive.steps[0]!.doneBasis, 'REPORTED');
    const checked = buildSetupPlan(account('facebook-business-page', { oauthConnected: true, state: 'READY' }));
    assert.deepEqual(checked.steps.map(s => s.doneBasis), ['OBSERVED', 'OBSERVED']);
    const handActiveOauth = buildSetupPlan(account('facebook-business-page', { oauthConnected: true, state: 'ACTIVE' }));
    assert.equal(handActiveOauth.steps[1]!.doneBasis, 'REPORTED');
  });

  it('links support steps to the configured support address', () => {
    const plan = buildSetupPlan(account('cargurus-dealer', { state: 'CREDENTIALS_NEEDED', accountId: 'CG-12345' }), { supportEmail: 'help@sg.test' });
    const support = plan.steps.find(s => s.action.kind === 'CONTACT_SUPPORT')!;
    assert.equal(support.action.url, 'mailto:help@sg.test?subject=CarGurus%20setup%20help');
  });

  it('gives every field format a regex that accepts a real example', () => {
    const examples: Record<string, string> = { 'cargurus-dealer': 'CG-12345', 'truecar-dealer-network': 'TC-123', 'carfax-for-dealers': 'CFX-9' };
    for (const p of platformProfiles) {
      for (const f of p.connectionFields ?? []) {
        if (!f.pattern) continue;
        const re = new RegExp(f.pattern);
        assert.doesNotMatch(f.pattern, /\\\\/, `${p.slug}.${f.field} pattern is double-escaped`);
        if (examples[p.slug]) assert.match(examples[p.slug]!, re, `${p.slug} rejects a valid ID`);
      }
    }
  });

  it('needs no setup for StarterGrid-owned channels', () => {
    const plan = buildSetupPlan(account('consumer-marketplace'));
    assert.equal(plan.status, 'READY');
    assert.equal(plan.steps.length, 0);
  });

  it('treats only secrets and file-transfer details as technical', () => {
    assert.equal(isTechnicalField({ field: 'accountId', label: 'eBay Seller Username' }), false);
    assert.equal(isTechnicalField({ field: 'sftpUsername', label: 'SFTP Username' }), true);
    assert.equal(isTechnicalField({ field: 'apiKey', label: 'API Key', isSecret: true }), true);
    assert.equal(brandName('Autotrader / Cox Automotive Dealer Solutions'), 'Autotrader');
    assert.equal(brandName('Facebook Marketplace (Resale)'), 'Facebook Marketplace');
  });

  it('requires access to the dealership', async () => {
    const previous = process.env['DEV_OPERATOR_DEALER_IDS'];
    process.env['DEV_OPERATOR_DEALER_IDS'] = 'other-dealer';
    try {
      const app = buildApp({} as PrismaClient);
      assert.equal((await app.inject({ method: 'GET', url: '/api/dealers/d1/channels/setup' })).statusCode, 401);
      const res = await app.inject({ method: 'GET', url: '/api/dealers/d1/channels/cargurus-dealer/setup', headers: { 'x-operator-id': 'dev-operator' } });
      assert.equal(res.statusCode, 403);
    } finally {
      if (previous === undefined) delete process.env['DEV_OPERATOR_DEALER_IDS']; else process.env['DEV_OPERATOR_DEALER_IDS'] = previous;
    }
  });
});

const dbUrl = isolatedDatabaseUrl();
describe('channel setup plan (isolated MySQL)', { skip: !dbUrl }, () => {
  it('builds plans from stored accounts for enabled channels and by slug', async () => {
    const db = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    try {
      const dealer = await db.dealershipProfile.create({ data: {
        legalName: 'Setup Plan Motors', rooftopAddress: {}, primaryContact: {}, desiredChannels: [], businessCategory: 'AUTOMOTIVE',
      } });
      await db.platformAccount.create({ data: { dealershipId: dealer.id, platformSlug: 'cargurus-dealer', dealerEnabled: true, state: 'PENDING_REVIEW', accountId: 'CG-12345' } });
      const plans = await getChannelSetupPlans(db, dealer.id);
      const cargurus = plans.find(p => p.channel === 'cargurus-dealer');
      assert.ok(cargurus, 'enabled channel has a plan');
      assert.equal(cargurus.steps.find(s => s.id === 'enter-details')!.state, 'DONE');
      const [crm] = await getChannelSetupPlans(db, dealer.id, 'adf-xml-lead-routing');
      assert.equal(crm?.status, 'NEEDS_YOU');
      await db.dealershipProfile.delete({ where: { id: dealer.id } });
    } finally {
      await db.$disconnect();
    }
  });
});
