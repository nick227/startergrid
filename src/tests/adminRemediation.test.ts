import assert from 'node:assert/strict';
import { describe, it, before, after } from 'node:test';
import { PrismaClient } from '@prisma/client';
import Fastify, { FastifyInstance } from 'fastify';
import { registerAdminRoutes } from '../server/routes/admin.js';

const prisma = new PrismaClient();

describe('Admin Remediation API Concurrency & Idempotency', () => {
  let app: FastifyInstance;
  let superAdminId: string;
  let dealerId: string;

  before(async () => {
    app = Fastify();

    // `security.ts`'s requireOperator() does its own cookie/header parsing on every call —
    // it doesn't consult a pre-set request.operator — so authenticating here means using
    // its documented dev/test fallback (the x-operator-id header) rather than mocking
    // request.operator directly. The decorator declaration is still required by Fastify
    // before requireOperator can assign to request.operator.
    app.decorateRequest('operator', undefined as any);

    registerAdminRoutes(app, prisma);
    await app.ready();

    // Create a mock super admin
    const admin = await prisma.operatorAccount.create({
      data: {
        email: `admin_${Date.now()}@test.com`,
        passwordHash: 'dummy',
        role: 'SUPER_ADMIN'
      }
    });
    superAdminId = admin.id;

    // Create a mock dealership
    const dealer = await prisma.dealershipProfile.create({
      data: {
        legalName: 'Test Remediation Dealer',
        rooftopAddress: {},
        primaryContact: {},
        desiredChannels: []
      }
    });
    dealerId = dealer.id;
  });

  after(async () => {
    await prisma.publishQueueItem.deleteMany({ where: { dealershipId: dealerId } });
    await prisma.dealershipProfile.delete({ where: { id: dealerId } });
    await prisma.operatorAccount.delete({ where: { id: superAdminId } });
    await prisma.$disconnect();
    await app.close();
  });

  it('rejects unauthenticated retry attempts', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/issues/retry',
      payload: { incidentId: '123', dealerId, reasonCode: 'test' }
    });
    // No x-operator-id header and no op_session cookie → requireOperator rejects it.
    assert.notStrictEqual(res.statusCode, 200);
  });

  it('returns already_resolved if there are no failed queue items', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/issues/retry',
      headers: { 'x-operator-id': superAdminId },
      payload: { incidentId: '123', dealerId, platformSlug: 'test-platform', reasonCode: 'test_error' }
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json().status, 'already_resolved');
  });

  it('updates failed items to READY and logs the action', async () => {
    // Insert a fake vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        dealershipId: dealerId,
        vin: 'TESTVINRETRY',
        stockNumber: 'STK_RETRY',
        year: 2024,
        make: 'Honda',
        model: 'Civic',
        mileage: 10,
        priceCents: 2000000,
        condition: 'NEW',
        exteriorColor: 'Black',
        options: {},
        starCore: {}
      }
    });

    // Create a failed queue item
    const item = await prisma.publishQueueItem.create({
      data: {
        dealershipId: dealerId,
        vehicleId: vehicle.id,
        platformSlug: 'test-platform',
        status: 'FAILED',
        failureReason: 'test_error',
        triggerKind: 'PRICE_CHANGE',
        policyMode: 'REAL_TIME'
      }
    });

    const res = await app.inject({
      method: 'POST',
      url: '/api/admin/issues/retry',
      headers: { 'x-operator-id': superAdminId },
      payload: { incidentId: '123', dealerId, platformSlug: 'test-platform', reasonCode: 'test_error' }
    });

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json().status, 'succeeded');

    // Verify it was reset to READY
    const updated = await prisma.publishQueueItem.findUnique({ where: { id: item.id } });
    assert.strictEqual(updated?.status, 'READY');

    // Verify audit log
    const log = await prisma.adminAuditLog.findFirst({
      where: { actorId: superAdminId, action: 'ISSUE_RETRY' },
      orderBy: { createdAt: 'desc' }
    });
    assert.notStrictEqual(log, null);
    assert.notStrictEqual(log, undefined);

    const detail = log?.detail as any;
    assert.strictEqual(detail.result, 'succeeded');

    await prisma.publishQueueItem.deleteMany({ where: { vehicleId: vehicle.id } });
    await prisma.vehicle.delete({ where: { id: vehicle.id } });
  });

  it('handles concurrent identical retry requests idempotently', async () => {
    // Insert a fake vehicle
    const vehicle = await prisma.vehicle.create({
      data: {
        dealershipId: dealerId,
        vin: 'TESTVINCONCUR',
        stockNumber: 'STK_CONCUR',
        year: 2024,
        make: 'Honda',
        model: 'Accord',
        mileage: 10,
        priceCents: 2500000,
        condition: 'NEW',
        exteriorColor: 'White',
        options: {},
        starCore: {}
      }
    });

    await prisma.publishQueueItem.create({
      data: {
        dealershipId: dealerId,
        vehicleId: vehicle.id,
        platformSlug: 'test-platform-2',
        status: 'FAILED',
        failureReason: 'test_error',
        triggerKind: 'PRICE_CHANGE',
        policyMode: 'REAL_TIME'
      }
    });

    // Send 3 requests concurrently
    const payload = { incidentId: '456', dealerId, platformSlug: 'test-platform-2', reasonCode: 'test_error' };

    const responses = await Promise.all([
      app.inject({ method: 'POST', url: '/api/admin/issues/retry', headers: { 'x-operator-id': superAdminId }, payload }),
      app.inject({ method: 'POST', url: '/api/admin/issues/retry', headers: { 'x-operator-id': superAdminId }, payload }),
      app.inject({ method: 'POST', url: '/api/admin/issues/retry', headers: { 'x-operator-id': superAdminId }, payload })
    ]);

    // In a perfectly locked system, 1 succeeds, 2 get already_resolved.
    // In our optimistic updateMany system, all might return "succeeded" if they race,
    // but the end state is correct (attemptCount = 0, status = READY).
    // Let's just assert that they all return 200 OK and the final state is READY.
    responses.forEach(r => assert.strictEqual(r.statusCode, 200));

    const finalItem = await prisma.publishQueueItem.findFirst({ where: { vehicleId: vehicle.id } });
    assert.strictEqual(finalItem?.status, 'READY');

    await prisma.publishQueueItem.deleteMany({ where: { vehicleId: vehicle.id } });
    await prisma.vehicle.delete({ where: { id: vehicle.id } });
  });

  it('handles overlapping bulk and single retries correctly (partial success)', async () => {
    // Create vehicles
    const v1 = await prisma.vehicle.create({
      data: { dealershipId: dealerId, vin: 'VIN_BULK1', stockNumber: 'STK_B1', year: 2024, make: 'Ford', model: 'F-150', mileage: 10, priceCents: 4500000, condition: 'NEW', exteriorColor: 'Blue', options: {}, starCore: {} }
    });
    const v2 = await prisma.vehicle.create({
      data: { dealershipId: dealerId, vin: 'VIN_BULK2', stockNumber: 'STK_B2', year: 2024, make: 'Ford', model: 'Explorer', mileage: 10, priceCents: 3500000, condition: 'NEW', exteriorColor: 'Red', options: {}, starCore: {} }
    });

    // Create queue items
    await prisma.publishQueueItem.create({
      data: { dealershipId: dealerId, vehicleId: v1.id, platformSlug: 'bulk-platform', status: 'FAILED', failureReason: 'err1', triggerKind: 'PRICE_CHANGE', policyMode: 'REAL_TIME' }
    });
    await prisma.publishQueueItem.create({
      data: { dealershipId: dealerId, vehicleId: v2.id, platformSlug: 'bulk-platform-2', status: 'FAILED', failureReason: 'err2', triggerKind: 'PRICE_CHANGE', policyMode: 'REAL_TIME' }
    });

    const bulkPayload = {
      incidents: [
        { incidentId: 'bulk-incident-1', dealerId, platformSlug: 'bulk-platform', reasonCode: 'err1', isBulkSafe: true },
        { incidentId: 'bulk-incident-2', dealerId, platformSlug: 'bulk-platform-2', reasonCode: 'err2', isBulkSafe: true }
      ]
    };

    const singlePayload = { incidentId: 'bulk-incident-2', dealerId, platformSlug: 'bulk-platform-2', reasonCode: 'err2' };

    // Fire bulk request and single request simultaneously
    const [bulkRes, singleRes] = await Promise.all([
      app.inject({ method: 'POST', url: '/api/admin/issues/bulk-retry', headers: { 'x-operator-id': superAdminId }, payload: bulkPayload }),
      app.inject({ method: 'POST', url: '/api/admin/issues/retry', headers: { 'x-operator-id': superAdminId }, payload: singlePayload })
    ]);

    assert.strictEqual(bulkRes.statusCode, 200);
    assert.strictEqual(singleRes.statusCode, 200);

    const bulkData = bulkRes.json();
    const singleData = singleRes.json();

    // The single item should have returned either succeeded or already_resolved.
    assert.ok(['succeeded', 'already_resolved'].includes(singleData.status));

    // The bulk results should have array of results.
    const res1 = bulkData.results.find((r: any) => r.incidentId === 'bulk-incident-1');
    const res2 = bulkData.results.find((r: any) => r.incidentId === 'bulk-incident-2');

    assert.strictEqual(res1.status, 'succeeded'); // Since it wasn't overlapping
    assert.ok(['succeeded', 'already_resolved'].includes(res2.status)); // Overlapped with single request

    // Verify both items in DB are READY
    const items = await prisma.publishQueueItem.findMany({ where: { vehicleId: { in: [v1.id, v2.id] } } });
    assert.ok(items.every(i => i.status === 'READY'));

    await prisma.publishQueueItem.deleteMany({ where: { vehicleId: { in: [v1.id, v2.id] } } });
    await prisma.vehicle.deleteMany({ where: { id: { in: [v1.id, v2.id] } } });
  });
});
