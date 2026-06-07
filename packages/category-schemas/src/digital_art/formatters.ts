import type { CategoryFormatters } from '../types.js';

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}
function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export const digitalArtFormatters: CategoryFormatters = {
  assetLead(record) {
    const artist = asString(record['make']);
    const title  = asString(record['model']);
    const parts  = [artist, title].filter((p): p is string => p !== null);
    return parts.join(' — ') || asString(record['stockNumber']) || 'Unknown artwork';
  },
  assetMeta(record) {
    const parts: string[] = [];
    const assetId = asString(record['stockNumber']);
    if (assetId) parts.push(assetId);
    const edition = asString(record['vin']);
    if (edition) parts.push(`Ed. ${edition}`);
    const series = asString(record['trim']);
    if (series) parts.push(series);
    const price = asNumber(record['priceCents']);
    if (price !== null) parts.push(`$${(price / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    return parts.join(' · ') || '—';
  },
};
