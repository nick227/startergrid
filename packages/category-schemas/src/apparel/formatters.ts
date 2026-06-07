import type { CategoryFormatters } from '../types.js';

function asString(v: unknown): string | null {
  return typeof v === 'string' && v.length > 0 ? v : null;
}
function asNumber(v: unknown): number | null {
  return typeof v === 'number' && Number.isFinite(v) ? v : null;
}

export const apparelFormatters: CategoryFormatters = {
  assetLead(record) {
    const brand = asString(record['make']);
    const style = asString(record['model']);
    const size  = asString(record['trim']);
    const parts = [brand, style, size].filter((p): p is string => p !== null);
    return parts.join(' · ') || asString(record['stockNumber']) || 'Unknown item';
  },
  assetMeta(record) {
    const parts: string[] = [];
    const sku  = asString(record['stockNumber']);
    if (sku) parts.push(`SKU ${sku}`);
    const condition = asString(record['condition']);
    if (condition) parts.push(condition);
    const color = asString(record['exteriorColor']);
    if (color) parts.push(color);
    const price = asNumber(record['priceCents']);
    if (price !== null) parts.push(`$${(price / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    return parts.join(' · ') || '—';
  },
};
