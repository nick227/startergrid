import type { PrismaClient } from '@prisma/client';
import type { AdfVehicle } from './adfParser.js';

/**
 * Links an inquiry to inventory only when the identification is unambiguous within the
 * routed dealership: its unique stock number, or a VIN held by exactly one of its vehicles.
 * Year/make/model never links; a dealership can hold several identical vehicles, so those
 * become suggestions for a person to confirm.
 */

export type VehicleMatch =
  | { status: 'MATCHED'; vehicleId: string; basis: 'STOCK' | 'VIN' | 'STOCK_AND_VIN'; suggestions: [] }
  | { status: 'CONFLICT' | 'AMBIGUOUS' | 'NO_MATCH' | 'NO_IDENTIFIERS'; vehicleId: null; basis: null; reason: string; suggestions: VehicleSuggestion[] };

export type VehicleSuggestion = { vehicleId: string; basis: 'STOCK_VIN_CONFLICT' | 'VIN_AMBIGUOUS' | 'YEAR_MAKE_MODEL' };

const VIN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2, 10, 0, 9, 8, 7, 6, 5, 4, 3, 2];
const VIN_VALUES: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7, H: 8, J: 1, K: 2, L: 3, M: 4, N: 5,
  P: 7, R: 9, S: 2, T: 3, U: 4, V: 5, W: 6, X: 7, Y: 8, Z: 9,
};

/** 17 characters, no I/O/Q, and the North American check digit (position 9) agrees. */
export function isValidVin(vin: string | null): vin is string {
  if (!vin || !/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return false;
  const sum = [...vin].reduce((acc, ch, i) => acc + (/\d/.test(ch) ? Number(ch) : VIN_VALUES[ch]!) * VIN_WEIGHTS[i]!, 0);
  const check = sum % 11 === 10 ? 'X' : String(sum % 11);
  return vin[8] === check;
}

type Db = Pick<PrismaClient, 'vehicle'>;
const MAX_SUGGESTIONS = 5;

export async function matchVehicle(db: Db, dealershipId: string, v: AdfVehicle): Promise<VehicleMatch> {
  const stock = v.stock?.trim() || null;
  const vin = isValidVin(v.vin) ? v.vin : null;

  const byStock = stock
    ? await db.vehicle.findUnique({ where: { dealershipId_stockNumber: { dealershipId, stockNumber: stock } }, select: { id: true, vin: true } })
    : null;
  const byVin = vin
    ? await db.vehicle.findMany({ where: { dealershipId, vin }, select: { id: true }, take: 3 })
    : [];

  if (byStock) {
    const stockVin = byStock.vin.toUpperCase();
    if (!vin || stockVin === vin) {
      return { status: 'MATCHED', vehicleId: byStock.id, basis: vin ? 'STOCK_AND_VIN' : 'STOCK', suggestions: [] };
    }
    // Stock and VIN identify different vehicles (or the stock's vehicle has another VIN): link neither.
    const suggestions: VehicleSuggestion[] = [{ vehicleId: byStock.id, basis: 'STOCK_VIN_CONFLICT' }];
    for (const other of byVin) if (other.id !== byStock.id) suggestions.push({ vehicleId: other.id, basis: 'STOCK_VIN_CONFLICT' });
    return { status: 'CONFLICT', vehicleId: null, basis: null, reason: 'Stock number and VIN point to different vehicles.', suggestions };
  }

  if (byVin.length === 1) return { status: 'MATCHED', vehicleId: byVin[0]!.id, basis: 'VIN', suggestions: [] };
  if (byVin.length > 1) {
    return {
      status: 'AMBIGUOUS', vehicleId: null, basis: null, reason: 'VIN is held by more than one vehicle in this dealership.',
      suggestions: byVin.map(x => ({ vehicleId: x.id, basis: 'VIN_AMBIGUOUS' as const })),
    };
  }

  const suggestions = await yearMakeModelCandidates(db, dealershipId, v);
  if (!stock && !vin) {
    const reason = v.vin ? 'VIN failed validation and no stock number was supplied.' : 'No VIN or stock number supplied.';
    return { status: 'NO_IDENTIFIERS', vehicleId: null, basis: null, reason, suggestions };
  }
  return { status: 'NO_MATCH', vehicleId: null, basis: null, reason: 'No vehicle in this dealership has that stock number or VIN.', suggestions };
}

async function yearMakeModelCandidates(db: Db, dealershipId: string, v: AdfVehicle): Promise<VehicleSuggestion[]> {
  const year = v.year && /^\d{4}$/.test(v.year) ? Number(v.year) : null;
  if (!year || !v.make || !v.model) return [];
  const rows = await db.vehicle.findMany({
    // MySQL's default collation compares make/model case-insensitively.
    where: { dealershipId, year, make: v.make, model: v.model, removedAt: null, soldAt: null },
    select: { id: true },
    orderBy: { createdAt: 'desc' },
    take: MAX_SUGGESTIONS,
  });
  return rows.map(r => ({ vehicleId: r.id, basis: 'YEAR_MAKE_MODEL' as const }));
}
