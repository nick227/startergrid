import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAttention, type AttentionItem } from '../services/attention/attentionService.js';
import { buildApp } from '../server/app.js';
import { PrismaClient } from '@prisma/client';
import { isolatedDatabaseUrl } from './helpers/isolatedDatabase.js';

const PROD_SMTP = { NODE_ENV: 'production', SMTP_ENABLED: 'true' };
const NO_SMTP = { NODE_ENV: 'test' };
const fourDaysAgo = new Date(Date.now() - 4 * 24 * 3600_000);

const complete = {
  id: 'veh_ok', stockNumber: 'OK-1', vin: '1HGCR2F8XNA000001', year: 2022, make: 'Honda', model: 'CR-V', trim: null,
  mileage: 12000, priceCents: 2500000, condition: 'USED', exteriorColor: 'Blue', bodyStyle: 'SUV', listingStatus: 'READY',
  soldAt: null, removedAt: null, reactivatedAt: null, updatedAt: new Date(), media: [], _count: { media: 0 },
};
const blocked = { ...complete, id: 'veh_bad', stockNumber: 'BAD-1', vin: '', priceCents: 0 };
const sold = { id: 'veh_sold', stockNumber: 'SOLD-1', year: 2021, make: 'Ford', model: 'F-150', vin: '1FTFW1E50PFA12345', soldAt: fourDaysAgo, removedAt: null };

type Fixture = {
  active?: any[];
  sold?: any[];
  listings?: any[];
  targets?: any[];
  accounts?: any[];
  incidents?: any[];
  attempts?: any[];
  leads?: any[];
  crmAddress?: string | null;
  failOn?: 'inventory';
};

// Answers each source's queries the way Prisma would, from plain rows.
function fakeDb(f: Fixture): any {
  return {
    vehicle: {
      findMany: async ({ where }: any) => {
        if (where.OR) return f.sold ?? [];                       // take-down audit: sold/removed
        if (where.id?.in) return [...(f.active ?? []), ...(f.sold ?? [])].filter(v => where.id.in.includes(v.id));
        if (f.failOn === 'inventory') throw new Error('inventory query failed');
        return f.active ?? [];
      },
      count: async () => 0,
      findFirst: async () => null,                                // public marketplace read: not public
    },
    categoryInventoryItem: { findMany: async () => [] },
    marketplaceListing: { findMany: async () => (f.listings ?? []).map(l => ({ dealershipId: 'd1', categoryItemId: null, status: 'ACTIVE', ...l })) },
    distributionTarget: {
      count: async () => 0,
      findMany: async (args: any) => args?.distinct ? [] : (f.targets ?? []).map(t => ({ dealershipId: 'd1', ...t })),
    },
    platformAccount: {
      findMany: async (args: any) => args?.where?.dealerEnabled ? (f.accounts ?? []) : [],
      findFirst: async () => (f.crmAddress === undefined || f.crmAddress === null ? null : { accountId: f.crmAddress }),
    },
    distributionIncident: { findMany: async () => f.incidents ?? [] },
    leadDeliveryAttempt: { findMany: async () => f.attempts ?? [] },
    lead: { findMany: async (args: any) => args?.where?.workflowStatus ? (f.leads ?? []).filter(l => l.workflowStatus === args.where.workflowStatus) : f.leads ?? [] },
  };
}

const find = (items: AttentionItem[], kind: string) => items.find(i => i.kind === kind);

