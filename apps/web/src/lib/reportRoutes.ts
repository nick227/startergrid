import { splitOperatorHash } from './rowNavScope.ts';
import type { ReportFamily, ReportRangePreset, ReportSlug } from './reportsCatalog.ts';
import { findReport } from './reportsCatalog.ts';

export function reportHubHash(dealerId: string): string {
  return `#/${dealerId}/reports`;
}

export function reportDetailHash(
  dealerId: string,
  family: ReportFamily,
  slug: ReportSlug,
  range?: ReportRangePreset,
): string {
  const base = `#/${dealerId}/reports/${family}/${slug}`;
  if (!range || range === 'now') return base;
  return `${base}?range=${range}`;
}

export function parseReportRoute(hash: string): {
  family: ReportFamily | null;
  slug: string | null;
  range: ReportRangePreset;
} {
  const { path, query } = splitOperatorHash(hash);
  const match = path.match(/^\/[^/]+\/reports(?:\/(inventory|platform)\/([\w-]+))?$/);
  if (!match) return { family: null, slug: null, range: 'now' };
  const family = (match[1] as ReportFamily | undefined) ?? null;
  const slug = match[2] ?? null;
  const def = findReport(slug);
  const range = parseReportRangeFromQuery(query, def?.defaultRange ?? 'now');
  return { family, slug, range };
}

function parseReportRangeFromQuery(query: string, fallback: ReportRangePreset): ReportRangePreset {
  const params = new URLSearchParams(query);
  const raw = params.get('range');
  if (raw === '7d' || raw === '30d' || raw === '90d' || raw === 'now') return raw;
  return fallback;
}

/** Merge report range into hash navigation while preserving asset scope query params. */
export function reportHashWithRange(baseHash: string, range: ReportRangePreset): string {
  const { path, query } = splitOperatorHash(baseHash);
  const params = new URLSearchParams(query);
  if (range === 'now') params.delete('range');
  else params.set('range', range);
  const qs = params.toString();
  return qs ? `#${path}?${qs}` : `#${path}`;
}
