import type { CategoryFormatters } from '../types.js';
import { vacationRentalsCopy } from './copy.en.js';

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

export const vacationRentalsFormatters: CategoryFormatters = {
  assetLead(record) {
    const property = asString(record['model']);
    const location = asString(record['trim']);
    const parts = [property, location].filter((p): p is string => p !== null);
    const listing = asString(record['stockNumber']);
    if (parts.length && listing) return `${parts.join(' · ')} · ${vacationRentalsCopy.refColumn}${listing}`;
    return parts.join(' · ') || (listing ? `${vacationRentalsCopy.refColumn}${listing}` : null) || 'Unknown rental';
  },
  assetMeta(record) {
    const parts: string[] = [];
    const p = payload(record);
    const bedrooms = asNumber(p?.['bedrooms']);
    if (bedrooms !== null) parts.push(`${bedrooms} BR`);
    const sleeps = asNumber(p?.['sleeps']);
    if (sleeps !== null) parts.push(`Sleeps ${sleeps}`);
    const nightly = asNumber(p?.['nightlyRateCents']) ?? asNumber(record['priceCents']);
    if (nightly !== null) parts.push(`$${(nightly / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}/night`);
    return parts.join(' · ') || '—';
  },
};
