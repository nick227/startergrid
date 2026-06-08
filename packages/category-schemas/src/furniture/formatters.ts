import type { CategoryFormatters } from '../types.js';

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

export const furnitureFormatters: CategoryFormatters = {
  assetLead(record) {
    const brand = asString(record['make']);
    const piece = asString(record['model']);
    const parts = [brand, piece].filter((p): p is string => p !== null);
    return parts.join(' · ') || asString(record['stockNumber']) || 'Unknown piece';
  },
  assetMeta(record) {
    const parts: string[] = [];
    const sku = asString(record['stockNumber']);
    if (sku) parts.push(`SKU ${sku}`);
    const p = payload(record);
    const material = asString(p?.['material']);
    if (material) parts.push(material);
    const finish = asString(record['exteriorColor']);
    if (finish) parts.push(finish);
    const price = asNumber(record['priceCents']);
    if (price !== null) parts.push(`$${(price / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    return parts.join(' · ') || '—';
  },
};
