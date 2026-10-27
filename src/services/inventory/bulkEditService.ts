import { randomUUID } from 'node:crypto';
import type { Prisma, PrismaClient, Vehicle } from '@prisma/client';
import { z } from 'zod';
import { guardInventoryMutation, InventorySafetyHold } from '../autopilot/inventoryGuard.js';
import { withInventoryTransaction } from '../autopilot/inventoryTransaction.js';

/**
 * Spreadsheet-style bulk correction: each edit names one vehicle and the fields to set, so a
 * common change and per-row corrections use the same contract. Preview never writes. Apply
 * commits vehicle by vehicle and reports each outcome; a batch can be undone only for
 * vehicles nobody has changed since.
 */

const optionalText = (max: number) => z.string().trim().min(1).max(max).nullable();
export const bulkEditFieldsSchema = z.object({
  priceCents: z.number().int().min(1).max(100_000_000),
  mileage: z.number().int().min(0).max(2_000_000),
  condition: z.enum(['NEW', 'USED', 'CPO']),
  exteriorColor: z.string().trim().min(1).max(80),
  trim: optionalText(120),
  interiorColor: optionalText(80),
  bodyStyle: optionalText(80),
  drivetrain: optionalText(80),
  fuelType: optionalText(80),
  transmission: optionalText(80),
}).partial().strict().refine(f => Object.keys(f).length > 0, { message: 'Each edit needs at least one field.' });

export const bulkEditRequestSchema = z.object({
  edits: z.array(z.object({
    vehicleId: z.string().min(1).max(191),
    fields: bulkEditFieldsSchema,
    /** Vehicle updatedAt from the preview; a vehicle changed since then is not overwritten. */
    expectedUpdatedAt: z.string().datetime().optional(),
  }).strict()).min(1).max(500),
}).strict().refine(r => new Set(r.edits.map(e => e.vehicleId)).size === r.edits.length, {
  message: 'Each vehicle can appear only once per bulk edit.',
});

export type BulkEditRequest = z.infer<typeof bulkEditRequestSchema>;
type Fields = z.infer<typeof bulkEditFieldsSchema>;
type FieldKey = keyof Fields;
type FieldValue = string | number | null;

export type FieldChange = { field: FieldKey; from: FieldValue; to: FieldValue };
export type BulkEditRowStatus =
  | 'WILL_CHANGE' | 'NO_CHANGE' | 'REJECTED'                                  // preview
  | 'APPLIED' | 'CONFLICT' | 'HELD' | 'FAILED';                               // apply adds
export type BulkEditRow = {
  vehicleId: string;
  stockNumber: string | null;
  label: string | null;
  status: BulkEditRowStatus;
  changes: FieldChange[];
  reason: string | null;
  /** Distribution incident created when an Autopilot safeguard held the change. */
  incidentId: string | null;
  updatedAt: string | null;
};
export type BulkEditCounts = Partial<Record<BulkEditRowStatus, number>>;
export type BulkEditPreview = { rows: BulkEditRow[]; counts: BulkEditCounts };
export type BulkEditResult = { batchId: string | null; rows: BulkEditRow[]; counts: BulkEditCounts; undoAvailable: boolean };

export type BulkUndoRowStatus = 'RESTORED' | 'SKIPPED' | 'HELD' | 'FAILED';
export type BulkUndoRow = { vehicleId: string; stockNumber: string | null; status: BulkUndoRowStatus; changes: FieldChange[]; reason: string | null; incidentId: string | null };
export type BulkUndoResult = { batchId: string; rows: BulkUndoRow[]; counts: Partial<Record<BulkUndoRowStatus, number>>; note: string };

type Actor = { id: string; email?: string | null };

const label = (v: Pick<Vehicle, 'year' | 'make' | 'model' | 'stockNumber'>) => `${v.year} ${v.make} ${v.model} #${v.stockNumber}`;
const count = <S extends string>(rows: Array<{ status: S }>) =>
  rows.reduce<Partial<Record<S, number>>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {});

function diff(vehicle: Vehicle, fields: Fields): FieldChange[] {
  return (Object.keys(fields) as FieldKey[])
    .map(field => ({ field, from: (vehicle[field] ?? null) as FieldValue, to: (fields[field] ?? null) as FieldValue }))
    .filter(c => c.from !== c.to);
}

function unavailableReason(vehicle: Vehicle | undefined): string | null {
  if (!vehicle) return 'Vehicle not found for this dealership.';
  if (vehicle.soldAt) return 'Vehicle is sold; relist it before editing.';
  if (vehicle.removedAt) return 'Vehicle is removed; relist it before editing.';
  return null;
}

