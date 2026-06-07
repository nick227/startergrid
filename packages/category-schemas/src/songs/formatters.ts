import type { CategoryFormatters } from '../types.js';

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}
function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export const songsFormatters: CategoryFormatters = {
  assetLead(record) {
    const artist = asString(record['make']);
    const title  = asString(record['model']);
    const parts  = [artist, title].filter((p): p is string => p !== null);
    return parts.join(' — ') || asString(record['stockNumber']) || 'Unknown release';
  },
  assetMeta(record) {
    const parts: string[] = [];
    const upc  = asString(record['stockNumber']);
    if (upc) parts.push(`UPC ${upc}`);
    const isrc = asString(record['vin']);
    if (isrc) parts.push(`ISRC ${isrc}`);
    const format = asString(record['trim']);
    if (format) parts.push(format);
    const year = asNumber(record['year']);
    if (year !== null && year > 0) parts.push(String(year));
    return parts.join(' · ') || '—';
  },
};
