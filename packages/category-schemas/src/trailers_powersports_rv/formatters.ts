import type { CategoryFormatters } from '../types.js';
import { trailersPowersportsRvCopy } from './copy.en.js';

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function usageSuffix(record: Record<string, unknown>): string {
  const payload = record['categoryPayload'];
  if (payload && typeof payload === 'object' && !Array.isArray(payload)) {
    const unit = (payload as Record<string, unknown>)['usageUnit'];
    if (unit === 'hours') return ' hrs';
  }
  return ' mi';
}

export const trailersPowersportsRvFormatters: CategoryFormatters = {
  assetLead(record) {
    const year = asNumber(record['year']);
    const make = asString(record['make']);
    const model = asString(record['model']);
    const ymm = [year, make, model].filter(part => part !== null && part !== '').join(' ');
    const stock = asString(record['stockNumber']);
    if (ymm && stock) return `${ymm} · ${trailersPowersportsRvCopy.refColumn}${stock}`;
    if (ymm) return ymm;
    if (stock) return `${trailersPowersportsRvCopy.refColumn}${stock}`;
    return 'Unknown unit';
  },
  assetMeta(record) {
    const parts: string[] = [];
    const mileage = asNumber(record['mileage']);
    if (mileage !== null) parts.push(`${mileage.toLocaleString()}${usageSuffix(record)}`);
    const price = asNumber(record['priceCents']);
    if (price !== null) {
      parts.push(`$${(price / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    }
    const readiness = asString(record['readiness']);
    if (readiness) parts.push(readiness);
    return parts.join(' · ') || '—';
  },
};
