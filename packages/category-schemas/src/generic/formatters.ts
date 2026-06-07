import type { CategoryFormatters } from '../types.js';
import { genericAsset } from './copy.en.js';

function asString(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

export const genericFormatters: CategoryFormatters = {
  assetLead(record) {
    const title = asString(record['title'])
      ?? asString(record['vehicleTitle'])
      ?? asString(record['name']);
    const ref = asString(record['refId'])
      ?? asString(record['stockNumber'])
      ?? asString(record['sku']);
    if (title && ref) return `${title} · ${genericAsset.refLabel}${ref}`;
    if (title) return title;
    if (ref) return `${genericAsset.refLabel}${ref}`;
    return `Unknown ${genericAsset.singular}`;
  },
  assetMeta(record) {
    const parts: string[] = [];
    const price = record['priceCents'];
    if (typeof price === 'number') {
      parts.push(`$${(price / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    }
    const status = asString(record['lifecycleState']) ?? asString(record['readiness']);
    if (status) parts.push(status);
    return parts.join(' · ') || '—';
  },
};
