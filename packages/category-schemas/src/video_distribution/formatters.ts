import type { CategoryFormatters } from '../types.js';

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}
function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export const videoFormatters: CategoryFormatters = {
  assetLead(record) {
    const creator = asString(record['make']);
    const title   = asString(record['model']);
    const parts   = [creator, title].filter((p): p is string => p !== null);
    return parts.join(' — ') || asString(record['stockNumber']) || 'Unknown video';
  },
  assetMeta(record) {
    const parts: string[] = [];
    const videoId = asString(record['stockNumber']);
    if (videoId) parts.push(videoId);
    const year = asNumber(record['year']);
    if (year !== null && year > 0) parts.push(String(year));
    const price = asNumber(record['priceCents']);
    if (price !== null && price > 0) parts.push(`$${(price / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    return parts.join(' · ') || '—';
  },
};
