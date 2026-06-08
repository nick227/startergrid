import type { CategoryFormatters } from '../types.js';
import { collectiblesCopy } from './copy.en.js';

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

export const collectiblesFormatters: CategoryFormatters = {
  assetLead(record) {
    const franchise = asString(record['make']);
    const item = asString(record['model']);
    const grade = asString(record['trim']);
    const parts = [franchise, item, grade].filter((p): p is string => p !== null);
    const listing = asString(record['stockNumber']);
    if (parts.length && listing) return `${parts.join(' · ')} · ${collectiblesCopy.refColumn}${listing}`;
    return parts.join(' · ') || (listing ? `${collectiblesCopy.refColumn}${listing}` : null) || 'Unknown item';
  },
  assetMeta(record) {
    const parts: string[] = [];
    const p = payload(record);
    const grade = asString(p?.['grade']) ?? asString(record['trim']);
    if (grade) parts.push(grade);
    const category = asString(p?.['category']);
    if (category) parts.push(category);
    const price = asNumber(record['priceCents']);
    if (price !== null) parts.push(`$${(price / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`);
    return parts.join(' · ') || '—';
  },
};
