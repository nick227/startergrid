// Sales lifecycle, sale details, attribution and channel results against an isolated MySQL schema.
//
// Proves the acceptance contract in docs/v5/sales-data-integrity-handoff.md end to end through
// the HTTP routes: every sale runs the inventory lifecycle, unknown sale facts stay null,
// attribution needs a documented rule, costs distinguish unknown from zero, and nothing crosses
// dealerships.

import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { after, before, describe, it } from 'node:test';
import { PrismaClient, type DealerAccessRole } from '@prisma/client';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../server/app.js';
import { hashSessionToken } from '../services/auth/sessionService.js';
import { getCurrentYearMonth } from '../services/channel/channelCostService.js';
import { isolatedDatabaseUrl } from './helpers/isolatedDatabase.js';

const url = isolatedDatabaseUrl();

describe('sales data integrity (isolated MySQL)', { skip: !url, concurrency: false }, () => {
  let db: PrismaClient;
  let app: FastifyInstance;
  const month = getCurrentYearMonth();

  before(() => {
    db = new PrismaClient({ datasources: { db: { url } } });
    app = buildApp(db);
  });
  after(async () => {
    await app.close();
    await db.$disconnect();
  });

  async function dealer(label: string) {
    return db.dealershipProfile.create({ data: {
      legalName: `Sales integrity ${label}`, businessCategory: 'AUTOMOTIVE',
      rooftopAddress: {}, primaryContact: {}, desiredChannels: ['consumer-marketplace'],
    } });
  }

  async function vehicle(dealershipId: string, stockNumber: string, priceCents = 2_500_000) {
    return db.vehicle.create({ data: {
      dealershipId, stockNumber, vin: `VIN${stockNumber}`, year: 2022, make: 'Honda', model: 'Accord', mileage: 20_000,
      priceCents, condition: 'USED', exteriorColor: 'White', options: [], starCore: {}, listingStatus: 'READY',
    } });
  }

  /** An operator signed in with the given role at one dealership; returns its session cookie. */
  async function operatorCookie(dealershipId: string, accessRole: DealerAccessRole = 'DEALER_OWNER') {
    const raw = randomBytes(32).toString('hex');
    await db.operatorAccount.create({ data: {
      email: `${randomBytes(6).toString('hex')}@example.test`, passwordHash: 'unused-test-hash', role: accessRole, firstLoginAt: new Date(),
      dealerAccess: { create: { dealershipId, accessRole, grantedBy: 'test' } },
      sessions: { create: { tokenHash: hashSessionToken(raw), expiresAt: new Date(Date.now() + 3_600_000) } },
    } });
    return { cookie: `op_session=${raw}` };
  }

  async function results(dealershipId: string, headers: Record<string, string>) {
    const res = await app.inject({ method: 'GET', url: `/api/dealers/${dealershipId}/performance/channel-results?month=${month}`, headers });
    assert.equal(res.statusCode, 200, res.body);
    return res.json().results;
  }

  it('marks a vehicle sold through the inventory lifecycle, recording no sale facts', async () => {
    const d = await dealer('lifecycle');
    const v = await vehicle(d.id, 'L-1');
    const headers = await operatorCookie(d.id);

    const res = await app.inject({ method: 'POST', url: `/api/dealers/${d.id}/inventory/vehicles/${v.id}/sold`, headers });
    assert.equal(res.statusCode, 200, res.body);

    const sold = await db.vehicle.findUniqueOrThrow({ where: { id: v.id } });
    assert.ok(sold.soldAt);
    const events = await db.vehicleLifecycleEvent.findMany({ where: { vehicleId: v.id } });
    assert.equal(events.length, 1);
    assert.equal(events[0]!.toState, 'SOLD');
    assert.equal(await db.vehicleUpdate.count({ where: { vehicleId: v.id, kind: 'SOLD' } }), 1);
    assert.equal(await db.vehicleSaleRecord.count({ where: { vehicleId: v.id } }), 0, 'no sale details are invented');

    const r = await results(d.id, headers);
    assert.equal(r.sales.markedSold, 1);
    assert.equal(r.sales.unattributed, 1, 'marking sold attributes nothing');
    assert.equal(r.saleOutcomes[0].salePriceCents, null);
    assert.equal(r.saleOutcomes[0].transactionDate, null);
  });

  it('rejects marking another dealership\'s vehicle sold without touching inventory', async () => {
    const a = await dealer('a'), b = await dealer('b');
    const v = await vehicle(b.id, 'B-1');
    const headers = await operatorCookie(a.id);

    const viaOtherDealer = await app.inject({ method: 'POST', url: `/api/dealers/${b.id}/inventory/vehicles/${v.id}/sold`, headers });
    assert.equal(viaOtherDealer.statusCode, 403);
    const viaOwnDealer = await app.inject({ method: 'POST', url: `/api/dealers/${a.id}/inventory/vehicles/${v.id}/sold`, headers });
    assert.equal(viaOwnDealer.statusCode, 404);
    const viaMarketplace = await app.inject({ method: 'POST', url: `/api/marketplace/vehicles/${v.id}/sold`, headers });
    assert.equal(viaMarketplace.statusCode, 404, 'the public marketplace namespace has no sold route');

    assert.equal((await db.vehicle.findUniqueOrThrow({ where: { id: v.id } })).soldAt, null);
    assert.equal(await db.vehicleLifecycleEvent.count({ where: { vehicleId: v.id } }), 0);
  });

  it('keeps unknown sale price and date null, and records supplied ones exactly', async () => {
    const d = await dealer('details');
    const headers = await operatorCookie(d.id);
    const plain = await vehicle(d.id, 'D-1', 2_999_500);
    const detailed = await vehicle(d.id, 'D-2', 2_999_500);

    let res = await app.inject({ method: 'POST', url: `/api/dealers/${d.id}/inventory/vehicles/${plain.id}/sold`, headers });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(await db.vehicleSaleRecord.count({ where: { vehicleId: plain.id } }), 0);

    res = await app.inject({
      method: 'POST', url: `/api/dealers/${d.id}/inventory/vehicles/${detailed.id}/sold`, headers,
      payload: { salePriceCents: 2_875_000, transactionDate: '2026-10-01' },
    });
    assert.equal(res.statusCode, 200, res.body);
    const record = await db.vehicleSaleRecord.findUniqueOrThrow({ where: { vehicleId: detailed.id } });
    assert.equal(record.salePriceCents, 2_875_000, 'the actual price, not the 2,999,500 asking price');
    assert.equal(record.transactionDate?.toISOString().slice(0, 10), '2026-10-01');
    assert.equal(record.confirmedChannelSlug, null);
    assert.equal(record.sourceConfidence, 'MANUAL_IMPORTED');

    // Correcting one field leaves the others alone; null clears back to unknown.
    res = await app.inject({ method: 'PUT', url: `/api/dealers/${d.id}/inventory/vehicles/${detailed.id}/sale`, headers, payload: { salePriceCents: null } });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().sale.salePriceCents, null);
    assert.equal(res.json().sale.transactionDate, '2026-10-01');

    const r = await results(d.id, headers);
    assert.equal(r.sales.markedSold, 2);
    assert.equal(r.sales.withSalePrice, 0);
    assert.equal(r.sales.withTransactionDate, 1);
  });

  it('refuses sale details for a vehicle that is not marked sold, and clears them on relist', async () => {
    const d = await dealer('relist');
    const headers = await operatorCookie(d.id);
    const v = await vehicle(d.id, 'R-1');

    let res = await app.inject({ method: 'PUT', url: `/api/dealers/${d.id}/inventory/vehicles/${v.id}/sale`, headers, payload: { salePriceCents: 1_000_000 } });
    assert.equal(res.statusCode, 409);

    await app.inject({ method: 'POST', url: `/api/dealers/${d.id}/inventory/vehicles/${v.id}/sold`, headers, payload: { confirmedChannelSlug: 'cargurus-dealer' } });
    assert.equal(await db.vehicleSaleRecord.count({ where: { vehicleId: v.id } }), 1);

    res = await app.inject({ method: 'POST', url: `/api/dealers/${d.id}/inventory/vehicles/${v.id}/relist`, headers });
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(await db.vehicleSaleRecord.count({ where: { vehicleId: v.id } }), 0, 'a sale that fell through keeps no sale facts');
  });

  it('attributes only by a documented rule', async () => {
    const d = await dealer('attribution');
    const headers = await operatorCookie(d.id);
    const confirmed = await vehicle(d.id, 'A-1');
    const leadSold = await vehicle(d.id, 'A-2');
    const inquiredOnly = await vehicle(d.id, 'A-3');
    const conflicting = await vehicle(d.id, 'A-4');

    await db.lead.createMany({ data: [
      { dealershipId: d.id, vehicleId: leadSold.id, platformSlug: 'consumer-marketplace', source: 'PLATFORM_FORM', workflowStatus: 'SOLD' },
      { dealershipId: d.id, vehicleId: inquiredOnly.id, platformSlug: 'consumer-marketplace', source: 'PLATFORM_FORM', workflowStatus: 'APPOINTMENT' },
      { dealershipId: d.id, vehicleId: conflicting.id, platformSlug: 'consumer-marketplace', source: 'PLATFORM_FORM', workflowStatus: 'SOLD' },
      { dealershipId: d.id, vehicleId: conflicting.id, platformSlug: 'dealer-storefront', source: 'DEALER_STOREFRONT', workflowStatus: 'SOLD' },
    ] });
    await app.inject({ method: 'POST', url: `/api/dealers/${d.id}/inventory/vehicles/${confirmed.id}/sold`, headers, payload: { confirmedChannelSlug: 'cargurus-dealer' } });
    for (const v of [leadSold, inquiredOnly, conflicting]) {
      await app.inject({ method: 'POST', url: `/api/dealers/${d.id}/inventory/vehicles/${v.id}/sold`, headers });
    }

    const r = await results(d.id, headers);
    const byStock = Object.fromEntries(r.saleOutcomes.map((o: { stockNumber: string }) => [o.stockNumber, o]));
    assert.equal(byStock['A-1'].attributedChannelSlug, 'cargurus-dealer');
    assert.equal(byStock['A-1'].attributionMethod, 'DEALER_CONFIRMED');
    assert.equal(byStock['A-2'].attributedChannelSlug, 'consumer-marketplace');
    assert.equal(byStock['A-2'].attributionMethod, 'LEAD_MARKED_SOLD');
    assert.equal(byStock['A-3'].attributedChannelSlug, null, 'an inquiry is not evidence of the sale');
    assert.equal(byStock['A-3'].unattributedReason, 'NO_EVIDENCE');
    assert.equal(byStock['A-4'].unattributedReason, 'CONFLICTING_SOLD_LEADS');
    assert.deepEqual(r.sales, { markedSold: 4, attributed: 2, unattributed: 2, withSalePrice: 0, withTransactionDate: 0 });
  });

  it('computes cost figures only from complete inputs and never shows unknown as zero', async () => {
    const d = await dealer('costs');
    const headers = await operatorCookie(d.id);
    const v = await vehicle(d.id, 'C-1');
    const sold = await vehicle(d.id, 'C-2');

    // Marketplace reports inquiries; CarGurus does not. One stray CarGurus lead makes it PARTIAL.
    await db.lead.createMany({ data: [
      { dealershipId: d.id, vehicleId: v.id, platformSlug: 'consumer-marketplace', source: 'PLATFORM_FORM', workflowStatus: 'NEW' },
      { dealershipId: d.id, vehicleId: v.id, platformSlug: 'consumer-marketplace', source: 'PLATFORM_FORM', workflowStatus: 'CONTACTED' },
      { dealershipId: d.id, vehicleId: v.id, platformSlug: 'consumer-marketplace', source: 'PLATFORM_FORM', workflowStatus: 'NEW' },
      { dealershipId: d.id, vehicleId: v.id, platformSlug: 'cargurus-dealer', source: 'MANUAL', workflowStatus: 'NEW' },
    ] });
    for (const payload of [
      { platformSlug: 'consumer-marketplace', month, flatFeeCents: 30_000, adSpendCents: null },
      { platformSlug: 'cargurus-dealer', month, flatFeeCents: 125_000, adSpendCents: 0 },
      { platformSlug: 'autotrader-cox', month, flatFeeCents: 0, adSpendCents: null },
    ]) {
      const res = await app.inject({ method: 'PUT', url: `/api/dealers/${d.id}/channels/costs`, headers, payload });
      assert.equal(res.statusCode, 200, res.body);
    }
    await app.inject({ method: 'POST', url: `/api/dealers/${d.id}/inventory/vehicles/${sold.id}/sold`, headers, payload: { confirmedChannelSlug: 'cargurus-dealer' } });

    const r = await results(d.id, headers);
    const row = (slug: string) => r.channels.find((c: { platformSlug: string }) => c.platformSlug === slug);

    assert.equal(row('consumer-marketplace').inquiryReporting, 'REPORTED');
    assert.equal(row('consumer-marketplace').inquirySource, 'OBSERVED_FIRST_PARTY');
    assert.equal(row('consumer-marketplace').inquiries, 3);
    assert.equal(row('consumer-marketplace').progressedInquiries, 1);
    assert.equal(row('consumer-marketplace').costPerInquiryCents, 10_000);
    assert.equal(row('consumer-marketplace').costPerAttributedSaleCents, null, 'no attributed sales, no cost per sale');

    assert.equal(row('cargurus-dealer').inquiryReporting, 'PARTIAL');
    assert.equal(row('cargurus-dealer').costPerInquiryCents, null, 'an incomplete inquiry count is not a denominator');
    assert.equal(row('cargurus-dealer').attributedSales, 1);
    assert.equal(row('cargurus-dealer').costPerAttributedSaleCents, 125_000);
    assert.equal(row('cargurus-dealer').attributedSaleRevenueCents, null, 'sale price unknown, so revenue unknown');

    assert.equal(row('autotrader-cox').cost.reportedCostCents, 0, 'a reported zero stays zero');
    assert.equal(row('autotrader-cox').inquiries, null, 'a channel that does not report inquiries has unknown inquiries');

    assert.equal(r.cost.channelsWithReportedCost, 3);
    assert.equal(r.cost.totalReportedCostCents, 155_000);

    // Clearing both amounts returns the channel to unknown cost instead of storing zero.
    const cleared = await app.inject({ method: 'PUT', url: `/api/dealers/${d.id}/channels/costs`, headers, payload: { platformSlug: 'autotrader-cox', month, flatFeeCents: null, adSpendCents: null } });
    assert.equal(cleared.json().cost, null);
    assert.equal(await db.channelMonthlyCost.count({ where: { dealershipId: d.id, platformSlug: 'autotrader-cox' } }), 0);
  });

  it('keeps every figure and write inside its own dealership', async () => {
    const a = await dealer('iso-a'), b = await dealer('iso-b');
    const aHeaders = await operatorCookie(a.id), bHeaders = await operatorCookie(b.id);
    const bVehicle = await vehicle(b.id, 'ISO-B');
    await db.lead.create({ data: { dealershipId: b.id, vehicleId: bVehicle.id, platformSlug: 'consumer-marketplace', source: 'PLATFORM_FORM', workflowStatus: 'SOLD' } });
    await app.inject({ method: 'PUT', url: `/api/dealers/${b.id}/channels/costs`, headers: bHeaders, payload: { platformSlug: 'cargurus-dealer', month, flatFeeCents: 90_000 } });
    await app.inject({ method: 'POST', url: `/api/dealers/${b.id}/inventory/vehicles/${bVehicle.id}/sold`, headers: bHeaders });

    const r = await results(a.id, aHeaders);
    assert.equal(r.sales.markedSold, 0);
    assert.equal(r.inquiries.recorded, 0);
    assert.equal(r.cost.totalReportedCostCents, null);

    for (const req of [
      { method: 'GET' as const, url: `/api/dealers/${b.id}/performance/channel-results?month=${month}` },
      { method: 'PUT' as const, url: `/api/dealers/${b.id}/channels/costs`, payload: { platformSlug: 'cargurus-dealer', month, flatFeeCents: 1 } },
      { method: 'PUT' as const, url: `/api/dealers/${b.id}/inventory/vehicles/${bVehicle.id}/sale`, payload: { salePriceCents: 1 } },
    ]) {
      const res = await app.inject({ ...req, headers: aHeaders });
      assert.equal(res.statusCode, 403, `${req.method} ${req.url}`);
    }
    // A's own dealership id with B's vehicle id finds nothing.
    const res = await app.inject({ method: 'PUT', url: `/api/dealers/${a.id}/inventory/vehicles/${bVehicle.id}/sale`, headers: aHeaders, payload: { salePriceCents: 1 } });
    assert.equal(res.statusCode, 404);
    assert.equal(await db.vehicleSaleRecord.count({ where: { vehicleId: bVehicle.id } }), 0);
    assert.equal((await db.channelMonthlyCost.findFirstOrThrow({ where: { dealershipId: b.id } })).flatFeeCents, 90_000);
  });

  it('lets dealership staff record sale details but not channel costs', async () => {
    const d = await dealer('staff');
    const staff = await operatorCookie(d.id, 'DEALER_STAFF');
    const v = await vehicle(d.id, 'S-1');
    await app.inject({ method: 'POST', url: `/api/dealers/${d.id}/inventory/vehicles/${v.id}/sold`, headers: staff });

    const sale = await app.inject({ method: 'PUT', url: `/api/dealers/${d.id}/inventory/vehicles/${v.id}/sale`, headers: staff, payload: { salePriceCents: 2_000_000 } });
    assert.equal(sale.statusCode, 200, sale.body);
    const cost = await app.inject({ method: 'PUT', url: `/api/dealers/${d.id}/channels/costs`, headers: staff, payload: { platformSlug: 'cargurus-dealer', month, flatFeeCents: 1 } });
    assert.equal(cost.statusCode, 403);
  });
});