async function loadVehicles(db: PrismaClient, dealershipId: string, ids: string[]): Promise<Map<string, Vehicle>> {
  const rows = await db.vehicle.findMany({ where: { dealershipId, id: { in: ids } } });
  return new Map(rows.map(v => [v.id, v]));
}

/** Shows exactly what would change for each vehicle. Writes nothing. */
export async function previewBulkEdit(db: PrismaClient, dealershipId: string, request: BulkEditRequest): Promise<BulkEditPreview> {
  const vehicles = await loadVehicles(db, dealershipId, request.edits.map(e => e.vehicleId));
  const rows = request.edits.map((edit): BulkEditRow => {
    const vehicle = vehicles.get(edit.vehicleId);
    const base = { vehicleId: edit.vehicleId, stockNumber: vehicle?.stockNumber ?? null, label: vehicle ? label(vehicle) : null,
      incidentId: null, updatedAt: vehicle?.updatedAt.toISOString() ?? null };
    const blocked = unavailableReason(vehicle);
    if (blocked) return { ...base, status: 'REJECTED', changes: [], reason: blocked };
    const changes = diff(vehicle!, edit.fields);
    return changes.length
      ? { ...base, status: 'WILL_CHANGE', changes, reason: null }
      : { ...base, status: 'NO_CHANGE', changes, reason: 'Already has these values.' };
  });
  return { rows, counts: count(rows) };
}

function dataFor(changes: FieldChange[], vehicle: Vehicle, now: Date): Prisma.VehicleUpdateInput {
  const data: Record<string, unknown> = Object.fromEntries(changes.map(c => [c.field, c.to]));
  if ('priceCents' in data) {
    data['priceLastChangedAt'] = now;
    if (vehicle.originalPriceCents === null) data['originalPriceCents'] = vehicle.priceCents;
  }
  return data as Prisma.VehicleUpdateInput;
}

async function writeChange(
  db: PrismaClient, dealershipId: string, vehicle: Vehicle, changes: FieldChange[], marker: Record<string, string>,
): Promise<void> {
  const now = new Date();
  await withInventoryTransaction(db, dealershipId, async tx => {
    const price = changes.find(c => c.field === 'priceCents');
    if (price) await guardInventoryMutation(tx, dealershipId, vehicle.id, { priceCents: price.to as number });
    await tx.vehicle.update({ where: { id: vehicle.id }, data: dataFor(changes, vehicle, now) });
    await tx.vehicleUpdate.create({ data: {
      vehicleId: vehicle.id, dealershipId,
      kind: price ? 'PRICE_CHANGE' : 'DETAILS_CHANGE',
      previousValue: Object.fromEntries(changes.map(c => [c.field, c.from])) as Prisma.InputJsonValue,
      newValue: { ...Object.fromEntries(changes.map(c => [c.field, c.to])), ...marker } as Prisma.InputJsonValue,
    } });
  });
}

function failure(err: unknown): Pick<BulkEditRow, 'status' | 'reason' | 'incidentId'> {
  if (err instanceof InventorySafetyHold) {
    return { status: 'HELD', reason: err.message, incidentId: err.incidentId };
  }
  return { status: 'FAILED', reason: (err instanceof Error ? err.message : 'Update failed').slice(0, 255), incidentId: null };
}

/**
 * Applies each edit in its own guarded transaction, so one held or failed vehicle never blocks
 * the rest. Vehicles changed since the preview (expectedUpdatedAt) are reported as CONFLICT.
 */
