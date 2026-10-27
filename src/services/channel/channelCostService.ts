// Dealer-reported monthly cost per channel. No row means the cost is unknown; a null amount
// means that component was not reported; 0 means reported as zero.

import type { PrismaClient } from '@prisma/client';
import { platformProfiles } from '../../data/platformProfiles.js';

export type ChannelCostInput = {
  platformSlug: string;
  month: string; // YYYY-MM
  flatFeeCents: number | null;
  adSpendCents: number | null;
  notes: string | null;
};

export type ChannelCostRow = {
  platformSlug: string;
  month: string;
  flatFeeCents: number | null;
  adSpendCents: number | null;
  // Sum of the reported components; null when neither was reported.
  reportedCostCents: number | null;
  currency: string;
  sourceConfidence: string;
  notes: string | null;
  updatedAt: string;
};

export class ChannelCostError extends Error {}

const KNOWN_CHANNELS = new Set(platformProfiles.map(p => p.slug));
const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function getCurrentYearMonth(d: Date = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function isValidMonth(month: unknown): month is string {
  return typeof month === 'string' && MONTH_RE.test(month);
}

export function normalizeMonth(month?: unknown): string {
  if (typeof month === 'string' && isValidMonth(month)) {
    return month;
  }
  return getCurrentYearMonth();
}

export function monthRange(month: string): { start: Date; end: Date } {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return { start: new Date(Date.UTC(y, m - 1, 1)), end: new Date(Date.UTC(y, m, 1)) };
}

export function reportedCost(flatFeeCents: number | null, adSpendCents: number | null): number | null {
  if (flatFeeCents === null && adSpendCents === null) return null;
  return (flatFeeCents ?? 0) + (adSpendCents ?? 0);
}

function amount(v: unknown, field: string): number | null {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0) throw new ChannelCostError(`${field} must be a non-negative integer or null`);
  return v;
}

export function validateChannelCost(body: unknown): ChannelCostInput {
  if (!body || typeof body !== 'object') throw new ChannelCostError('Request body must be an object');
  const b = body as Record<string, unknown>;
  if (typeof b['platformSlug'] !== 'string' || !KNOWN_CHANNELS.has(b['platformSlug'])) throw new ChannelCostError('platformSlug must be a known channel');
  if (!isValidMonth(b['month'])) throw new ChannelCostError('month must be YYYY-MM');
  const notes = b['notes'];
  if (notes !== undefined && notes !== null && (typeof notes !== 'string' || notes.length > 1000)) throw new ChannelCostError('notes must be text up to 1000 characters');
  return {
    platformSlug: b['platformSlug'],
    month: b['month'],
    flatFeeCents: amount(b['flatFeeCents'], 'flatFeeCents'),
    adSpendCents: amount(b['adSpendCents'], 'adSpendCents'),
    notes: typeof notes === 'string' && notes.trim() ? notes.trim() : null,
  };
}

function toRow(r: {
  platformSlug: string; month: string; flatFeeCents: number | null; adSpendCents: number | null;
  currency: string; sourceConfidence: string; notes: string | null; updatedAt: Date;
}): ChannelCostRow {
  return {
    platformSlug: r.platformSlug,
    month: r.month,
    flatFeeCents: r.flatFeeCents,
    adSpendCents: r.adSpendCents,
    reportedCostCents: reportedCost(r.flatFeeCents, r.adSpendCents),
    currency: r.currency,
    sourceConfidence: r.sourceConfidence,
    notes: r.notes,
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function getChannelMonthlyCosts(prisma: PrismaClient, dealershipId: string, month: string): Promise<ChannelCostRow[]> {
  const rows = await prisma.channelMonthlyCost.findMany({
    where: { dealershipId, month },
    orderBy: { platformSlug: 'asc' },
  });
  return rows.map(toRow);
}

/**
 * Records a channel's cost for a month. Clearing both amounts deletes the row, returning the
 * cost to unknown rather than storing a zero nobody reported.
 */
export async function setChannelMonthlyCost(
  prisma: PrismaClient,
  dealershipId: string,
  input: ChannelCostInput,
  recordedBy: string | null,
): Promise<ChannelCostRow | null> {
  const key = { dealershipId_platformSlug_month: { dealershipId, platformSlug: input.platformSlug, month: input.month } };
  if (input.flatFeeCents === null && input.adSpendCents === null) {
    await prisma.channelMonthlyCost.deleteMany({ where: { dealershipId, platformSlug: input.platformSlug, month: input.month } });
    return null;
  }
  const data = {
    flatFeeCents: input.flatFeeCents,
    adSpendCents: input.adSpendCents,
    notes: input.notes,
    sourceConfidence: 'MANUAL_IMPORTED' as const,
    recordedBy: recordedBy?.slice(0, 30) ?? null,
  };
  const row = await prisma.channelMonthlyCost.upsert({
    where: key,
    create: { dealershipId, platformSlug: input.platformSlug, month: input.month, ...data },
    update: data,
  });
  return toRow(row);
}
