import type { CategoryFormatters } from '../types.js';
import { heavyEquipmentCopy } from './copy.en.js';

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}
function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}
function payload(record: Record<string, unknown>): Record<string, unknown> | null {
  const p = record['categoryPayload'];
  return p && typeof p === 'object' && !Array.isArray(p) ? p as Record<string, unknown> : null;
}

function usageSuffix(record: Record<string, unknown>): string {
  const p = payload(record);
  return p?.['usageUnit'] === 'hours' ? ' hrs' : ' hrs';
}

export const heavyEquipmentFormatters: CategoryFormatters = {
  assetLead(record) {
    const year = asNumber(record['year']);
    const make = asString(record['make']);
    const model = asString(record['model']);
    const ymm = [year, make, model].filter((p): p is string | number => p !== null).join(' ');
    const stock = asString(record['stockNumber']);
    if (ymm && stock) return `${ymm} · ${heavyEquipmentCopy.refColumn}${stock}`;
    return ymm || (stock ? `${heavyEquipmentCopy.refColumn}${stock}` : null) || 'Unknown machine';
  },
  assetMeta(record) {
    const parts: string[] = [];
    const p = payload(record);
    const equipmentType = asString(p?.['equipmentType']);
    if (equipmentType) parts.push(equipmentType);
    const hours = asNumber(record['mileage']);
    if (hours !== null) parts.push(`${hours.toLocaleString()}${usageSuffix(record)}`);
    const price = asNumber(record['priceCents']);
    if (price !== null) parts.push(`$${(price / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    return parts.join(' · ') || '—';
  },
};
