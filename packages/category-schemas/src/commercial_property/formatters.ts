import type { CategoryFormatters } from '../types.js';
import { commercialPropertyCopy } from './copy.en.js';

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

export const commercialPropertyFormatters: CategoryFormatters = {
  assetLead(record) {
    const name = asString(record['model']);
    const type = asString(record['trim']);
    const parts = [name, type].filter((p): p is string => p !== null);
    const listing = asString(record['stockNumber']);
    if (parts.length && listing) return `${parts.join(' · ')} · ${commercialPropertyCopy.refColumn}${listing}`;
    return parts.join(' · ') || (listing ? `${commercialPropertyCopy.refColumn}${listing}` : null) || 'Unknown property';
  },
  assetMeta(record) {
    const parts: string[] = [];
    const p = payload(record);
    const propertyType = asString(p?.['propertyType']);
    if (propertyType) parts.push(propertyType);
    const sqft = asNumber(p?.['sqft']);
    if (sqft !== null) parts.push(`${sqft.toLocaleString()} sqft`);
    const capRate = asNumber(p?.['capRate']);
    if (capRate !== null) parts.push(`${capRate}% cap`);
    const price = asNumber(record['priceCents']);
    if (price !== null) parts.push(`$${(price / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    return parts.join(' · ') || '—';
  },
};
