import type {
  NextRecommendedAction,
  PublishState,
  PublishStateSummary,
} from './types.ts';

export type StatusTone = 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'muted';

export type StatusVisual = {
  label: string;
  tone: StatusTone;
  pill: string;
  dot: string;
  ring?: string;
};

// ── Publish states (8) ───────────────────────────────────────────────────────

export const PUBLISH_STATE_REGISTRY: Record<PublishState, StatusVisual & { order: number }> = {
  Active:           { label: 'Active',           tone: 'success', order: 0, pill: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', ring: 'ring-emerald-100' },
  Ready:            { label: 'Ready',            tone: 'success', order: 1, pill: 'bg-green-50 text-green-800 border-green-200',     dot: 'bg-green-500',   ring: 'ring-green-100' },
  Scheduled:        { label: 'Scheduled',        tone: 'info',    order: 2, pill: 'bg-sky-50 text-sky-800 border-sky-200',           dot: 'bg-sky-500',     ring: 'ring-sky-100' },
  'Needs Approval': { label: 'Needs Approval',   tone: 'warning', order: 3, pill: 'bg-amber-50 text-amber-900 border-amber-200',    dot: 'bg-amber-500',   ring: 'ring-amber-100' },
  Blocked:          { label: 'Blocked',          tone: 'danger',  order: 4, pill: 'bg-red-50 text-red-800 border-red-200',         dot: 'bg-red-500',     ring: 'ring-red-100' },
  'Packet Prepared':{ label: 'Packet Prepared',  tone: 'info',    order: 5, pill: 'bg-indigo-50 text-indigo-800 border-indigo-200', dot: 'bg-indigo-500',  ring: 'ring-indigo-100' },
  'Partner Required':{ label: 'Partner Required', tone: 'muted',   order: 6, pill: 'bg-slate-100 text-slate-600 border-slate-200',   dot: 'bg-slate-400',   ring: 'ring-slate-100' },
  Failed:           { label: 'Failed',           tone: 'danger',  order: 7, pill: 'bg-rose-50 text-rose-800 border-rose-200',       dot: 'bg-rose-600',    ring: 'ring-rose-100' },
};

export const PUBLISH_STATE_KEYS = Object.keys(PUBLISH_STATE_REGISTRY) as PublishState[];

export function publishStateVisual(state: string): StatusVisual {
  return PUBLISH_STATE_REGISTRY[state as PublishState] ?? {
    label: state,
    tone: 'muted',
    pill: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  };
}

// ── Account states ───────────────────────────────────────────────────────────

export type AccountStateKey =
  | 'ACCOUNT_NEEDED'
  | 'CREDENTIALS_NEEDED'
  | 'PENDING_REVIEW'
  | 'ACTIVE'
  | 'BLOCKED'
  | 'PARTNER_REQUIRED'
  | 'SUSPENDED';

export type AccountStateMeta = StatusVisual & {
  blocksPublishing: boolean;
  filterGroup: 'ALL' | 'ACTIVE' | 'NEEDS_SETUP' | 'PENDING_REVIEW' | 'BLOCKED' | 'PARTNER_REQUIRED';
};

export const ACCOUNT_STATE_REGISTRY: Record<AccountStateKey, AccountStateMeta> = {
  ACTIVE:             { label: 'Active',             tone: 'success', blocksPublishing: false, filterGroup: 'ACTIVE',          pill: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  PENDING_REVIEW:     { label: 'Pending Review',     tone: 'info',    blocksPublishing: false, filterGroup: 'PENDING_REVIEW',  pill: 'bg-sky-50 text-sky-800 border-sky-200',           dot: 'bg-sky-500' },
  ACCOUNT_NEEDED:     { label: 'Needs setup',        tone: 'muted',   blocksPublishing: false, filterGroup: 'NEEDS_SETUP',     pill: 'bg-slate-100 text-slate-700 border-slate-200',    dot: 'bg-slate-400' },
  CREDENTIALS_NEEDED: { label: 'Needs setup',      tone: 'warning', blocksPublishing: false, filterGroup: 'NEEDS_SETUP',     pill: 'bg-amber-50 text-amber-900 border-amber-200',     dot: 'bg-amber-500' },
  BLOCKED:            { label: 'Blocked',            tone: 'danger',  blocksPublishing: true,  filterGroup: 'BLOCKED',         pill: 'bg-red-50 text-red-800 border-red-200',           dot: 'bg-red-500' },
  SUSPENDED:          { label: 'Suspended',          tone: 'danger',  blocksPublishing: true,  filterGroup: 'BLOCKED',         pill: 'bg-red-50 text-red-800 border-red-200',           dot: 'bg-red-500' },
  PARTNER_REQUIRED:   { label: 'Partner Required',   tone: 'muted',   blocksPublishing: true,  filterGroup: 'PARTNER_REQUIRED', pill: 'bg-slate-100 text-slate-600 border-slate-200',   dot: 'bg-slate-400' },
};

export function accountStateVisual(state: string): AccountStateMeta {
  return ACCOUNT_STATE_REGISTRY[state as AccountStateKey] ?? {
    label: state,
    tone: 'muted',
    blocksPublishing: false,
    filterGroup: 'ALL',
    pill: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  };
}

export const ACCOUNT_FILTER_CHIPS: Array<{ key: AccountStateMeta['filterGroup']; label: string; tone: StatusTone }> = [
  { key: 'ALL', label: 'All', tone: 'neutral' },
  { key: 'ACTIVE', label: 'Active', tone: 'success' },
  { key: 'NEEDS_SETUP', label: 'Needs setup', tone: 'warning' },
  { key: 'PENDING_REVIEW', label: 'Pending review', tone: 'info' },
  { key: 'BLOCKED', label: 'Blocked', tone: 'danger' },
  { key: 'PARTNER_REQUIRED', label: 'Partner required', tone: 'muted' },
];

// ── Queue statuses ─────────────────────────────────────────────────────────────

export type QueueStatusKey =
  | 'READY'
  | 'SCHEDULED'
  | 'NEEDS_APPROVAL'
  | 'HELD'
  | 'BLOCKED'
  | 'CLAIMED'
  | 'SENT'
  | 'FAILED'
  | 'CANCELLED';

export const QUEUE_STATUS_REGISTRY: Record<QueueStatusKey, StatusVisual> = {
  READY:          { label: 'Ready',          tone: 'success', pill: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  SCHEDULED:      { label: 'Scheduled',      tone: 'info',    pill: 'bg-sky-50 text-sky-800 border-sky-200',           dot: 'bg-sky-500' },
  NEEDS_APPROVAL: { label: 'Needs approval', tone: 'warning', pill: 'bg-amber-50 text-amber-900 border-amber-200',     dot: 'bg-amber-500' },
  HELD:           { label: 'Held',           tone: 'warning', pill: 'bg-amber-50 text-amber-900 border-amber-200',     dot: 'bg-amber-600' },
  BLOCKED:        { label: 'Blocked',        tone: 'danger',  pill: 'bg-red-50 text-red-800 border-red-200',           dot: 'bg-red-500' },
  CLAIMED:        { label: 'Claimed',        tone: 'info',    pill: 'bg-violet-50 text-violet-800 border-violet-200',  dot: 'bg-violet-500' },
  SENT:           { label: 'Submitted',      tone: 'success', pill: 'bg-green-50 text-green-800 border-green-200',     dot: 'bg-green-500' },
  FAILED:         { label: 'Failed',         tone: 'danger',  pill: 'bg-rose-50 text-rose-800 border-rose-200',       dot: 'bg-rose-600' },
  CANCELLED:      { label: 'Cancelled',      tone: 'muted',   pill: 'bg-slate-100 text-slate-500 border-slate-200',    dot: 'bg-slate-300' },
};

export function queueStatusVisual(status: string): StatusVisual {
  return QUEUE_STATUS_REGISTRY[status as QueueStatusKey] ?? {
    label: status,
    tone: 'muted',
    pill: 'bg-slate-100 text-slate-600 border-slate-200',
    dot: 'bg-slate-400',
  };
}

// ── Vehicle readiness ──────────────────────────────────────────────────────────

export type VehicleReadinessKey = 'READY' | 'WARNING' | 'BLOCKED';

export type VehicleReadinessMeta = StatusVisual & { rowBg: string; summaryKey: string };

export const VEHICLE_READINESS_REGISTRY: Record<VehicleReadinessKey, VehicleReadinessMeta> = {
  READY:   { label: 'Ready',   tone: 'success', summaryKey: 'ready',   rowBg: '',              pill: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  WARNING: { label: 'Needs review', tone: 'warning', summaryKey: 'warning', rowBg: 'bg-amber-50/30', pill: 'bg-amber-50 text-amber-900 border-amber-200', dot: 'bg-amber-500' },
  BLOCKED: { label: 'Blocked', tone: 'danger',  summaryKey: 'blocked', rowBg: 'bg-red-50/40',   pill: 'bg-red-50 text-red-800 border-red-200',         dot: 'bg-red-500' },
};

// ── Readiness color (platform) ─────────────────────────────────────────────────

export const READINESS_COLOR_REGISTRY: Record<string, StatusVisual> = {
  GREEN:  { label: 'Green',  tone: 'success', pill: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  YELLOW: { label: 'Yellow', tone: 'warning', pill: 'bg-amber-100 text-amber-800',   dot: 'bg-amber-500' },
  RED:    { label: 'Red',    tone: 'danger',  pill: 'bg-red-100 text-red-800',       dot: 'bg-red-500' },
};

// ── Next recommended action ────────────────────────────────────────────────────

export type NextActionMeta = {
  title: string;
  icon: string;
  tone: StatusTone;
  urgency: 'low' | 'medium' | 'high';
  description: (s: PublishStateSummary, v: { blocked: number }) => string;
  hint: string | null;
  inventoryLink?: boolean;
  accountsLink?: boolean;
};

export const NEXT_ACTION_REGISTRY: Record<NextRecommendedAction, NextActionMeta> = {
  no_action: {
    title: 'All platforms up to date',
    icon: '✓',
    tone: 'success',
    urgency: 'low',
    description: (s) => `${s.Active} platform${s.Active !== 1 ? 's' : ''} active. No operator action required.`,
    hint: null,
  },
  run_scheduler: {
    title: 'Ready to send updates',
    icon: '→',
    tone: 'info',
    urgency: 'low',
    description: (s) => {
      const n = s.Scheduled + s.Ready;
      return `${n} platform${n !== 1 ? 's' : ''} scheduled to receive inventory.`;
    },
    hint: 'Open Sync to send updates when you are ready.',
  },
  review_approvals: {
    title: 'Your approval required',
    icon: '!',
    tone: 'warning',
    urgency: 'medium',
    description: (s) => `${s['Needs Approval']} platform${s['Needs Approval'] !== 1 ? 's' : ''} waiting for your OK before updates go out.`,
    hint: 'Review pending platforms on the Accounts tab.',
  },
  fix_blocked_vehicles: {
    title: 'Blocked vehicles need attention',
    icon: '✕',
    tone: 'danger',
    urgency: 'high',
    description: (_s, v) => `${v.blocked} vehicle${v.blocked !== 1 ? 's' : ''} blocked by validation errors.`,
    hint: 'Clean up inventory issues, then return here to prepare.',
    inventoryLink: true,
  },
  resolve_partner_requirement: {
    title: 'Partner agreement required',
    icon: '○',
    tone: 'muted',
    urgency: 'low',
    description: (s) => `${s['Partner Required']} platform${s['Partner Required'] !== 1 ? 's' : ''} need a commercial agreement.`,
    hint: 'Coordinate with platform reps or your account manager.',
    accountsLink: true,
  },
  resolve_account_requirement: {
    title: 'Platform accounts need attention',
    icon: '!',
    tone: 'warning',
    urgency: 'medium',
    description: (s) => `${s.Blocked} platform${s.Blocked !== 1 ? 's' : ''} blocked until account setup is finished.`,
    hint: 'Open Accounts and fix anything marked Blocked or Needs setup.',
    accountsLink: true,
  },
};

// ── Movement signals ───────────────────────────────────────────────────────────

export type MovementSignalKey = 'FAST' | 'ON_TRACK' | 'SLOW' | 'STALE' | 'LOW_DATA';

export type MovementSignalMeta = StatusVisual & { badgeColor: 'green' | 'blue' | 'amber' | 'red' | 'slate' };

export const MOVEMENT_SIGNAL_REGISTRY: Record<MovementSignalKey, MovementSignalMeta> = {
  FAST:     { label: 'Fast',     tone: 'success', badgeColor: 'green', pill: 'bg-emerald-50 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500' },
  ON_TRACK: { label: 'On track', tone: 'info',    badgeColor: 'blue',  pill: 'bg-sky-50 text-sky-800 border-sky-200',           dot: 'bg-sky-500' },
  SLOW:     { label: 'Slow',     tone: 'warning', badgeColor: 'amber', pill: 'bg-amber-50 text-amber-900 border-amber-200',     dot: 'bg-amber-500' },
  STALE:    { label: 'Stale',    tone: 'danger',  badgeColor: 'red',   pill: 'bg-red-50 text-red-800 border-red-200',           dot: 'bg-red-500' },
  LOW_DATA: { label: 'Low data', tone: 'muted',   badgeColor: 'slate', pill: 'bg-slate-100 text-slate-600 border-slate-200',    dot: 'bg-slate-400' },
};

export function movementSignalVisual(signal: string): MovementSignalMeta {
  return MOVEMENT_SIGNAL_REGISTRY[signal as MovementSignalKey] ?? MOVEMENT_SIGNAL_REGISTRY.LOW_DATA;
}

// ── Intake run status ──────────────────────────────────────────────────────────

export type IngressRunStatusKey = 'COMMITTED' | 'PARTIAL' | 'FAILED' | 'RECEIVED' | 'PROCESSING';

export const INGRESS_RUN_STATUS_REGISTRY: Record<IngressRunStatusKey, StatusVisual> = {
  COMMITTED:  { label: 'Committed',  tone: 'success', pill: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500' },
  PARTIAL:    { label: 'Partial',    tone: 'warning', pill: 'bg-amber-100 text-amber-800',     dot: 'bg-amber-500' },
  FAILED:     { label: 'Failed',     tone: 'danger',  pill: 'bg-red-100 text-red-700',         dot: 'bg-red-500' },
  RECEIVED:   { label: 'Received',   tone: 'info',    pill: 'bg-sky-100 text-sky-800',         dot: 'bg-sky-500' },
  PROCESSING: { label: 'Processing', tone: 'info',    pill: 'bg-sky-100 text-sky-800',         dot: 'bg-sky-500' },
};

export function ingressRunStatusVisual(status: string): StatusVisual {
  return INGRESS_RUN_STATUS_REGISTRY[status as IngressRunStatusKey] ?? {
    label: status,
    tone: 'muted',
    pill: 'bg-slate-100 text-slate-600',
    dot: 'bg-slate-400',
  };
}

// ── Empty-state copy ───────────────────────────────────────────────────────────

export const EMPTY_STATE_COPY = {
  noInventory: {
    title: 'No inventory yet',
    subtitle: 'Import a CSV to add vehicles. Once they pass checks, platforms can receive updates.',
  },
  noInventoryFilter: {
    title: 'No vehicles match this filter',
    subtitle: 'Clear filters or import more stock.',
  },
  noIntakeSources: {
    title: 'No intake sources yet',
    subtitle: 'Import a CSV above, or add an API feed to pull inventory automatically.',
  },
  noIntakeRuns: {
    title: 'No intake runs yet',
    subtitle: 'Import a CSV to bring in your first batch of vehicles.',
  },
  noImportHistory: {
    title: 'No import history yet',
    subtitle: 'Your recent CSV imports will appear here.',
  },
  noPerformanceData: {
    title: 'No performance data yet',
    subtitle: 'Refresh movement benchmarks on Sync when you want days-online comparisons vs similar stock.',
  },
  noPerformanceVehicles: {
    title: 'No vehicle movement data',
    subtitle: 'Add active inventory and refresh performance on the Sync tab.',
  },
  noPerformancePlatforms: {
    title: 'No platform impact yet',
    subtitle: 'Platforms show observed assists after inventory has been submitted and leads come in.',
  },
  noAccountBlockers: {
    title: 'No account blockers',
    subtitle: 'Every platform account is clear — Sync can reach all destinations.',
  },
  noAccounts: {
    title: 'No platform accounts yet',
    subtitle: 'Accounts appear after you prepare inventory for publishing.',
  },
  noAccountMatches: {
    title: 'No matches',
    subtitle: 'Try another filter or search term.',
  },
  noSyncActivity: {
    title: 'No sync activity yet',
    subtitle: 'Once inventory is ready, updates to platforms will show up here.',
  },
} as const;

export const TONE_SURFACE: Record<StatusTone, { bg: string; border: string; accent: string }> = {
  neutral: { bg: 'bg-white', border: 'border-slate-200', accent: 'text-slate-700' },
  success: { bg: 'bg-emerald-50/80', border: 'border-emerald-200', accent: 'text-emerald-900' },
  info:    { bg: 'bg-sky-50/80', border: 'border-sky-200', accent: 'text-sky-900' },
  warning: { bg: 'bg-amber-50/80', border: 'border-amber-200', accent: 'text-amber-950' },
  danger:  { bg: 'bg-red-50/80', border: 'border-red-200', accent: 'text-red-900' },
  muted:   { bg: 'bg-slate-50', border: 'border-slate-200', accent: 'text-slate-600' },
};
