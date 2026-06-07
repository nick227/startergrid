import type { CategoryFormatters } from '../types.js';
import { automotiveCopy } from './copy.en.js';

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export const automotiveFormatters: CategoryFormatters = {
  assetLead(record) {
    const year = asNumber(record['year']);
    const make = asString(record['make']);
    const model = asString(record['model']);
    const ymm = [year, make, model].filter((part) => part !== null && part !== '').join(' ');
    const stock = asString(record['stockNumber']);
    if (ymm && stock) return `${ymm} · ${automotiveCopy.refColumn}${stock}`;
    if (ymm) return ymm;
    if (stock) return `${automotiveCopy.refColumn}${stock}`;
    return 'Unknown vehicle';
  },
  assetMeta(record) {
    const parts: string[] = [];
    const mileage = asNumber(record['mileage']);
    if (mileage !== null) parts.push(`${mileage.toLocaleString()} mi`);
    const price = asNumber(record['priceCents']);
    if (price !== null) {
      parts.push(`$${(price / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    }
    const readiness = asString(record['readiness']);
    if (readiness) parts.push(readiness);
    return parts.join(' · ') || '—';
  },
};
