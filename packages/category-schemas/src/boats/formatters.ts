import type { CategoryFormatters } from '../types.js';
import { boatsCopy } from './copy.en.js';

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function payloadRecord(record: Record<string, unknown>): Record<string, unknown> | null {
  const payload = record['categoryPayload'];
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  return payload as Record<string, unknown>;
}

function usageSuffix(record: Record<string, unknown>): string {
  const payload = payloadRecord(record);
  if (payload?.['usageUnit'] === 'hours') return ' hrs';
  return ' hrs';
}

export const boatsFormatters: CategoryFormatters = {
  assetLead(record) {
    const year = asNumber(record['year']);
    const make = asString(record['make']);
    const model = asString(record['model']);
    const ymm = [year, make, model].filter(part => part !== null && part !== '').join(' ');
    const stock = asString(record['stockNumber']);
    if (ymm && stock) return `${ymm} · ${boatsCopy.refColumn}${stock}`;
    if (ymm) return ymm;
    if (stock) return `${boatsCopy.refColumn}${stock}`;
    return 'Unknown boat';
  },
  assetMeta(record) {
    const parts: string[] = [];
    const mileage = asNumber(record['mileage']);
    if (mileage !== null) parts.push(`${mileage.toLocaleString()}${usageSuffix(record)}`);
    const payload = payloadRecord(record);
    const lengthFt = asNumber(payload?.['lengthFt']);
    if (lengthFt !== null) parts.push(`${lengthFt} ft`);
    const price = asNumber(record['priceCents']);
    if (price !== null) {
      parts.push(`$${(price / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    }
    const readiness = asString(record['readiness']);
    if (readiness) parts.push(readiness);
    return parts.join(' · ') || '—';
  },
};
