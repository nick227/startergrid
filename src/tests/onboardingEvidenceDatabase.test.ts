import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { PrismaClient } from '@prisma/client';
import { readOnboardingEvidence } from '../services/dealership/onboardingEvidence.js';
import { completeHandoff, refreshOnboarding } from '../services/dealership/onboardingService.js';
import { isolatedDatabaseUrl } from './helpers/isolatedDatabase.js';

const url = isolatedDatabaseUrl();
describe('onboarding evidence (isolated MySQL)', { skip: !url, concurrency: false }, () => {
  let db: PrismaClient;
  before(() => { db = new PrismaClient({ datasources: { db: { url } } }); });
  after(async () => { await db.$disconnect(); });
  const actor = { id: 'test-support', email: 'support@example.test' };
  async function fixture() {
    const dealer = await db.dealershipProfile.create({ data: {
      legalName: 'Onboarding evidence test', businessCategory: 'AUTOMOTIVE',
      rooftopAddress: {}, primaryContact: {}, desiredChannels: ['consumer-marketplace'],
    } });
    const account = await db.operatorAccount.create({ data: {
      email: `${dealer.id}@example.test`, passwordHash: 'unused-test-hash', role: 'DEALER_OWNER', firstLoginAt: new Date(),
      dealerAccess: { create: { dealershipId: dealer.id, accessRole: 'DEALER_OWNER', grantedBy: actor.id } },
    } });
    const vehicle = await db.vehicle.create({ data: {
      dealershipId: dealer.id, stockNumber: 'V1', vin: 'TESTVIN', year: 2024, make: 'Ford', model: 'F150', mileage: 1000,
      priceCents: 2_000_000, condition: 'USED', exteriorColor: 'Blue', options: [], starCore: {}, listingStatus: 'READY',
      media: { create: { url: 'https://example.test/photo.jpg', kind: 'IMAGE', sortOrder: 0 } },
      marketplaceListings: { create: { dealershipId: dealer.id, platformSlug: 'consumer-marketplace', status: 'ACTIVE', listedAt: new Date() } },
    } });
    return { dealer, vehicle, account };
  }

  it('uses public eligibility instead of trusting an ACTIVE listing row alone', async () => {
    const { dealer, vehicle } = await fixture();
    assert.equal((await readOnboardingEvidence(db, dealer.id)).vehicleId, vehicle.id);
    for (const change of [{ soldAt: new Date() }, { removedAt: new Date() }, { priceCents: 0 }, { listingStatus: 'DRAFT' as const }]) {
      await db.vehicle.update({ where: { id: vehicle.id }, data: change });
      assert.equal((await readOnboardingEvidence(db, dealer.id)).vehicleId, null);
      await db.vehicle.update({ where: { id: vehicle.id }, data: { soldAt: null, removedAt: null, priceCents: 2_000_000, listingStatus: 'READY' } });
    }
    await db.vehicleMedia.deleteMany({ where: { vehicleId: vehicle.id } });
    assert.equal((await readOnboardingEvidence(db, dealer.id)).vehicleId, null);
  });

  it('does not accept another rooftop’s inquiry or a manually entered lead', async () => {
    const a = await fixture(), b = await fixture();
    await db.lead.create({ data: { dealershipId: b.dealer.id, vehicleId: b.vehicle.id, platformSlug: 'consumer-marketplace', source: 'PLATFORM_FORM' } });
    await db.lead.create({ data: { dealershipId: a.dealer.id, vehicleId: a.vehicle.id, platformSlug: 'consumer-marketplace', source: 'MANUAL' } });
    assert.equal((await readOnboardingEvidence(db, a.dealer.id)).inboxLeadId, null);
    await assert.rejects(completeHandoff(db, a.dealer.id, actor), /shared Leads inbox/);
    assert.equal((await db.dealershipProfile.findUniqueOrThrow({ where: { id: a.dealer.id } })).handoffCompletedAt, null);
  });

  it('records manual launch separately and serializes concurrent handoff submissions', async () => {
    const { dealer, vehicle } = await fixture();
    await refreshOnboarding(db, dealer.id, actor.id);
    const launched = await db.dealershipProfile.findUniqueOrThrow({ where: { id: dealer.id } });
    assert.equal(launched.autopilotPreference, 'OFF');
    assert.ok(launched.launchCompletedAt);
    assert.equal(launched.handoffCompletedAt, null);
    await db.lead.create({ data: { dealershipId: dealer.id, vehicleId: vehicle.id, platformSlug: 'consumer-marketplace', source: 'PLATFORM_FORM' } });
    await Promise.all([completeHandoff(db, dealer.id, actor), completeHandoff(db, dealer.id, actor)]);
    const handedOff = await db.dealershipProfile.findUniqueOrThrow({ where: { id: dealer.id } });
    assert.equal(handedOff.launchCompletedAt?.getTime(), launched.launchCompletedAt.getTime());
    assert.ok(handedOff.handoffCompletedAt);
    assert.equal(await db.dealershipActivityEvent.count({ where: { dealershipId: dealer.id, action: 'HANDOFF_COMPLETED' } }), 1);
  });

  it('keeps waiting-for-stock dealerships in setup despite old live data', async () => {
    const { dealer } = await fixture();
    await db.dealershipProfile.update({ where: { id: dealer.id }, data: { waitingForStock: true } });
    await assert.rejects(completeHandoff(db, dealer.id, actor), /Waiting for stock/);
    const row = await db.dealershipProfile.findUniqueOrThrow({ where: { id: dealer.id } });
    assert.equal(row.launchCompletedAt, null);
    assert.equal(row.handoffCompletedAt, null);
  });
});