describe('attention list', () => {
  it('reports vehicles that cannot be listed with the fix action and the first problem', async () => {
    const res = await getAttention(fakeDb({ active: [blocked, complete] }), 'd1', NO_SMTP);
    const info = find(res.items, 'VEHICLE_INFORMATION_MISSING')!;
    assert.equal(info.count, 1);
    assert.equal(info.owner, 'DEALERSHIP');
    assert.equal(info.severity, 'BLOCKING');
    assert.equal(info.action.kind, 'FIX_VEHICLES');
    assert.equal(info.records[0]!.vehicleId, 'veh_bad');
    assert.match(info.records[0]!.detail ?? '', /VIN/, 'the first failing check from the inventory list');
    const photos = find(res.items, 'VEHICLE_PHOTOS_MISSING')!;
    assert.deepEqual(photos.records.map(r => r.id), ['veh_ok'], 'blocked vehicles are not counted twice');
    assert.equal(res.items[0]!.severity, 'BLOCKING', 'blocking items sort first');
  });

  it('splits sold-vehicle removals by evidence and owner, never counting them as done', async () => {
    const res = await getAttention(fakeDb({
      sold: [sold],
      listings: [{ id: 'l_ebay', vehicleId: 'veh_sold', platformSlug: 'ebay' }],
      targets: [
        { id: 't_cg', vehicleId: 'veh_sold', channel: 'cargurus', operation: 'WITHDRAW', status: 'NEEDS_SETUP', reasonCode: 'CHANNEL_UNQUALIFIED', owner: 'INTERNAL_SUPPORT', nextAction: 'Ask support to confirm removal with the destination.' },
        { id: 't_q', vehicleId: 'veh_sold', channel: 'consumer-marketplace', operation: 'WITHDRAW', status: 'PROCESSING', owner: 'SYSTEM', nextAction: 'Wait for destination verification.' },
      ],
    }), 'd1', NO_SMTP);
    const dealer = res.items.find(i => i.kind === 'SOLD_LISTING_EXTERNAL_REMOVAL' && i.owner === 'DEALERSHIP')!;
    assert.equal(dealer.action.kind, 'END_EXTERNAL_LISTING');
    assert.equal(dealer.action.channel, 'ebay');
    const support = res.items.find(i => i.kind === 'SOLD_LISTING_EXTERNAL_REMOVAL' && i.owner === 'INTERNAL_SUPPORT')!;
    assert.equal(support.action.kind, 'CONTACT_SUPPORT');
    const waiting = find(res.items, 'SOLD_LISTING_REMOVAL_IN_PROGRESS')!;
    assert.equal(waiting.severity, 'WAITING');
    assert.equal(waiting.action.enabled, false);
    for (const i of res.items) assert.doesNotMatch(i.summary, /removed|confirmed removal|submitted to/i, i.summary);
  });

  it('reports channel setup by who must act, and folds connection incidents into it', async () => {
    const res = await getAttention(fakeDb({
      active: [complete],
      accounts: [
        { platformSlug: 'cargurus', state: 'CREDENTIALS_NEEDED', nextAction: 'Enter your CarGurus dealer ID.' },
        { platformSlug: 'autotrader', state: 'PENDING_REVIEW', nextAction: null },
        { platformSlug: 'facebook', state: 'ACTIVE', nextAction: null },
      ],
      incidents: [
        { id: 'i1', channel: 'cargurus', vehicleId: 'veh_ok', reasonCode: 'CONNECTION_REQUIRED', severity: 'WARNING', owner: 'DEALERSHIP', ownerId: null, nextAction: 'Reconnect.' },
        { id: 'i2', channel: 'google', vehicleId: 'veh_ok', reasonCode: 'PRICE_CHANGE', severity: 'WARNING', owner: 'INTERNAL_SUPPORT', ownerId: 'staff-7', nextAction: 'Confirm the price change.' },
        { id: 'i3', channel: 'google', vehicleId: 'veh_ok', reasonCode: 'VEHICLE_INFORMATION', severity: 'WARNING', owner: 'DEALERSHIP', ownerId: null, nextAction: 'Fix info.' },
        { id: 'i4', channel: 'google', vehicleId: 'veh_sold', reasonCode: 'REMOVAL_BATCH', severity: 'CRITICAL', owner: 'INTERNAL_SUPPORT', ownerId: null, nextAction: 'Review.' },
      ],
    }), 'd1', NO_SMTP);
    const dealerSetup = res.items.find(i => i.kind === 'CHANNEL_SETUP_INCOMPLETE' && i.owner === 'DEALERSHIP')!;
    assert.deepEqual(dealerSetup.records.map(r => r.id), ['cargurus']);
    assert.equal(dealerSetup.action.kind, 'COMPLETE_CHANNEL_SETUP');
    assert.equal(dealerSetup.action.channel, 'cargurus');
    const partner = res.items.find(i => i.kind === 'CHANNEL_SETUP_INCOMPLETE' && i.owner === 'PARTNER')!;
    assert.equal(partner.severity, 'WAITING');
    assert.equal(partner.action.kind, 'NONE');
    const problems = res.items.filter(i => i.kind === 'DISTRIBUTION_PROBLEM');
    assert.equal(problems.length, 1, 'connection, vehicle-information and sold-vehicle incidents are reported elsewhere');
    assert.equal(problems[0]!.ownerId, 'staff-7');
    assert.equal(problems[0]!.action.kind, 'CONTACT_SUPPORT');
  });

  it('lists leads whose latest CRM send failed and offers retry only when a send can succeed', async () => {
    const attempts = [
      { leadId: 'lead_a', destinationType: 'ADF_XML_EMAIL', status: 'FAILED', attemptCount: 1, lastAttemptAt: new Date(), createdAt: new Date(2), errorMessage: '550 mailbox unavailable' },
      { leadId: 'lead_b', destinationType: 'ADF_XML_EMAIL', status: 'SENT', attemptCount: 1, lastAttemptAt: new Date(), createdAt: new Date(3), errorMessage: null },
      { leadId: 'lead_b', destinationType: 'ADF_XML_EMAIL', status: 'FAILED', attemptCount: 1, lastAttemptAt: new Date(), createdAt: new Date(1), errorMessage: 'old failure' },
      { leadId: 'lead_c', destinationType: 'ADF_XML_EMAIL', status: 'PENDING', attemptCount: 0, lastAttemptAt: null, createdAt: new Date(1), errorMessage: null },
    ];
    const leads = [{ id: 'lead_a', contactName: 'Jane Buyer', vehicle: { year: 2022, make: 'Honda', model: 'CR-V', stockNumber: 'OK-1' } }];

    const ready = await getAttention(fakeDb({ attempts, leads, crmAddress: 'crm@dealer.test' }), 'd1', PROD_SMTP);
    const item = find(ready.items, 'CRM_DELIVERY_FAILED')!;
    assert.deepEqual(item.records.map(r => r.id), ['lead_a'], 'a later successful send clears an old failure; queued rows are not sends');
    assert.equal(item.records[0]!.detail, '550 mailbox unavailable');
    assert.equal(item.action.enabled, true);

    const noSmtp = await getAttention(fakeDb({ attempts, leads, crmAddress: 'crm@dealer.test' }), 'd1', NO_SMTP);
    assert.equal(find(noSmtp.items, 'CRM_DELIVERY_FAILED')!.action.enabled, false);
    assert.match(find(noSmtp.items, 'CRM_DELIVERY_FAILED')!.action.disabledReason!, /Email sending is not set up/);

    const noAddress = await getAttention(fakeDb({ attempts, leads, crmAddress: null }), 'd1', PROD_SMTP);
    assert.match(find(noAddress.items, 'CRM_DELIVERY_FAILED')!.action.disabledReason!, /No CRM lead email/);
  });

  it('says the list is incomplete when a source fails instead of showing all clear', async () => {
    const res = await getAttention(fakeDb({ failOn: 'inventory' }), 'd1', NO_SMTP);
    assert.deepEqual(res.unavailableAreas, ['VEHICLES']);
    assert.equal(res.items.length, 0);
  });

  it('caps records but keeps the full count', async () => {
    const many = Array.from({ length: 60 }, (_, i) => ({ ...blocked, id: `veh_${i}`, stockNumber: `B-${i}` }));
    const res = await getAttention(fakeDb({ active: many }), 'd1', NO_SMTP);
    const info = find(res.items, 'VEHICLE_INFORMATION_MISSING')!;
    assert.equal(info.count, 60);
    assert.equal(info.records.length, 50);
  });

  it('uses the shared attention system for unanswered inquiries', async () => {
    const res = await getAttention(fakeDb({ leads: [{ id: 'l1', contactName: 'Alex', workflowStatus: 'NEW', platformSlug: 'storefront', vehicleId: null }] }), 'd1', NO_SMTP);
    const issue = find(res.items, 'UNANSWERED_INQUIRY');
    assert.equal(issue?.action.kind, 'OPEN_LEADS');
    assert.equal(issue?.records[0]?.id, 'l1');
  });

  it('requires access to the dealership', async () => {
    const previous = process.env['DEV_OPERATOR_DEALER_IDS'];
    process.env['DEV_OPERATOR_DEALER_IDS'] = 'other-dealer';
    try {
      const app = buildApp(fakeDb({}));
      assert.equal((await app.inject({ method: 'GET', url: '/api/dealers/d1/attention' })).statusCode, 401);
      const res = await app.inject({ method: 'GET', url: '/api/dealers/d1/attention', headers: { 'x-operator-id': 'dev-operator' } });
      assert.equal(res.statusCode, 403);
    } finally {
      if (previous === undefined) delete process.env['DEV_OPERATOR_DEALER_IDS']; else process.env['DEV_OPERATOR_DEALER_IDS'] = previous;
    }
  });
});

