import type { CategoryFormatters } from '../types.js';

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}
function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export const ebooksFormatters: CategoryFormatters = {
  assetLead(record) {
    const author = asString(record['make']);
    const title  = asString(record['model']);
    const parts  = [author, title].filter((p): p is string => p !== null);
    return parts.join(' — ') || asString(record['stockNumber']) || 'Unknown ebook';
  },
  assetMeta(record) {
    const parts: string[] = [];
    const asin = asString(record['stockNumber']);
    if (asin) parts.push(`ASIN ${asin}`);
    const isbn = asString(record['vin']);
    if (isbn) parts.push(`ISBN ${isbn}`);
    const edition = asString(record['trim']);
    if (edition) parts.push(edition);
    const price = asNumber(record['priceCents']);
    if (price !== null) parts.push(`$${(price / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`);
    return parts.join(' · ') || '—';
  },
};
