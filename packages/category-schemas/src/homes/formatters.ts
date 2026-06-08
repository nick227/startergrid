import type { CategoryFormatters } from '../types.js';
import { homesCopy } from './copy.en.js';

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

export const homesFormatters: CategoryFormatters = {
  assetLead(record) {
    const year = asNumber(record['year']);
    const name = asString(record['model']);
    const layout = asString(record['trim']);
    const parts = [year, name, layout].filter((p): p is string | number => p !== null).join(' ');
    const listing = asString(record['stockNumber']);
    if (parts && listing) return `${parts} · ${homesCopy.refColumn}${listing}`;
    return parts || (listing ? `${homesCopy.refColumn}${listing}` : null) || 'Unknown home';
  },
  assetMeta(record) {
    const parts: string[] = [];
    const p = payload(record);
    const beds = asNumber(p?.['beds']);
    const baths = asNumber(p?.['baths']);
    if (beds !== null && baths !== null) parts.push(`${beds} bed / ${baths} bath`);
    const sqft = asNumber(p?.['sqft']);
    if (sqft !== null) parts.push(`${sqft.toLocaleString()} sqft`);
    const acres = asNumber(p?.['lotAcres']);
    if (acres !== null) parts.push(`${acres} ac`);
    const price = asNumber(record['priceCents']);
    if (price !== null) parts.push(`$${(price / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    return parts.join(' · ') || '—';
  },
};