const dbUrl = isolatedDatabaseUrl();
describe('attention list (isolated MySQL)', { skip: !dbUrl }, () => {
  it('runs every source against the real schema', async () => {
    const db = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    try {
      const dealer = await db.dealershipProfile.create({ data: { legalName: 'Attention Test Motors', rooftopAddress: {}, primaryContact: {}, desiredChannels: [] } });
      await db.vehicle.create({ data: { dealershipId: dealer.id, stockNumber: 'ATT-1', vin: '', year: 2020, make: 'Kia', model: 'Soul', mileage: 1, priceCents: 0, condition: 'USED', exteriorColor: 'Red', options: [], starCore: {} } });
      await db.platformAccount.create({ data: { dealershipId: dealer.id, platformSlug: 'cargurus', dealerEnabled: true, state: 'CREDENTIALS_NEEDED' } });
      const res = await getAttention(db, dealer.id, NO_SMTP);
      assert.deepEqual(res.unavailableAreas, []);
      assert.equal(find(res.items, 'VEHICLE_INFORMATION_MISSING')?.count, 1);
      assert.equal(find(res.items, 'CHANNEL_SETUP_INCOMPLETE')?.owner, 'DEALERSHIP');
      await db.dealershipProfile.delete({ where: { id: dealer.id } });
    } finally {
      await db.$disconnect();
    }
  });
});

