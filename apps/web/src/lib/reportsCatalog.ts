/** Report catalog — ids, tiers, defaults. See docs/plans/2026-06-06-operator-reports-catalog-design.md */

export type ReportFamily = 'inventory' | 'platform';
export type ReportTier = 'action' | 'management';
export type ReportRangePreset = 'now' | '7d' | '30d' | '90d';
export type ReportPhase = 1 | 2 | 3;

export type ReportSlug =
  | 'movement'
  | 'readiness'
  | 'demand'
  | 'lifecycle'
  | 'merchandising'
  | 'throughput'
  | 'exposure'
  | 'engagement'
  | 'sync-summary'
  | 'velocity';

export type ReportDefinition = {
  slug: ReportSlug;
  family: ReportFamily;
  tier: ReportTier;
  phase: ReportPhase;
  defaultRange: ReportRangePreset;
  snapshotOnly: boolean;
  copyKey: keyof typeof REPORT_COPY_KEYS;
};

const REPORT_COPY_KEYS = {
  movement: true,
  readiness: true,
  demand: true,
  lifecycle: true,
  merchandising: true,
  throughput: true,
  exposure: true,
  engagement: true,
  syncSummary: true,
  velocity: true,
} as const;

export const REPORTS_CATALOG: ReportDefinition[] = [
  { slug: 'movement', family: 'inventory', tier: 'action', phase: 1, defaultRange: 'now', snapshotOnly: true, copyKey: 'movement' },
  { slug: 'readiness', family: 'inventory', tier: 'action', phase: 1, defaultRange: 'now', snapshotOnly: true, copyKey: 'readiness' },
  { slug: 'throughput', family: 'platform', tier: 'action', phase: 2, defaultRange: '7d', snapshotOnly: false, copyKey: 'throughput' },
  { slug: 'demand', family: 'inventory', tier: 'action', phase: 2, defaultRange: '7d', snapshotOnly: false, copyKey: 'demand' },
  { slug: 'exposure', family: 'platform', tier: 'management', phase: 1, defaultRange: 'now', snapshotOnly: true, copyKey: 'exposure' },
  { slug: 'engagement', family: 'platform', tier: 'management', phase: 1, defaultRange: '30d', snapshotOnly: true, copyKey: 'engagement' },
  { slug: 'sync-summary', family: 'platform', tier: 'management', phase: 2, defaultRange: '30d', snapshotOnly: false, copyKey: 'syncSummary' },
  { slug: 'lifecycle', family: 'inventory', tier: 'management', phase: 3, defaultRange: '30d', snapshotOnly: false, copyKey: 'lifecycle' },
  { slug: 'merchandising', family: 'inventory', tier: 'management', phase: 3, defaultRange: '30d', snapshotOnly: false, copyKey: 'merchandising' },
  { slug: 'velocity', family: 'platform', tier: 'management', phase: 3, defaultRange: '90d', snapshotOnly: false, copyKey: 'velocity' },
];

export const ACTION_REPORTS = REPORTS_CATALOG.filter(r => r.tier === 'action');
export const MANAGEMENT_REPORTS = REPORTS_CATALOG.filter(r => r.tier === 'management');

export function findReport(slug: string | null): ReportDefinition | undefined {
  if (!slug) return undefined;
  return REPORTS_CATALOG.find(r => r.slug === slug);
}

export function isReportSlug(value: string): value is ReportSlug {
  return REPORTS_CATALOG.some(r => r.slug === value);
}

export function parseReportRange(query: string): ReportRangePreset {
  const params = new URLSearchParams(query.startsWith('?') ? query.slice(1) : query);
  const raw = params.get('range');
  if (raw === '7d' || raw === '30d' || raw === '90d' || raw === 'now') return raw;
  return 'now';
}
