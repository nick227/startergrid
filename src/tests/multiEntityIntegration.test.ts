import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { prisma } from '../lib/prisma.js';
import { buildApp } from '../server/app.js';
import { assertLocalFixtureEnvironment, FIXTURE_PASSWORD } from '../scripts/dev/multiEntityFixture.js';

// Explicit local integration suite; never resets fixtures during ordinary unit tests.
test('multi-entity publication, inquiry, operator access and reset integration', { skip: process.env.DEALERGRID_INTEGRATION !== '1' }, async t => {
  assertLocalFixtureEnvironment(process.env);
  const baseline = async () => JSON.stringify(await prisma.dealershipProfile.findUnique({ where: { id: 'dealer_ux_harborline' },
    include: { vehicles: { orderBy: { id: 'asc' }, include: { media: { orderBy: { id: 'asc' } } } }, leads: { orderBy: { id: 'asc' } }, teamThreads: { orderBy: { id: 'asc' } } } }));
  const before = await baseline();
  const seed = (...args: string[]) => execFileSync(process.execPath, ['dist/src/scripts/dev/seedMultiEntity.js', ...args], { env: process.env, stdio: 'pipe' });
  seed('--reset'); seed();
  const app = buildApp(prisma);
  const login = async (key: string) => {
    const response = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: `owner@${key}.multi-entity.example`, password: FIXTURE_PASSWORD } });
    assert.equal(response.statusCode, 200, response.body);
    return String(response.headers['set-cookie']).split(';')[0]!;
  };
  const cookie = await login('books');
  const publishUrl = '/api/dealers/dealer_me_books/platforms/consumer-marketplace/category-listings';
  const itemUrl = '/api/marketplace/category-items/me_books_digital_1';
  try {
    await t.test('eligible digital item can be published and discovered; physical drafts remain private', async () => {
      await prisma.marketplaceListing.deleteMany({ where: { categoryItemId: 'me_books_digital_1' } });
      assert.equal((await app.inject(itemUrl)).statusCode, 404);
      const publish = await app.inject({ method: 'POST', url: publishUrl, headers: { cookie }, payload: { categoryItemId: 'me_books_digital_1' } });
      assert.equal(publish.statusCode, 201, publish.body);
      const detail = await app.inject(itemUrl);
      assert.equal(detail.statusCode, 200, detail.body);
      assert.equal(detail.json().identity.source, 'category_item');
      assert.equal(detail.json().identity.dealershipId, 'dealer_me_books');
      const browse = await app.inject('/api/marketplace/category-items?categoryId=ebooks&dealer=dealer_me_books');
      assert.equal(browse.json().total, 1);
      assert.equal(browse.json().items[0].listingId, 'me_books_digital_1');
      const seller = await app.inject('/api/marketplace/sellers/dealer_me_books?category=ebooks');
      assert.equal(seller.json().categoryItems[0].listingId, 'me_books_digital_1');
      assert.equal((await app.inject('/api/marketplace/category-items/me_books_1')).statusCode, 404);
      assert.equal((await app.inject({ method: 'POST', url: publishUrl, headers: { cookie }, payload: { categoryItemId: 'me_books_1' } })).statusCode, 409);
    });
    await t.test('category inquiry persists real identity and is available for lead assignment', async () => {
      const response = await app.inject({ method: 'POST', url: `${itemUrl}/leads`, payload: { contactName: 'Integration check', message: 'Test inquiry — removed by reset' } });
      assert.equal(response.statusCode, 201, response.body);
      const leadId = response.json().leadId;
      const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
      assert.equal(lead.categoryItemId, 'me_books_digital_1'); assert.equal(lead.vehicleId, null); assert.equal(lead.dealershipId, 'dealer_me_books');
      const list = await app.inject({ url: '/api/dealers/dealer_me_books/leads', headers: { cookie } });
      const dto = list.json().leads.find((l: { id: string }) => l.id === leadId);
      const view = await app.inject({ method: 'POST', url: '/api/marketplace/events', payload: { eventType: 'vehicle_detail_view', inventorySource: 'category_item', listingId: 'me_books_digital_1', dealerId: 'dealer_me_books', category: 'EBOOKS' } });
      assert.equal(view.statusCode, 202, view.body);
      const wrongSeller = await app.inject({ method: 'POST', url: '/api/marketplace/events', payload: { eventType: 'vehicle_detail_view', inventorySource: 'category_item', listingId: 'me_books_digital_1', dealerId: 'dealer_me_marine' } });
      assert.equal(wrongSeller.statusCode, 404);
      assert.equal(dto.inventoryIdentity.source, 'category_item'); assert.equal(dto.categoryItem.id, lead.categoryItemId);
      const patch = await app.inject({ method: 'PATCH', url: `/api/dealers/dealer_me_books/leads/${leadId}`, headers: { cookie }, payload: { version: lead.version, assigneeOperatorId: 'me_books_staff', workflowStatus: 'CONTACTED' } });
      assert.equal(patch.statusCode, 200, patch.body);
      const delivery = await app.inject({ url: `/api/dealers/dealer_me_books/leads/${leadId}/delivery`, headers: { cookie } });
      assert.equal(delivery.json().sendBlocker, 'UNSUPPORTED_INVENTORY_TYPE');
      const event = await prisma.channelEvent.findFirst({ where: { dealershipId: 'dealer_me_books', listingId: 'me_books_digital_1', eventType: 'INQUIRY_SUBMITTED' } });
      assert.ok(event); assert.equal(event.vehicleId, null);
    });
    await t.test('dealer isolation and public input ownership protection', async () => {
      const otherCookie = await login('marine');
      assert.equal((await app.inject({ url: '/api/dealers/dealer_me_books/leads', headers: { cookie: otherCookie } })).statusCode, 403);
      assert.equal((await app.inject({ method: 'POST', url: publishUrl, headers: { cookie: otherCookie }, payload: { categoryItemId: 'me_books_digital_1' } })).statusCode, 403);
      assert.equal((await app.inject({ method: 'POST', url: `${itemUrl}/leads`, payload: { contactName: 'Buyer', dealerId: 'dealer_me_marine' } })).statusCode, 400);
      assert.equal((await app.inject({ method: 'POST', url: publishUrl, headers: { cookie }, payload: { categoryItemId: 'me_records_1' } })).statusCode, 404);
      await prisma.categoryInventoryItem.update({ where: { id: 'me_books_digital_1' }, data: { categoryId: 'SONGS' } });
      assert.equal((await app.inject(itemUrl)).statusCode, 404);
      await prisma.categoryInventoryItem.update({ where: { id: 'me_books_digital_1' }, data: { categoryId: 'EBOOKS' } });
    });
    await t.test('disabled, draft, sold, removed, invalid condition/format and price deny reads and inquiries', async () => {
      const apparel = await app.inject('/api/marketplace/category-items?categoryId=APPAREL');
      assert.equal(apparel.statusCode, 200, apparel.body);
      assert.ok(apparel.json().total >= 1);
      const songs = await app.inject('/api/marketplace/category-items?categoryId=SONGS');
      assert.equal(songs.statusCode, 200, songs.body);
      for (const row of songs.json().items) assert.ok(['Vinyl LP', 'CD', 'Cassette', '7-inch'].includes(row.format));
      const original = await prisma.categoryInventoryItem.findUniqueOrThrow({ where: { id: 'me_books_digital_1' } });
      for (const change of [{ listingStatus: 'DRAFT' }, { soldAt: new Date() }, { removedAt: new Date() }, { priceCents: 0 }, { condition: 'USED' }, { data: { title: 'Physical', format: 'Vinyl LP' } }, { data: { format: 'epub' } }]) {
        await prisma.categoryInventoryItem.update({ where: { id: original.id }, data: change });
        assert.equal((await app.inject(itemUrl)).statusCode, 404);
        assert.equal((await app.inject({ method: 'POST', url: publishUrl, headers: { cookie }, payload: { categoryItemId: original.id } })).statusCode, 409);
        assert.equal((await app.inject({ method: 'POST', url: `${itemUrl}/leads`, payload: { contactName: 'Hidden check' } })).statusCode, 404);
        await prisma.categoryInventoryItem.update({ where: { id: original.id }, data: { listingStatus: original.listingStatus, soldAt: null, removedAt: null, priceCents: original.priceCents, condition: original.condition, data: original.data! } });
      }
    });
    await t.test('marine and automotive inquiry regression', async () => {
      // Automotive probe uses an isolated clone; the Harborline baseline is never mutated.
      const vehicle = await prisma.vehicle.findUniqueOrThrow({ where: { id: 'me_marine_1' } });
      for (const category of ['BOATS', 'AUTOMOTIVE'] as const) {
        if (category === 'AUTOMOTIVE') {
          const automotive = await prisma.vehicle.findFirstOrThrow({ where: { dealershipId: 'dealer_ux_harborline', listingStatus: 'READY', soldAt: null } });
          await prisma.vehicle.update({ where: { id: vehicle.id }, data: { vin: automotive.vin, year: automotive.year, make: automotive.make, model: automotive.model, mileage: automotive.mileage, condition: automotive.condition } });
        }
        await prisma.dealershipProfile.update({ where: { id: vehicle.dealershipId }, data: { businessCategory: category } });
        const detail = await app.inject(`/api/marketplace/vehicles/${vehicle.id}?category=${category}`);
        assert.equal(detail.statusCode, 200, detail.body);
        const response = await app.inject({ method: 'POST', url: `/api/marketplace/vehicles/${vehicle.id}/leads`, payload: { contactName: `${category} regression` } });
        assert.equal(response.statusCode, 201, response.body);
        const lead = await prisma.lead.findUniqueOrThrow({ where: { id: response.json().leadId } });
        assert.equal(lead.vehicleId, vehicle.id); assert.equal(lead.categoryItemId, null); assert.equal(lead.dealershipId, vehicle.dealershipId);
      }
    });
  } finally {
    await app.close(); seed('--reset'); seed();
    assert.equal(await baseline(), before, 'Harborline must survive reset/reseed unchanged');
    assert.equal(await prisma.lead.count({ where: { dealershipId: { in: ['dealer_me_books', 'dealer_me_marine'] } } }), 0);
    await prisma.$disconnect();
  }
});
