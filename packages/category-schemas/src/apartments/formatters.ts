import type { CategoryFormatters } from '../types.js';
import { apartmentsCopy } from './copy.en.js';

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

export const apartmentsFormatters: CategoryFormatters = {
  assetLead(record) {
    const property = asString(record['model']);
    const layout = asString(record['trim']);
    const parts = [property, layout].filter((p): p is string => p !== null);
    const unit = asString(record['stockNumber']);
    if (parts.length && unit) return `${parts.join(' · ')} · ${apartmentsCopy.refColumn}${unit}`;
    return parts.join(' · ') || (unit ? `${apartmentsCopy.refColumn}${unit}` : null) || 'Unknown unit';
  },
  assetMeta(record) {
    const parts: string[] = [];
    const p = payload(record);
    const beds = asNumber(p?.['beds']);
    const baths = asNumber(p?.['baths']);
    if (beds !== null && baths !== null) parts.push(`${beds} bed / ${baths} bath`);
    const sqft = asNumber(p?.['sqft']);
    if (sqft !== null) parts.push(`${sqft.toLocaleString()} sqft`);
    const rent = asNumber(record['priceCents']);
    if (rent !== null) parts.push(`$${(rent / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}/mo`);
    return parts.join(' · ') || '—';
  },
};
