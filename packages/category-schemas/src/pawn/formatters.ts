import type { CategoryFormatters } from '../types.js';

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}
function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export const pawnFormatters: CategoryFormatters = {
  assetLead(record) {
    const brand = asString(record['make']);
    const desc  = asString(record['model']);
    const parts = [brand, desc].filter((p): p is string => p !== null);
    return parts.join(' · ') || asString(record['stockNumber']) || 'Unknown item';
  },
  assetMeta(record) {
    const parts: string[] = [];
    const ticket = asString(record['stockNumber']);
    if (ticket) parts.push(`Ticket #${ticket}`);
    const condition = asString(record['condition']);
    if (condition) parts.push(condition);
    const price = asNumber(record['priceCents']);
    if (price !== null) parts.push(`$${(price / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    return parts.join(' · ') || '—';
  },
};