export async function applyBulkEdit(
  db: PrismaClient, dealershipId: string, request: BulkEditRequest, actor: Actor,
): Promise<BulkEditResult> {
  const batchId = `bulk_${randomUUID()}`;
  const vehicles = await loadVehicles(db, dealershipId, request.edits.map(e => e.vehicleId));
  const rows: BulkEditRow[] = [];
  for (const edit of request.edits) {
    const vehicle = vehicles.get(edit.vehicleId);
    const base = { vehicleId: edit.vehicleId, stockNumber: vehicle?.stockNumber ?? null, label: vehicle ? label(vehicle) : null };
    const blocked = unavailableReason(vehicle);
    if (blocked) { rows.push({ ...base, status: 'REJECTED', changes: [], reason: blocked, incidentId: null, updatedAt: null }); continue; }
    const changes = diff(vehicle!, edit.fields);
    if (edit.expectedUpdatedAt && vehicle!.updatedAt.toISOString() !== new Date(edit.expectedUpdatedAt).toISOString()) {
      rows.push({ ...base, status: 'CONFLICT', changes, reason: 'Vehicle changed after the preview; review it again.', incidentId: null, updatedAt: vehicle!.updatedAt.toISOString() });
      continue;
    }
    if (!changes.length) { rows.push({ ...base, status: 'NO_CHANGE', changes, reason: 'Already has these values.', incidentId: null, updatedAt: vehicle!.updatedAt.toISOString() }); continue; }
    try {
      await writeChange(db, dealershipId, vehicle!, changes, { bulkEditBatchId: batchId });
      rows.push({ ...base, status: 'APPLIED', changes, reason: null, incidentId: null, updatedAt: null });
    } catch (err) {
      rows.push({ ...base, changes, updatedAt: vehicle!.updatedAt.toISOString(), ...failure(err) });
    }
  }

  const applied = rows.filter(r => r.status === 'APPLIED').length;
  const counts = count(rows);
  if (applied > 0) {
    await db.adminAuditLog.create({ data: {
      action: 'INVENTORY_BULK_EDIT', actorId: actor.id, actorEmail: actor.email ?? actor.id,
      detail: { dealershipId, batchId, counts, vehicleIds: rows.filter(r => r.status === 'APPLIED').map(r => r.vehicleId) },
    } });
    const { scheduleAutoReconcile } = await import('../publishing/autoReconcileService.js');
    scheduleAutoReconcile(dealershipId, { full: true });
  }
  return { batchId: applied > 0 ? batchId : null, rows, counts, undoAvailable: applied > 0 };
}

export class BulkEditUndoError extends Error {
  constructor(readonly statusCode: 404 | 409, message: string) { super(message); }
}

/**
 * Restores the values a batch replaced, vehicle by vehicle. A vehicle is skipped when it was
 * sold, removed or edited again since the batch, so undo never overwrites newer work.
 */
export async function undoBulkEdit(db: PrismaClient, dealershipId: string, batchId: string, actor: Actor): Promise<BulkUndoResult> {
  const records = await db.vehicleUpdate.findMany({
    where: { dealershipId, newValue: { path: '$.bulkEditBatchId', equals: batchId } },
  });
  if (records.length === 0) throw new BulkEditUndoError(404, 'Bulk edit not found for this dealership.');
  const already = await db.vehicleUpdate.findFirst({
    where: { dealershipId, newValue: { path: '$.bulkEditUndoOf', equals: batchId } },
    select: { id: true },
  });
  if (already) throw new BulkEditUndoError(409, 'This bulk edit was already undone.');

  const vehicles = await loadVehicles(db, dealershipId, records.map(r => r.vehicleId));
  const rows: BulkUndoRow[] = [];
  for (const record of records) {
    const vehicle = vehicles.get(record.vehicleId);
    const applied = record.newValue as Record<string, FieldValue>;
    const previous = record.previousValue as Record<string, FieldValue>;
    const fields = Object.keys(previous) as FieldKey[];
    const changes = fields.map(field => ({ field, from: applied[field] ?? null, to: previous[field] ?? null }));
    const base = { vehicleId: record.vehicleId, stockNumber: vehicle?.stockNumber ?? null, changes, incidentId: null };
    const blocked = unavailableReason(vehicle);
    if (blocked) { rows.push({ ...base, status: 'SKIPPED', reason: blocked }); continue; }
    const editedSince = fields.some(f => (vehicle![f] ?? null) !== (applied[f] ?? null));
    if (editedSince) { rows.push({ ...base, status: 'SKIPPED', reason: 'Edited again after the bulk edit; newer values were kept.' }); continue; }
    try {
      await writeChange(db, dealershipId, vehicle!, changes, { bulkEditUndoOf: batchId });
      rows.push({ ...base, status: 'RESTORED', reason: null });
    } catch (err) {
      const f = failure(err);
      rows.push({ ...base, status: f.status === 'HELD' ? 'HELD' : 'FAILED', reason: f.reason, incidentId: f.incidentId });
    }
  }

  const restored = rows.filter(r => r.status === 'RESTORED').length;
  if (restored > 0) {
    await db.adminAuditLog.create({ data: {
      action: 'INVENTORY_BULK_EDIT_UNDO', actorId: actor.id, actorEmail: actor.email ?? actor.id,
      detail: { dealershipId, batchId, counts: count(rows) },
    } });
    const { scheduleAutoReconcile } = await import('../publishing/autoReconcileService.js');
    scheduleAutoReconcile(dealershipId, { full: true });
  }
  return {
    batchId, rows, counts: count(rows),
    // Undo is a new edit in StarterGrid; it cannot recall what a channel already displayed.
    note: 'Restored values are saved in StarterGrid and reach channels on their next update.',
  };
}
