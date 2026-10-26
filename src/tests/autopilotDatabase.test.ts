import { withInventoryTransaction } from '../services/autopilot/inventoryTransaction.js';
import assert from 'node:assert/strict';
import { after, before, describe, it } from 'node:test';
import { PrismaClient } from '@prisma/client';
import Fastify from 'fastify';
import { defaultPolicy } from '../services/autopilot/policy.js';
import { readPolicy, reconcileDealer, summary, updatePolicy } from '../services/autopilot/service.js';
import { guardInventoryMutation, guardRemovalBatch, InventorySafetyHold } from '../services/autopilot/inventoryGuard.js';
import { registerAutopilotRoutes } from '../server/routes/autopilot.js';
import { getMarketplaceVehicle } from '../services/marketplace/marketplaceQueryService.js';

const url = process.env['V5_TEST_DATABASE_URL'];
if (url && !new URL(url).pathname.startsWith('/startergrid_v5_test_')) throw new Error('Use a dedicated startergrid_v5_test_* database.');
describe('Autopilot durable first-party integration (isolated MySQL)', { skip: !url, concurrency: false }, () => {
  let db: PrismaClient;
  const oldEnabled = process.env['V5_AUTOPILOT_ENABLED'];
  before(() => { db = new PrismaClient({ datasources: { db: { url } } }); process.env['V5_AUTOPILOT_ENABLED']='true'; });
  after(async () => { await db.$disconnect(); if (oldEnabled === undefined) delete process.env['V5_AUTOPILOT_ENABLED']; else process.env['V5_AUTOPILOT_ENABLED']=oldEnabled; });
  async function fixture(mode: 'OFF'|'ON'|'PAUSED' = 'ON', count = 1) {
    const dealer = await db.dealershipProfile.create({ data: { legalName: 'Autopilot integration test', businessCategory: 'AUTOMOTIVE',
      rooftopAddress: { city:'Test',state:'IL' }, primaryContact: {email:'test@example.local'}, desiredChannels:['consumer-marketplace'] } });
    await db.platformAccount.create({data:{dealershipId:dealer.id, platformSlug:'consumer-marketplace', dealerEnabled:true,state:'ACTIVE'}});
    const vehicles=[];
    for(let i=0;i<count;i++) vehicles.push(await db.vehicle.create({data:{dealershipId:dealer.id,stockNumber:`V${i}`,vin:`TEST${i}`,year:2024,make:'Ford',model:'F150',
      mileage:1000,priceCents:2_000_000,condition:'USED',exteriorColor:'Blue',options:[],starCore:{},listingStatus:'READY',
      media:{create:{url:'https://example.test/photo.jpg',kind:'IMAGE',sortOrder:0}}}}));
    await updatePolicy(db,{...defaultPolicy(dealer.id),mode,includedChannels:['consumer-marketplace']},{id:'test-admin',email:'admin@example.local'});
    return {dealer,vehicles};
  }
  it('OFF/PAUSED cannot create listings',async()=>{
    for(const mode of ['OFF','PAUSED'] as const) { const {dealer}=await fixture(mode); await reconcileDealer(db,dealer.id);
      assert.equal(await db.marketplaceListing.count({where:{dealershipId:dealer.id}}),0); }
  });
  it('verifies owned public readback; repeated events and concurrent workers produce one effect',async()=>{
    const {dealer,vehicles:[v]}=await fixture();
    await Promise.all([reconcileDealer(db,dealer.id),reconcileDealer(db,dealer.id)]);
    await reconcileDealer(db,dealer.id);
    assert.ok(await getMarketplaceVehicle(db,v!.id));
    assert.equal(await db.marketplaceListing.count({where:{dealershipId:dealer.id}}),1);
    assert.equal(await db.syncEvent.count({where:{dealershipId:dealer.id}}),1);
    assert.equal((await summary(db,dealer.id)).counts.VERIFIED_LIVE,1);
  });
  it('detects price, detail and photo changes without an in-memory event',async()=>{
    const {dealer,vehicles:[v]}=await fixture(); await reconcileDealer(db,dealer.id);
    await db.vehicle.update({where:{id:v!.id},data:{priceCents:2_100_000,mileage:1500}});
    await db.vehicleMedia.updateMany({where:{vehicleId:v!.id},data:{url:'https://example.test/revised.jpg'}});
    await reconcileDealer(db,dealer.id);
    const target=await db.distributionTarget.findFirstOrThrow({where:{dealershipId:dealer.id}});
    assert.equal(target.generation,2);assert.equal(target.status,'VERIFIED_LIVE');
    assert.equal((await getMarketplaceVehicle(db,v!.id))?.vehicle.commerce.priceCents,2_100_000);
  });
  it('withdraws sold inventory while paused and relists as a new generation',async()=>{
    const {dealer,vehicles:[v]}=await fixture();await reconcileDealer(db,dealer.id);
    await updatePolicy(db,{...await readPolicy(db,dealer.id),mode:'PAUSED'},{id:'test-admin',email:'admin@example.local'});
    await db.vehicle.update({where:{id:v!.id},data:{soldAt:new Date()}});await reconcileDealer(db,dealer.id);
    assert.equal((await db.distributionTarget.findFirstOrThrow({where:{dealershipId:dealer.id}})).status,'VERIFIED_REMOVED');
    assert.equal(await getMarketplaceVehicle(db,v!.id),null);
    await db.vehicle.update({where:{id:v!.id},data:{soldAt:null}});await reconcileDealer(db,dealer.id);
    assert.equal(await getMarketplaceVehicle(db,v!.id),null,'paused relist cannot reactivate ENDED listing');
    await updatePolicy(db,{...await readPolicy(db,dealer.id),mode:'ON'},{id:'test-admin',email:'admin@example.local'});
    await reconcileDealer(db,dealer.id);assert.ok(await getMarketplaceVehicle(db,v!.id));
  });
  it('pre-write price safeguards keep the previous public price and persist an owned incident',async()=>{
    const {dealer,vehicles:[v]}=await fixture();await reconcileDealer(db,dealer.id);
    await assert.rejects(guardInventoryMutation(db,dealer.id,v!.id,{priceCents:1000}),InventorySafetyHold);
    assert.equal((await getMarketplaceVehicle(db,v!.id))?.vehicle.commerce.priceCents,2_000_000);
    const incident=await db.distributionIncident.findFirstOrThrow({where:{dealershipId:dealer.id}});
    assert.equal(incident.owner,'INTERNAL_SUPPORT');assert.ok(incident.nextAction);
  });
  it('mass source removal is held before any availability changes',async()=>{
    const {dealer,vehicles}=await fixture('ON',4);await reconcileDealer(db,dealer.id);
    await assert.rejects(guardRemovalBatch(db,dealer.id,vehicles.map(v=>v.id),'batch-1'),InventorySafetyHold);
    assert.equal(await db.vehicle.count({where:{dealershipId:dealer.id,soldAt:null,removedAt:null}}),4);
    assert.equal((await db.distributionIncident.findFirstOrThrow({where:{dealershipId:dealer.id}})).reasonCode,'REMOVAL_BATCH');
  });
  it('connection recovery retries setup-blocked inventory and verifies resolution',async()=>{
    const {dealer}=await fixture();
    await db.platformAccount.updateMany({where:{dealershipId:dealer.id},data:{state:'CREDENTIALS_NEEDED'}});
    await reconcileDealer(db,dealer.id);assert.equal((await summary(db,dealer.id)).counts.NEEDS_SETUP,1);
    await db.platformAccount.updateMany({where:{dealershipId:dealer.id},data:{state:'ACTIVE'}});
    await reconcileDealer(db,dealer.id);assert.equal((await summary(db,dealer.id)).counts.VERIFIED_LIVE,1);
    assert.equal(await db.distributionIncident.count({where:{dealershipId:dealer.id,state:'OPEN'}}),0);
  });
  it('changed inventory invalidates current evidence before the next sweep',async()=>{
    const {dealer,vehicles:[v]}=await fixture();await reconcileDealer(db,dealer.id);
    await db.vehicle.update({where:{id:v!.id},data:{mileage:2500}});
    assert.equal((await summary(db,dealer.id)).counts.UNKNOWN,1);
    await reconcileDealer(db,dealer.id);
    assert.equal((await summary(db,dealer.id)).counts.VERIFIED_LIVE,1);
  });
  it('a held price cannot resolve against old evidence; approval applies and verifies it',async()=>{
    const {dealer,vehicles:[v]}=await fixture();await reconcileDealer(db,dealer.id);
    await assert.rejects(guardInventoryMutation(db,dealer.id,v!.id,{priceCents:1000}),InventorySafetyHold);
    const incident=await db.distributionIncident.findFirstOrThrow({where:{dealershipId:dealer.id}});
    const app=Fastify();registerAutopilotRoutes(app,db);
    const url=`/api/dealers/${dealer.id}/distribution/incidents/${incident.id}`;
    const headers={'x-operator-id':'test-admin'};
    try {
      assert.equal((await app.inject({method:'POST',url:url+'/resolve',headers})).statusCode,409);
      const approved=await app.inject({method:'POST',url:url+'/approve',headers,payload:{reason:'Verified correction'}});
      assert.equal(approved.statusCode,200,approved.body);
      await reconcileDealer(db,dealer.id);
      assert.equal((await getMarketplaceVehicle(db,v!.id))?.vehicle.commerce.priceCents,1000);
      assert.equal((await db.distributionIncident.findUniqueOrThrow({where:{id:incident.id}})).state,'RESOLVED');
    } finally {await app.close();}
  });
  it('approved batch is withdrawn and resolves only after every item is verified',async()=>{
    const {dealer,vehicles}=await fixture('ON',4);await reconcileDealer(db,dealer.id);
    await assert.rejects(guardRemovalBatch(db,dealer.id,vehicles.map(v=>v.id)),InventorySafetyHold);
    const incident=await db.distributionIncident.findFirstOrThrow({where:{dealershipId:dealer.id}});
    const app=Fastify();registerAutopilotRoutes(app,db);
    const url=`/api/dealers/${dealer.id}/distribution/incidents/${incident.id}`,headers={'x-operator-id':'test-admin'};
    try {
      assert.equal((await app.inject({method:'POST',url:url+'/approve',headers,payload:{reason:'Confirmed closure batch'}})).statusCode,200);
      assert.equal((await app.inject({method:'POST',url:url+'/resolve',headers})).statusCode,409);
      await guardRemovalBatch(db,dealer.id,vehicles.map(v=>v.id));
      await db.vehicle.updateMany({where:{dealershipId:dealer.id},data:{removedAt:new Date()}});
      await reconcileDealer(db,dealer.id);
      const resolved=await app.inject({method:'POST',url:url+'/resolve',headers});
      assert.equal(resolved.statusCode,200,resolved.body);
    } finally {await app.close();}
  });
  it('serializes split removal batches and preserves the held incident after rollback',async()=>{
    const {dealer,vehicles}=await fixture('ON',4);await reconcileDealer(db,dealer.id);
    const remove = (ids: string[]) => withInventoryTransaction(db,dealer.id,async tx=>{
      await guardRemovalBatch(tx,dealer.id,ids);
      await tx.vehicle.updateMany({where:{id:{in:ids}},data:{removedAt:new Date()}});
    });
    const results=await Promise.allSettled([remove(vehicles.slice(0,2).map(v=>v.id)),remove(vehicles.slice(2).map(v=>v.id))]);
    assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
    assert.equal(results.filter(r=>r.status==='rejected' && r.reason instanceof InventorySafetyHold).length,1);
    assert.equal(await db.vehicle.count({where:{dealershipId:dealer.id,removedAt:null}}),2);
    const incident=await db.distributionIncident.findFirstOrThrow({where:{dealershipId:dealer.id,reasonCode:'REMOVAL_BATCH'}});
    assert.equal(incident.state,'OPEN');
  });
  it('a later hold rolls back earlier source writes without losing the proposal',async()=>{
    const {dealer,vehicles:[v]}=await fixture();await reconcileDealer(db,dealer.id);
    await assert.rejects(withInventoryTransaction(db,dealer.id,async tx=>{
      await tx.vehicle.update({where:{id:v!.id},data:{mileage:9999}});
      await guardInventoryMutation(tx,dealer.id,v!.id,{priceCents:1000});
    }),InventorySafetyHold);
    assert.equal((await db.vehicle.findUniqueOrThrow({where:{id:v!.id}})).mileage,1000);
    const incident=await db.distributionIncident.findFirstOrThrow({where:{dealershipId:dealer.id,reasonCode:'PRICE_MUTATION_HELD'}});
    assert.equal((incident.technicalEvidence as {sourceUpdatedAt:string}).sourceUpdatedAt,
      (await db.vehicle.findUniqueOrThrow({where:{id:v!.id}})).updatedAt.toISOString());
  });
  it('API rejects unqualified activation, version conflicts, and cross-dealer read without session',async()=>{
    const {dealer}=await fixture();
    await assert.rejects(updatePolicy(db,{...await readPolicy(db,dealer.id),includedChannels:['google-vehicle-ads']},{id:'a',email:'a@example.local'}),/not qualified/);
    const p=await readPolicy(db,dealer.id);
    await updatePolicy(db,{...p,mode:'OFF'},{id:'a',email:'a@example.local'});
    await assert.rejects(updatePolicy(db,p,{id:'a',email:'a@example.local'}),/Policy changed/);
    const app=Fastify();registerAutopilotRoutes(app,db);
    const old=process.env['DEV_OPERATOR_ID'];delete process.env['DEV_OPERATOR_ID'];
    try { assert.equal((await app.inject({url:`/api/dealers/${dealer.id}/autopilot`})).statusCode,401); }
    finally { if(old!==undefined)process.env['DEV_OPERATOR_ID']=old;await app.close(); }
  });
});
