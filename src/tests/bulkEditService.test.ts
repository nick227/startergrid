import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PrismaClient } from '@prisma/client';
import {
  applyBulkEdit,
  bulkEditRequestSchema,
  previewBulkEdit,
  undoBulkEdit,
  BulkEditUndoError,
} from '../services/inventory/bulkEditService.js';
import { buildApp } from '../server/app.js';
import { isolatedDatabaseUrl } from './helpers/isolatedDatabase.js';

const actor = { id: 'op-1', email: 'op@dealer.test' };
const base = {
  dealershipId: 'd-bulk', year: 2022, make: 'Honda', model: 'CR-V', vin: '1HGCR2F8XNA000001', trim: null, mileage: 1000,
  condition: 'USED', exteriorColor: 'Blue', interiorColor: null, bodyStyle: null, drivetrain: null, fuelType: null,
  transmission: null, originalPriceCents: null, priceLastChangedAt: null, soldAt: null, removedAt: null,
};
const vehicle = (id: string, over: Record<string, unknown> = {}) => ({
  ...base, id, stockNumber: id.toUpperCase(), priceCents: 2_000_000, updatedAt: new Date('2026-10-01T00:00:00Z'), ...over,
});

// Stateful stand-in: vehicles change only through the writes the service makes.
function fakeDb(rows: any[], opts: { failUpdateFor?: string } = {}) {
  const vehicles = rows.map(r => ({ ...r }));
  const updates: any[] = [];
  const audit: any[] = [];
  const byPath = (path: string, value: string) => (u: any) => u.newValue?.[path.replace('$.', '')] === value;
  const db: any = {
    vehicle: {
      findMany: async ({ where }: any) => vehicles.filter(v => v.dealershipId === where.dealershipId && where.id.in.includes(v.id)).map(v => ({ ...v })),
      update: async ({ where, data }: any) => {
        if (where.id === opts.failUpdateFor) throw new Error('database unavailable');
        const v = vehicles.find(x => x.id === where.id);
        Object.assign(v, data, { updatedAt: new Date() });
        return v;
      },
    },
    vehicleUpdate: {
      create: async ({ data }: any) => { updates.push(data); return data; },
      findMany: async ({ where }: any) => updates.filter(u => u.dealershipId === where.dealershipId && byPath(where.newValue.path, where.newValue.equals)(u)),
      findFirst: async ({ where }: any) => updates.find(u => u.dealershipId === where.dealershipId && byPath(where.newValue.path, where.newValue.equals)(u)) ?? null,
    },
    adminAuditLog: { create: async ({ data }: any) => { audit.push(data); return data; } },
  };
  return { db, vehicles, updates, audit };
}

const req = (edits: any[]) => bulkEditRequestSchema.parse({ edits });

