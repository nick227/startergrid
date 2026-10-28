import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import Fastify from 'fastify';
import type { PrismaClient } from '@prisma/client';
import { registerWorkspaceRoutes, threadInput, taskPatch } from '../server/routes/workspaces.js';
import { businessActivity, groupBusinessEvents, salesRegister } from '../services/dealership/businessActivityService.js';

describe('business workspaces', () => {
  it('groups publishing operations without merging unrelated records and orders newest first', () => {
    const event = { id: 'batch:1', category: 'channels', title: 'Sent', detail: 'Channel', occurredAt: '2026-10-01T00:00:00.000Z', href: '#/d1/channels/x', count: 1 };
    const result = groupBusinessEvents([event, { ...event, occurredAt: '2026-10-02T00:00:00.000Z' }, { ...event, id: 'batch:2' }]);
    assert.equal(result.length, 2); assert.equal(result[0]!.count, 2); assert.equal(event.count, 1);
  });
  it('never substitutes asking price or sold timestamp for transaction facts', async () => {
    const db = { vehicle: { findMany: async () => [{ id: 'v1', stockNumber: 'S1', year: 2025, make: 'Ford', model: 'F-150', priceCents: 5000000, soldAt: new Date(), saleRecord: null }] } } as unknown as PrismaClient;
    const sale = (await salesRegister(db, 'd1')).sales[0]!;
    assert.equal(sale.salePriceCents, null); assert.equal(sale.transactionDate, null); assert.equal(sale.channel, null); assert.equal(sale.evidence, null);
  });
  it('retains explicitly recorded zero price and source confidence', async () => {
    const db = { vehicle: { findMany: async () => [{ id: 'v1', soldAt: new Date(), saleRecord: { salePriceCents: 0, transactionDate: null, confirmedChannelSlug: 'example', sourceConfidence: 'MANUAL_IMPORTED' } }] } } as unknown as PrismaClient;
    const sale = (await salesRegister(db, 'd1')).sales[0]!;
    assert.equal(sale.salePriceCents, 0); assert.equal(sale.evidence, 'MANUAL_IMPORTED');
  });
  it('scopes every feed source to the dealership and excludes scheduler noise', async () => {
    const calls: any[] = [];
    const source = { findMany: async (q: any) => { calls.push(q); return []; } };
    const db = Object.fromEntries(['lead','vehicle','vehicleLifecycleEvent','vehicleUpdate','syncEvent','ingressRun','leadDeliveryAttempt'].map(k => [k, source])) as unknown as PrismaClient;
    assert.deepEqual((await businessActivity(db, 'd1')).events, []);
    assert.equal(calls.length, 7); assert.ok(calls.every(q => q.where.dealershipId === 'd1'));
    assert.ok(!calls[4].where.kind.in.includes('DISPATCH_CLAIMED'));
  });
  it('paginates equal-timestamp events without losing records', async () => {
    const leads = Array.from({ length: 101 }, (_, i) => ({ id: `l${i}`, createdAt: new Date('2026-10-01T12:00:00Z'), platformSlug: 'storefront', contactName: 'Buyer' }));
    const empty = { findMany: async () => [] };
    const db = { lead: { findMany: async (q: any) => leads.slice(q.skip ?? 0, (q.skip ?? 0) + q.take) }, vehicle: empty, vehicleLifecycleEvent: empty, vehicleUpdate: empty, syncEvent: empty, ingressRun: empty, leadDeliveryAttempt: empty } as unknown as PrismaClient;
    const first = await businessActivity(db, 'd1');
    assert.equal(first.events.length, 100); assert.ok(first.nextCursor);
    const second = await businessActivity(db, 'd1', JSON.parse(Buffer.from(first.nextCursor!, 'base64url').toString()));
    assert.equal(second.events.length, 1); assert.equal(second.nextCursor, null);
    assert.equal(new Set([...first.events, ...second.events].map(e => e.id)).size, 101);
  });
  it('rejects empty, oversized and unexpected collaboration inputs', () => {
    assert.equal(threadInput.safeParse({ kind:'TASK', title:' ', body:'x' }).success, false);
    assert.equal(threadInput.safeParse({ kind:'TASK', title:'x', body:'x', dealershipId:'other' }).success, false);
    assert.equal(taskPatch.safeParse({}).success, false);
    assert.equal(threadInput.safeParse({ kind:'POST', title:'x', body:'x'.repeat(10001) }).success, false);
  });
  it('rejects unauthenticated reads, foreign dealers, foreign threads and invalid assignees', async () => {
    const old = { node: process.env.NODE_ENV, ids: process.env.DEV_OPERATOR_DEALER_IDS, op: process.env.DEV_OPERATOR_ID };
    process.env.NODE_ENV = 'test'; process.env.DEV_OPERATOR_DEALER_IDS = 'd1'; delete process.env.DEV_OPERATOR_ID;
    const app = Fastify();
    registerWorkspaceRoutes(app, { teamThread: { findFirst: async () => null, updateMany: async () => ({ count: 0 }) }, operatorDealerAccess: { findFirst: async () => null } } as unknown as PrismaClient);
    try {
      assert.equal((await app.inject('/api/dealers/d1/team')).statusCode, 401);
      const headers = { 'x-operator-id': 'staff' };
      assert.equal((await app.inject({ url:'/api/dealers/other/team', headers })).statusCode, 403);
      assert.equal((await app.inject({ method:'POST',url:'/api/dealers/d1/team/foreign/comments',headers,payload:{body:'hello'} })).statusCode, 404);
      assert.equal((await app.inject({ method:'PATCH',url:'/api/dealers/d1/team/foreign',headers,payload:{completed:true} })).statusCode, 404);
      assert.equal((await app.inject({ method:'POST',url:'/api/dealers/d1/team',headers,payload:{kind:'TASK',title:'Fix listing',body:'Review',assigneeId:'foreign'} })).statusCode, 400);
      assert.equal((await app.inject({ method:'POST',url:'/api/dealers/d1/team',headers,payload:{kind:'TASK',title:'Fix listing',body:'Review',reference:'#/other/activity/attention'} })).statusCode, 400);
    } finally {
      await app.close();
      for (const [key,value] of [['NODE_ENV',old.node],['DEV_OPERATOR_DEALER_IDS',old.ids],['DEV_OPERATOR_ID',old.op]]) { if(value === undefined) delete process.env[key!]; else process.env[key!] = value; }
    }
  });
});

