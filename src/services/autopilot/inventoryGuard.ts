import { createHash } from 'node:crypto';
import type { Prisma, PrismaClient } from '@prisma/client';
import { autopilotEnabled, OWNED_CHANNEL, readPolicy } from './service.js';
import { removalGuard } from './policy.js';

export class InventorySafetyHold extends Error {
  readonly statusCode = 409;
  constructor(public readonly incidentId: string, message: string) { super(message); }
}

/** Runs BEFORE live inventory mutation: marketplace reads current vehicle fields,
 * therefore a downstream queue hold would be too late. */
export async function guardInventoryMutation(db: PrismaClient, dealershipId: string, vehicleId: string,
  patch: { priceCents?: number; make?: string; model?: string; year?: number }): Promise<void> {
  if (!autopilotEnabled()) return;
  const policy = await readPolicy(db, dealershipId);
  if (!policy.version) return;
  const vehicle = await db.vehicle.findFirst({ where: { id: vehicleId, dealershipId } });
  if (!vehicle) throw new Error('Vehicle not found.');
  const nextPrice = patch.priceCents ?? vehicle.priceCents;
  const invalid = !Number.isSafeInteger(nextPrice) || nextPrice < policy.safeguards.minPriceCents ||
    !(patch.make ?? vehicle.make).trim() || !(patch.model ?? vehicle.model).trim() ||
    !Number.isInteger(patch.year ?? vehicle.year) || (patch.year ?? vehicle.year) < 1886;
  const baseline = await db.distributionTarget.findFirst({ where: { dealershipId, vehicleId, channel: OWNED_CHANNEL } });
  const previous = baseline?.verifiedSnapshot as { priceCents?: number } | null;
  const referencePrice = previous?.priceCents ?? vehicle.priceCents;
  const suspicious = patch.priceCents !== undefined && referencePrice > 0 &&
    Math.abs(nextPrice - referencePrice) / referencePrice > policy.safeguards.maxPriceChangeFraction;
  if (!invalid && !suspicious) return;
  const reasonCode = invalid ? 'INVALID_INVENTORY_MUTATION' : 'PRICE_MUTATION_HELD';
  const key = createHash('sha256').update(JSON.stringify([dealershipId, vehicleId, reasonCode, patch])).digest('hex');
  const nextAction = invalid ? 'Correct the required vehicle information and retry the change.' : 'Ask an internal operator to review the proposed price before applying it.';
  const data = { dealershipId, vehicleId, channel: OWNED_CHANNEL, targetId: baseline?.id ?? null, reasonCode,
    severity: 'WARNING', businessImpact: 'The proposed inventory change was held before affecting public listings.',
    owner: invalid ? 'DEALERSHIP' : 'INTERNAL_SUPPORT', description: nextAction, nextAction, state: 'OPEN', verificationState: 'UNVERIFIED',
    technicalEvidence: { previousPriceCents: vehicle.priceCents, proposedPriceCents: nextPrice, sourceUpdatedAt: vehicle.updatedAt.toISOString() } as Prisma.InputJsonValue };
  const incident = await db.distributionIncident.upsert({ where: { key }, create: { key, ...data }, update: data });
  throw new InventorySafetyHold(incident.id, `${nextAction} Incident: ${incident.id}`);
}

/** Validate the complete source/bulk removal set before any lifecycle writes. */
export async function guardRemovalBatch(db: PrismaClient, dealershipId: string, vehicleIds: string[], batchId?: string): Promise<void> {
  if (!autopilotEnabled() || !vehicleIds.length) return;
  const policy = await readPolicy(db, dealershipId);
  if (!policy.version) return;
  const active = await db.vehicle.findMany({ where: { dealershipId, soldAt: null, removedAt: null }, select: { id: true } });
  const ids = [...new Set(vehicleIds)].filter(id => active.some(v => v.id === id)).sort();
  if (!removalGuard(ids.length, active.length, policy.safeguards)) return;
  const key = createHash('sha256').update(JSON.stringify([dealershipId, 'REMOVAL_BATCH', ids])).digest('hex');
  const existing = await db.distributionIncident.findUnique({ where: { key } });
  const ev = existing?.technicalEvidence as { approvedVehicleIds?: string[]; approvalExpiresAt?: string } | null;
  if (existing?.state === 'ACKNOWLEDGED' && ev?.approvalExpiresAt && Date.parse(ev.approvalExpiresAt) > Date.now() &&
    JSON.stringify(ev.approvedVehicleIds) === JSON.stringify(ids)) return;
  const nextAction = 'Review the full removal batch, approve it explicitly, then retry the source operation.';
  const data = { dealershipId, channel: OWNED_CHANNEL, batchId: batchId ?? null, reasonCode: 'REMOVAL_BATCH', severity: 'CRITICAL',
    businessImpact: `${ids.length} of ${active.length} available vehicles would be withdrawn.`, owner: 'INTERNAL_SUPPORT',
    description: 'A large inventory removal was stopped before changing public availability.', nextAction, state: 'OPEN', verificationState: 'UNVERIFIED',
    technicalEvidence: { vehicleIds: ids, activeCount: active.length } as Prisma.InputJsonValue };
  const incident = await db.distributionIncident.upsert({ where: { key }, create: { key, ...data }, update: data });
  throw new InventorySafetyHold(incident.id, `${nextAction} Incident: ${incident.id}`);
}
