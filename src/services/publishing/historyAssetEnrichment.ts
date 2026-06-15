import type { PrismaClient } from '@prisma/client';

type HistoryEventRow = {
  vehicleId: string | null;
  payload: unknown;
};

export type HistoryAssetFields = {
  assetTitle: string | null;
  stockNumber: string | null;
};

function stockNumberFromPayload(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const raw = record.stockNumber ?? record.stock_number ?? record.assetRef;
  return typeof raw === 'string' && raw.trim() ? raw.trim() : null;
}

function formatVehicleAssetTitle(v: {
  year: number;
  make: string;
  model: string;
  trim: string | null;
  stockNumber: string;
}): string {
  const parts = [
    v.year > 0 ? String(v.year) : null,
    v.make || null,
    v.model || null,
  ].filter((p): p is string => p !== null);
  if (parts.length === 0) return v.stockNumber;
  const base = parts.join(' ');
  return v.trim ? `${base} · ${v.trim}` : base;
}

export async function loadHistoryAssetFields(
  prisma: PrismaClient,
  dealershipId: string,
  events: HistoryEventRow[],
): Promise<Map<string, HistoryAssetFields>> {
  const vehicleIds = [...new Set(events.map(e => e.vehicleId).filter((id): id is string => Boolean(id)))];
  const vehicles = vehicleIds.length > 0
    ? await prisma.vehicle.findMany({
        where: { id: { in: vehicleIds }, dealershipId },
        select: { id: true, stockNumber: true, year: true, make: true, model: true, trim: true },
      })
    : [];

  const result = new Map<string, HistoryAssetFields>();
  for (const vehicle of vehicles) {
    result.set(vehicle.id, {
      assetTitle: formatVehicleAssetTitle(vehicle),
      stockNumber: vehicle.stockNumber,
    });
  }
  return result;
}

export function resolveHistoryAssetFields(
  event: HistoryEventRow,
  loaded: Map<string, HistoryAssetFields>,
): HistoryAssetFields {
  if (event.vehicleId) {
    const fromVehicle = loaded.get(event.vehicleId);
    if (fromVehicle) return fromVehicle;
  }

  const stockNumber = stockNumberFromPayload(event.payload);
  return {
    assetTitle: stockNumber,
    stockNumber,
  };
}
