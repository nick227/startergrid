// Dealer-recorded sale details for a vehicle already marked sold through the inventory lifecycle.
// Every field is optional and stays null until someone records it: no field is derived from
// the asking price, the status-change time or lead activity.

import type { PrismaClient } from '@prisma/client';
import { platformProfiles } from '../../data/platformProfiles.js';

export type SaleDetailsInput = {
  transactionDate?: string | null; // YYYY-MM-DD
  salePriceCents?: number | null;
  confirmedChannelSlug?: string | null;
};

export type SaleDetails = {
  vehicleId: string;
  transactionDate: string | null;
  salePriceCents: number | null;
  confirmedChannelSlug: string | null;
  sourceConfidence: string;
  updatedAt: string;
};

export class SaleDetailsError extends Error {
  constructor(message: string, readonly status: 400 | 404 | 409) { super(message); }
}

const KNOWN_CHANNELS = new Set(platformProfiles.map(p => p.slug));

export function validateSaleDetails(body: unknown, now: Date = new Date()): SaleDetailsInput {
  if (!body || typeof body !== 'object') throw new SaleDetailsError('Request body must be an object', 400);
  const b = body as Record<string, unknown>;
  const out: SaleDetailsInput = {};

  if ('transactionDate' in b) {
    const v = b['transactionDate'];
    if (v === null || v === '') out.transactionDate = null;
    else if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v) || Number.isNaN(Date.parse(`${v}T00:00:00Z`)))
      throw new SaleDetailsError('transactionDate must be a YYYY-MM-DD date or null', 400);
    else if (new Date(`${v}T00:00:00Z`).getTime() > now.getTime())
      throw new SaleDetailsError('transactionDate cannot be in the future', 400);
    else out.transactionDate = v;
  }
  if ('salePriceCents' in b) {
    const v = b['salePriceCents'];
    if (v === null) out.salePriceCents = null;
    else if (typeof v !== 'number' || !Number.isInteger(v) || v <= 0)
      throw new SaleDetailsError('salePriceCents must be a positive integer or null', 400);
    else out.salePriceCents = v;
  }
  if ('confirmedChannelSlug' in b) {
    const v = b['confirmedChannelSlug'];
    if (v === null || v === '') out.confirmedChannelSlug = null;
    else if (typeof v !== 'string' || !KNOWN_CHANNELS.has(v))
      throw new SaleDetailsError('confirmedChannelSlug must be a known channel or null', 400);
    else out.confirmedChannelSlug = v;
  }
  return out;
}

function toSaleDetails(row: {
  vehicleId: string; transactionDate: Date | null; salePriceCents: number | null;
  confirmedChannelSlug: string | null; sourceConfidence: string; updatedAt: Date;
}): SaleDetails {
  return {
    vehicleId: row.vehicleId,
    transactionDate: row.transactionDate ? row.transactionDate.toISOString().slice(0, 10) : null,
    salePriceCents: row.salePriceCents,
    confirmedChannelSlug: row.confirmedChannelSlug,
    sourceConfidence: row.sourceConfidence,
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Records (or corrects) sale details. Fields absent from the input are left as they are. */
export async function recordSaleDetails(
  prisma: PrismaClient,
  dealershipId: string,
  vehicleId: string,
  input: SaleDetailsInput,
  recordedBy: string | null,
): Promise<SaleDetails> {
  const vehicle = await prisma.vehicle.findFirst({ where: { id: vehicleId, dealershipId }, select: { id: true, soldAt: true } });
  if (!vehicle) throw new SaleDetailsError('Vehicle not found', 404);
  if (!vehicle.soldAt) throw new SaleDetailsError('Mark the vehicle sold before recording sale details', 409);

  const data = {
    ...(input.transactionDate !== undefined
      ? { transactionDate: input.transactionDate ? new Date(`${input.transactionDate}T00:00:00Z`) : null } : {}),
    ...(input.salePriceCents !== undefined ? { salePriceCents: input.salePriceCents } : {}),
    ...(input.confirmedChannelSlug !== undefined ? { confirmedChannelSlug: input.confirmedChannelSlug } : {}),
    sourceConfidence: 'MANUAL_IMPORTED' as const,
    recordedBy: recordedBy?.slice(0, 30) ?? null,
  };
  const row = await prisma.vehicleSaleRecord.upsert({
    where: { vehicleId },
    create: { dealershipId, vehicleId, ...data },
    update: data,
  });
  return toSaleDetails(row);
}

export async function getSaleDetails(prisma: PrismaClient, dealershipId: string, vehicleId: string): Promise<SaleDetails | null> {
  const row = await prisma.vehicleSaleRecord.findFirst({ where: { vehicleId, dealershipId } });
  return row ? toSaleDetails(row) : null;
}
