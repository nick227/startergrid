import { Prisma, type PrismaClient } from '@prisma/client';
import { InventorySafetyHold } from './inventoryGuard.js';

const scopes = new WeakSet<object>();
export const removalPermits = new WeakMap<object, Set<string>>();
export const inventoryTransactionActive = (db: object) => scopes.has(db);
export function needsInventoryTransaction(db: PrismaClient): boolean {
  return process.env['V5_AUTOPILOT_ENABLED'] === 'true' && !scopes.has(db);
}

/** All guarded source writes share the worker's policy/vehicle lock order.
 * A hold rolls back source changes; its incident is restored outside that rollback. */
export async function withInventoryTransaction<T>(
  db: PrismaClient, dealershipId: string, work: (tx: PrismaClient) => Promise<T>,
): Promise<T> {
  if (!needsInventoryTransaction(db)) return work(db);
  let originalVehicles = new Map<string, { updatedAt: Date; priceCents: number }>();
  try {
    return await db.$transaction(async tx => {
      const client = tx as PrismaClient;
      scopes.add(client);
      try {
        await tx.$queryRaw`SELECT dealershipId FROM AutopilotPolicy WHERE dealershipId = ${dealershipId} FOR UPDATE`;
        const rows = await tx.$queryRaw<Array<{ id: string; updatedAt: Date; priceCents: number }>>`SELECT id, updatedAt, priceCents FROM Vehicle WHERE dealershipId = ${dealershipId} FOR UPDATE`;
        originalVehicles = new Map(rows.map(row => [row.id, row]));
        return await work(client);
      } finally { scopes.delete(client); removalPermits.delete(client); }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, timeout: 30_000, maxWait: 10_000 });
  } catch(error) {
    if (error instanceof InventorySafetyHold && error.incidentData) {
      const { id, ...data } = error.incidentData;
      const original = data.vehicleId ? originalVehicles.get(data.vehicleId) : undefined;
      if (original && data.reasonCode === 'PRICE_MUTATION_HELD') data.technicalEvidence = {
        ...(data.technicalEvidence as Prisma.InputJsonObject), sourceUpdatedAt: original.updatedAt.toISOString(), previousPriceCents: original.priceCents,
      };
      await db.distributionIncident.upsert({ where: { key: data.key }, create: { id, ...data }, update: data });
    }
    throw error;
  }
}