import { PrismaClient as DatabaseClient } from '@prisma/client';
import { isolatedDatabaseUrl } from './helpers/isolatedDatabase.js';
const databaseUrl = isolatedDatabaseUrl();
describe('shared collaboration persistence (isolated MySQL)', { skip: !databaseUrl }, () => {
  it('persists a task, assignment, comment and completion, and cascades dealership deletion', async () => {
    const db = new DatabaseClient({ datasources: { db: { url: databaseUrl } } });
    const app = Fastify(); registerWorkspaceRoutes(app, db);
    let dealerId: string | undefined;
    let operatorId: string | undefined;
    try {
      const dealer = await db.dealershipProfile.create({ data: { legalName: 'Workspace Test Motors', rooftopAddress: {}, primaryContact: {}, desiredChannels: [] } }); dealerId = dealer.id;
      const operator = await db.operatorAccount.create({ data: { email: `workspace-${dealer.id}@example.test`, passwordHash: 'not-a-login-hash', role: 'DEALER_STAFF' } }); operatorId = operator.id;
      await db.operatorDealerAccess.create({ data: { dealershipId: dealer.id, operatorAccountId: operator.id, accessRole: 'DEALER_STAFF', grantedBy: operator.id } });
      const headers = { 'x-operator-id': operator.id };
      const url = `/api/dealers/${dealer.id}/team`;
      const created = await app.inject({ method: 'POST', url, headers, payload: { kind: 'TASK', title: 'Review listings', body: 'Check the channel status.', assigneeId: operator.id, reference: `#/${dealer.id}/activity/attention` } });
      assert.equal(created.statusCode, 201, created.body);
      const id = created.json().id;
      assert.equal((await app.inject({ method:'POST',url:`${url}/${id}/comments`,headers,payload:{body:'Reviewed by the team.'} })).statusCode, 201);
      assert.equal((await app.inject({ method:'PATCH',url:`${url}/${id}`,headers,payload:{completed:true} })).statusCode, 200);
      const listed = (await app.inject({ url, headers })).json();
      assert.equal(listed.threads[0].assigneeId, operator.id);
      assert.equal(listed.threads[0].comments[0].body, 'Reviewed by the team.');
      assert.ok(listed.threads[0].completedAt);
      const announcement = await app.inject({ method: 'POST', url, headers, payload: { kind: 'ANNOUNCEMENT', title: 'Lot hours', body: 'We open at 9.', assigneeId: operator.id } });
      assert.equal(announcement.statusCode, 201, announcement.body);
      const announcementId = announcement.json().id as string;
      assert.equal(announcement.json().assigneeId, null);
      assert.equal(announcement.json().kind, 'ANNOUNCEMENT');
      assert.equal((await app.inject({ method: 'PATCH', url: `${url}/${announcementId}`, headers, payload: { completed: true } })).statusCode, 404);
      assert.equal((await app.inject({ method: 'POST', url: `${url}/${announcementId}/comments`, headers, payload: { body: 'Posted on the board.' } })).statusCode, 201);
      const board = (await app.inject({ url, headers })).json() as { threads: Array<{ id: string; kind: string; title: string; comments: Array<{ body: string }> }> };
      const posted = board.threads.find(thread => thread.id === announcementId);
      assert.equal(posted?.kind, 'ANNOUNCEMENT');
      assert.equal(posted?.title, 'Lot hours');
      assert.equal(posted?.comments[0]?.body, 'Posted on the board.');
      await db.dealershipProfile.delete({where:{id:dealer.id}}); dealerId=undefined;
      assert.equal(await db.teamThread.count({where:{id}}),0);
      assert.equal(await db.teamComment.count({where:{threadId:id}}),0);
    } finally {
      if(dealerId) await db.dealershipProfile.delete({where:{id:dealerId}});
      if(operatorId) await db.operatorAccount.delete({where:{id:operatorId}});
      await app.close(); await db.$disconnect();
    }
  });
});