describe('bulk vehicle edit', () => {
  it('previews per-vehicle changes without writing', async () => {
    const f = fakeDb([vehicle('a'), vehicle('b', { exteriorColor: 'Red' }), vehicle('c', { soldAt: new Date() })]);
    const preview = await previewBulkEdit(f.db, 'd-bulk', req([
      { vehicleId: 'a', fields: { exteriorColor: 'Red', priceCents: 1_950_000 } },
      { vehicleId: 'b', fields: { exteriorColor: 'Red' } },
      { vehicleId: 'c', fields: { exteriorColor: 'Red' } },
      { vehicleId: 'missing', fields: { exteriorColor: 'Red' } },
    ]));
    assert.deepEqual(preview.rows.map(r => r.status), ['WILL_CHANGE', 'NO_CHANGE', 'REJECTED', 'REJECTED']);
    assert.deepEqual([...preview.rows[0]!.changes].sort((x, y) => x.field.localeCompare(y.field)), [
      { field: 'exteriorColor', from: 'Blue', to: 'Red' },
      { field: 'priceCents', from: 2_000_000, to: 1_950_000 },
    ]);
    assert.match(preview.rows[2]!.reason!, /sold/);
    assert.equal(preview.counts.WILL_CHANGE, 1);
    assert.equal(f.updates.length, 0);
    assert.equal(f.vehicles[0]!.exteriorColor, 'Blue');
  });

  it('applies each vehicle separately and reports every outcome', async () => {
    const f = fakeDb([vehicle('a'), vehicle('b'), vehicle('c')], { failUpdateFor: 'c' });
    const result = await applyBulkEdit(f.db, 'd-bulk', req([
      { vehicleId: 'a', fields: { priceCents: 1_900_000 } },
      { vehicleId: 'b', fields: { mileage: 5000 }, expectedUpdatedAt: '2026-09-01T00:00:00Z' },
      { vehicleId: 'c', fields: { mileage: 7000 } },
    ]), actor);
    assert.deepEqual(result.rows.map(r => r.status), ['APPLIED', 'CONFLICT', 'FAILED']);
    assert.match(result.rows[1]!.reason!, /changed after the preview/);
    assert.match(result.rows[2]!.reason!, /database unavailable/);
    assert.ok(result.batchId);
    assert.equal(result.undoAvailable, true);
    assert.equal(f.vehicles[0]!.priceCents, 1_900_000);
    assert.ok(f.vehicles[0]!.priceLastChangedAt instanceof Date, 'price changes record when the price moved');
    assert.equal(f.vehicles[0]!.originalPriceCents, 2_000_000);
    assert.equal(f.vehicles[1]!.mileage, 1000, 'a conflicting vehicle is not overwritten');
    assert.equal(f.updates[0]!.kind, 'PRICE_CHANGE');
    assert.equal(f.audit[0]!.action, 'INVENTORY_BULK_EDIT');
  });

  it('returns no batch when nothing was applied', async () => {
    const f = fakeDb([vehicle('a')]);
    const result = await applyBulkEdit(f.db, 'd-bulk', req([{ vehicleId: 'a', fields: { exteriorColor: 'Blue' } }]), actor);
    assert.equal(result.batchId, null);
    assert.equal(result.undoAvailable, false);
    assert.equal(f.audit.length, 0);
  });

  it('undoes only vehicles nobody changed since, once', async () => {
    const f = fakeDb([vehicle('a'), vehicle('b'), vehicle('c')]);
    const { batchId } = await applyBulkEdit(f.db, 'd-bulk', req([
      { vehicleId: 'a', fields: { exteriorColor: 'Red', trim: 'EX' } },
      { vehicleId: 'b', fields: { exteriorColor: 'Red' } },
      { vehicleId: 'c', fields: { exteriorColor: 'Red' } },
    ]), actor);
    f.vehicles[1]!.exteriorColor = 'Green';           // edited again after the batch
    f.vehicles[2]!.soldAt = new Date();               // sold after the batch

    const undo = await undoBulkEdit(f.db, 'd-bulk', batchId!, actor);
    assert.deepEqual(undo.rows.map(r => r.status), ['RESTORED', 'SKIPPED', 'SKIPPED']);
    assert.equal(f.vehicles[0]!.exteriorColor, 'Blue');
    assert.equal(f.vehicles[0]!.trim, null);
    assert.equal(f.vehicles[1]!.exteriorColor, 'Green', 'newer edits are kept');
    assert.match(undo.rows[1]!.reason!, /Edited again/);
    assert.match(undo.note, /next update/);

    await assert.rejects(() => undoBulkEdit(f.db, 'd-bulk', batchId!, actor),
      (e: any) => e instanceof BulkEditUndoError && e.statusCode === 409);
    await assert.rejects(() => undoBulkEdit(f.db, 'other-dealer', batchId!, actor),
      (e: any) => e instanceof BulkEditUndoError && e.statusCode === 404);
  });

  it('rejects malformed requests', () => {
    assert.throws(() => req([{ vehicleId: 'a', fields: {} }]));
    assert.throws(() => req([{ vehicleId: 'a', fields: { priceCents: 0 } }]));
    assert.throws(() => req([{ vehicleId: 'a', fields: { listingStatus: 'READY' } }]), 'only editable fields');
    assert.throws(() => req([{ vehicleId: 'a', fields: { mileage: 1 } }, { vehicleId: 'a', fields: { mileage: 2 } }]));
  });

  it('requires access to the dealership', async () => {
    const previous = process.env['DEV_OPERATOR_DEALER_IDS'];
    process.env['DEV_OPERATOR_DEALER_IDS'] = 'other-dealer';
    try {
      const app = buildApp(fakeDb([]).db);
      const body = { edits: [{ vehicleId: 'a', fields: { mileage: 1 } }] };
      assert.equal((await app.inject({ method: 'POST', url: '/api/dealers/d-bulk/inventory/bulk-edits', payload: body })).statusCode, 401);
      const res = await app.inject({ method: 'POST', url: '/api/dealers/d-bulk/inventory/bulk-edits', payload: body, headers: { 'x-operator-id': 'dev-operator' } });
      assert.equal(res.statusCode, 403);
    } finally {
      if (previous === undefined) delete process.env['DEV_OPERATOR_DEALER_IDS']; else process.env['DEV_OPERATOR_DEALER_IDS'] = previous;
    }
  });
});

const dbUrl = isolatedDatabaseUrl();
describe('bulk vehicle edit (isolated MySQL)', { skip: !dbUrl }, () => {
  it('applies, finds the batch by its JSON marker and undoes it', async () => {
    const db = new PrismaClient({ datasources: { db: { url: dbUrl } } });
    try {
      const dealer = await db.dealershipProfile.create({ data: { legalName: 'Bulk Edit Motors', rooftopAddress: {}, primaryContact: {}, desiredChannels: [] } });
      const v = await db.vehicle.create({ data: {
        dealershipId: dealer.id, stockNumber: 'BULK-1', vin: '1HGCR2F8XNA000001', year: 2022, make: 'Honda', model: 'CR-V',
        mileage: 1000, priceCents: 2_000_000, condition: 'USED', exteriorColor: 'Blue', options: [], starCore: {},
      } });
      const preview = await previewBulkEdit(db, dealer.id, req([{ vehicleId: v.id, fields: { priceCents: 1_950_000 } }]));
      const applied = await applyBulkEdit(db, dealer.id, req([{ vehicleId: v.id, fields: { priceCents: 1_950_000 }, expectedUpdatedAt: preview.rows[0]!.updatedAt! }]), actor);
      assert.equal(applied.rows[0]!.status, 'APPLIED');
      const undo = await undoBulkEdit(db, dealer.id, applied.batchId!, actor);
      assert.equal(undo.rows[0]!.status, 'RESTORED');
      assert.equal((await db.vehicle.findUniqueOrThrow({ where: { id: v.id } })).priceCents, 2_000_000);
      await assert.rejects(() => undoBulkEdit(db, dealer.id, applied.batchId!, actor), (e: any) => e.statusCode === 409);
      await db.dealershipProfile.delete({ where: { id: dealer.id } });
    } finally {
      await db.$disconnect();
    }
  });
});
