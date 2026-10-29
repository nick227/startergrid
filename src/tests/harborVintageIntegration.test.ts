import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../lib/prisma.js';
import { buildApp } from '../server/app.js';
import { assertLocalFixtureEnvironment, FIXTURE_PASSWORD } from '../scripts/dev/multiEntityFixture.js';

// No tenant reset: preserve concurrent agents' fixture edits and customer/demo activity.
test('Harbor Vintage: operator-created garment publishes and receives an assignable inquiry', { skip: process.env.DEALERGRID_VINTAGE_INTEGRATION !== '1' }, async () => {
  assertLocalFixtureEnvironment(process.env);
  const dealerId = 'dealer_me_vintage';
  const base = `/api/dealers/${dealerId}`;
  const app = buildApp(prisma);
  const snapshot = async () => JSON.stringify(await prisma.dealershipProfile.findUnique({ where: { id: 'dealer_ux_harborline' }, include: { vehicles: { orderBy: { id: 'asc' } }, leads: { orderBy: { id: 'asc' } } } }));
  const before = await snapshot();
  let itemId: string | undefined;
  let leadId: string | undefined;
  let cookie = '';
  try {
    const login = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'owner@vintage.multi-entity.example', password: FIXTURE_PASSWORD } });
    assert.equal(login.statusCode, 200, login.body);
    cookie = String(login.headers['set-cookie']).split(';')[0]!;
    const publishedFixture = await app.inject('/api/marketplace/category-items/me_vintage_1');
    assert.equal(publishedFixture.statusCode, 200, publishedFixture.body);
    assert.equal(publishedFixture.json().identity.source, 'category_item');
    assert.equal(publishedFixture.json().condition, 'VINTAGE');
    assert.equal(publishedFixture.json().size, 'M');
    assert.equal((await app.inject('/api/marketplace/category-items/me_vintage_2')).statusCode, 404);

    const create = await app.inject({ method: 'POST', url: `${base}/inventory/items`, headers: { cookie }, payload: {
      categoryId: 'APPAREL', stockNumber: `HV-ACCEPT-${Date.now()}`, condition: 'VINTAGE', priceCents: 6800,
      data: { title: 'Acceptance jacket' },
    } });
    assert.equal(create.statusCode, 201, create.body); itemId = create.json().itemId;
    const inventoryUrl = `${base}/inventory/items/${itemId}`;
    const publicUrl = `/api/marketplace/category-items/${itemId}`;
    const publishUrl = `${base}/platforms/consumer-marketplace/category-listings`;
    const publish = () => app.inject({ method: 'POST', url: publishUrl, headers: { cookie }, payload: { categoryItemId: itemId } });
    assert.equal((await publish()).statusCode, 409, 'incomplete size must block publication');
    const data = { title: 'Acceptance jacket', brand: 'Demo Vintage', size: 'M', color: 'Indigo', material: 'Cotton denim', era: '1990s', measurements: 'Chest 104 cm', conditionNotes: 'Light cuff wear' };
    const patch = await app.inject({ method: 'PATCH', url: inventoryUrl, headers: { cookie }, payload: { data } });
    assert.equal(patch.statusCode, 200, patch.body);
    assert.equal(patch.json().listingStatus, 'READY');
    const publication = await publish(); assert.equal(publication.statusCode, 201, publication.body);
    const detail = await app.inject(publicUrl); assert.equal(detail.statusCode, 200, detail.body);
    assert.equal(detail.json().size, data.size); assert.equal(detail.json().condition, 'VINTAGE');
    assert.equal(detail.json().data.measurements, data.measurements);
    assert.equal(detail.json().data.conditionNotes, data.conditionNotes);
    assert.equal(detail.json().identity.dealershipId, dealerId);
    assert.equal(await prisma.vehicle.count({ where: { id: itemId } }), 0, 'garment must not need an automotive shadow row');
    const browse = await app.inject(`/api/marketplace/category-items?categoryId=APPAREL&dealer=${dealerId}`);
    assert.ok(browse.json().items.some((item: { listingId: string }) => item.listingId === itemId));
    const storefront = await app.inject(`/api/marketplace/sellers/${dealerId}?category=apparel`);
    assert.ok(storefront.json().categoryItems.some((item: { listingId: string }) => item.listingId === itemId));

    const inquiry = await app.inject({ method: 'POST', url: `${publicUrl}/leads`, payload: { contactName: 'Vintage API acceptance', message: 'Temporary verification inquiry, removed afterward' } });
    assert.equal(inquiry.statusCode, 201, inquiry.body); leadId = inquiry.json().leadId;
    const lead = await prisma.lead.findUniqueOrThrow({ where: { id: leadId } });
    assert.equal(lead.categoryItemId, itemId); assert.equal(lead.vehicleId, null); assert.equal(lead.dealershipId, dealerId);
    const leads = await app.inject({ url: `${base}/leads`, headers: { cookie } });
    const shown = leads.json().leads.find((row: { id: string }) => row.id === leadId);
    assert.equal(shown.categoryItem.title, data.title); assert.equal(shown.inventoryIdentity.inventoryId, itemId);
    const assignment = await app.inject({ method: 'PATCH', url: `${base}/leads/${leadId}`, headers: { cookie }, payload: { version: lead.version, workflowStatus: 'CONTACTED', assigneeOperatorId: 'me_vintage_staff' } });
    assert.equal(assignment.statusCode, 200, assignment.body);
    const otherLogin = await app.inject({ method: 'POST', url: '/api/auth/login', payload: { email: 'owner@marine.multi-entity.example', password: FIXTURE_PASSWORD } });
    const otherCookie = String(otherLogin.headers['set-cookie']).split(';')[0]!;
    assert.equal((await app.inject({ url: inventoryUrl, headers: { cookie: otherCookie } })).statusCode, 403);
    assert.equal((await app.inject({ url: `${base}/leads`, headers: { cookie: otherCookie } })).statusCode, 403);
    await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie: otherCookie } });

    // Existing availability gates must also protect physical category items.
    for (const availability of [{ soldAt: new Date() }, { removedAt: new Date() }, { priceCents: 0 }]) {
      await prisma.categoryInventoryItem.update({ where: { id: itemId }, data: availability });
      assert.equal((await app.inject(publicUrl)).statusCode, 404);
      assert.equal((await app.inject({ method: 'POST', url: `${publicUrl}/leads`, payload: { contactName: 'Blocked probe' } })).statusCode, 404);
      await prisma.categoryInventoryItem.update({ where: { id: itemId }, data: { soldAt: null, removedAt: null, priceCents: 6800 } });
    }
    const withdrawal = await app.inject({ method: 'DELETE', url: `${publishUrl}/${itemId}`, headers: { cookie } });
    assert.equal(withdrawal.statusCode, 204, withdrawal.body);
    assert.equal((await app.inject(publicUrl)).statusCode, 404);
  } finally {
    if (leadId) {
      await prisma.dealerNotification.deleteMany({ where: { dealershipId: dealerId, payload: { path: '$.leadId', equals: leadId } } });
      await prisma.dealershipActivityEvent.deleteMany({ where: { dealershipId: dealerId, detail: { path: '$.leadId', equals: leadId } } });
      await prisma.lead.deleteMany({ where: { id: leadId, dealershipId: dealerId } });
    }
    if (itemId) {
      await prisma.channelEvent.deleteMany({ where: { dealershipId: dealerId, listingId: itemId } });
      await prisma.categoryInventoryItem.deleteMany({ where: { id: itemId, dealershipId: dealerId } });
    }
    if (cookie) await app.inject({ method: 'POST', url: '/api/auth/logout', headers: { cookie } });
    await app.close();
    assert.equal(await snapshot(), before, 'Harborline must not change');
    await prisma.$disconnect();
  }
});
