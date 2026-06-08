import type { CategoryFormatters } from '../types.js';
import { watchesCopy } from './copy.en.js';

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

export const watchesFormatters: CategoryFormatters = {
  assetLead(record) {
    const year = asNumber(record['year']);
    const brand = asString(record['make']);
    const model = asString(record['model']);
    const ymm = [year, brand, model].filter((p): p is string | number => p !== null).join(' ');
    const stock = asString(record['stockNumber']);
    if (ymm && stock) return `${ymm} · ${watchesCopy.refColumn}${stock}`;
    return ymm || (stock ? `${watchesCopy.refColumn}${stock}` : null) || 'Unknown watch';
  },
  assetMeta(record) {
    const parts: string[] = [];
    const p = payload(record);
    const movement = asString(p?.['movement']);
    if (movement) parts.push(movement);
    const caseSize = asNumber(p?.['caseSizeMm']);
    if (caseSize !== null) parts.push(`${caseSize}mm`);
    const condition = asString(record['condition']);
    if (condition) parts.push(condition);
    const price = asNumber(record['priceCents']);
    if (price !== null) parts.push(`$${(price / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    return parts.join(' · ') || '—';
  },
};
