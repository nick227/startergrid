import type {
  NextRecommendedAction,
  PublishState,
  PublishStateSummary,
} from './types.ts';
import { statusDot, statusPill, statusRing } from '../../../../packages/design-tokens/colors.ts';
import { operatorCopy } from './copy/operator.ts';

const P = statusPill;
const D = statusDot;
const R = statusRing;

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
  Active:           { label: 'Active',           tone: 'success', order: 0, pill: P.success, dot: D.success, ring: R.success },
  Ready:            { label: 'Ready',            tone: 'success', order: 1, pill: P.success, dot: D.success, ring: R.success },
  Scheduled:        { label: 'Scheduled',        tone: 'info',    order: 2, pill: P.info,    dot: D.info,    ring: R.info },
  'Needs Approval': { label: 'Needs Approval',   tone: 'warning', order: 3, pill: P.warning, dot: D.warning, ring: R.warning },
  Blocked:          { label: 'Blocked',          tone: 'danger',  order: 4, pill: P.danger,  dot: D.danger,  ring: R.danger },
  'Packet Prepared':{ label: 'Packet Prepared',  tone: 'info',    order: 5, pill: P.info,    dot: D.info,    ring: R.info },
  'Partner Required':{ label: 'Partner Required', tone: 'muted',   order: 6, pill: P.muted,   dot: D.muted,   ring: R.muted },
  Failed:           { label: 'Failed',           tone: 'danger',  order: 7, pill: P.danger,  dot: D.danger,  ring: R.danger },
};

export const PUBLISH_STATE_KEYS = Object.keys(PUBLISH_STATE_REGISTRY) as PublishState[];

export function publishStateVisual(state: string): StatusVisual {
  return PUBLISH_STATE_REGISTRY[state as PublishState] ?? {
    label: state,
    tone: 'muted',
    pill: P.muted,
    dot: D.muted,
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
  ACTIVE:             { label: 'Active',             tone: 'success', blocksPublishing: false, filterGroup: 'ACTIVE',          pill: P.success, dot: D.success },
  PENDING_REVIEW:     { label: 'Pending Review',     tone: 'info',    blocksPublishing: false, filterGroup: 'PENDING_REVIEW',  pill: P.info,    dot: D.info },
  ACCOUNT_NEEDED:     { label: 'Needs setup',        tone: 'muted',   blocksPublishing: false, filterGroup: 'NEEDS_SETUP',     pill: P.muted,   dot: D.muted },
  CREDENTIALS_NEEDED: { label: 'Needs setup',      tone: 'warning', blocksPublishing: false, filterGroup: 'NEEDS_SETUP',     pill: P.warning, dot: D.warning },
  BLOCKED:            { label: 'Blocked',            tone: 'danger',  blocksPublishing: true,  filterGroup: 'BLOCKED',         pill: P.danger,  dot: D.danger },
  SUSPENDED:          { label: 'Suspended',          tone: 'danger',  blocksPublishing: true,  filterGroup: 'BLOCKED',         pill: P.danger,  dot: D.danger },
  PARTNER_REQUIRED:   { label: 'Partner Required',   tone: 'muted',   blocksPublishing: true,  filterGroup: 'PARTNER_REQUIRED', pill: P.muted,  dot: D.muted },
};

export function accountStateVisual(state: string): AccountStateMeta {
  return ACCOUNT_STATE_REGISTRY[state as AccountStateKey] ?? {
    label: state,
    tone: 'muted',
    blocksPublishing: false,
    filterGroup: 'ALL',
    pill: P.muted,
    dot: D.muted,
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
  READY:          { label: 'Ready',          tone: 'success', pill: P.success, dot: D.success },
  SCHEDULED:      { label: 'Scheduled',      tone: 'info',    pill: P.info,    dot: D.info },
  NEEDS_APPROVAL: { label: 'Needs approval', tone: 'warning', pill: P.warning, dot: D.warning },
  HELD:           { label: 'Held',           tone: 'warning', pill: P.warning, dot: D.warning },
  BLOCKED:        { label: 'Blocked',        tone: 'danger',  pill: P.danger,  dot: D.danger },
  CLAIMED:        { label: 'Claimed',        tone: 'info',    pill: P.info,    dot: D.info },
  SENT:           { label: 'Submitted',      tone: 'success', pill: P.success, dot: D.success },
  FAILED:         { label: 'Failed',         tone: 'danger',  pill: P.danger,  dot: D.danger },
  CANCELLED:      { label: 'Cancelled',      tone: 'muted',   pill: P.muted,   dot: D.muted },
};

export function queueStatusVisual(status: string): StatusVisual {
  return QUEUE_STATUS_REGISTRY[status as QueueStatusKey] ?? {
    label: status,
    tone: 'muted',
    pill: P.muted,
    dot: D.muted,
  };
}

// ── Vehicle readiness ──────────────────────────────────────────────────────────

export type VehicleReadinessKey = 'READY' | 'WARNING' | 'BLOCKED';

export type VehicleReadinessMeta = StatusVisual & { rowBg: string; summaryKey: string };

export const VEHICLE_READINESS_REGISTRY: Record<VehicleReadinessKey, VehicleReadinessMeta> = {
  READY:   { label: 'Ready',   tone: 'success', summaryKey: 'ready',   rowBg: '',                    pill: P.success, dot: D.success },
  WARNING: { label: 'Needs review', tone: 'warning', summaryKey: 'warning', rowBg: 'bg-status-warning-bg/30', pill: P.warning, dot: D.warning },
  BLOCKED: { label: 'Blocked', tone: 'danger',  summaryKey: 'blocked', rowBg: 'bg-status-error-bg/40',   pill: P.danger,  dot: D.danger },
};

// ── Readiness color (platform) ─────────────────────────────────────────────────

export const READINESS_COLOR_REGISTRY: Record<string, StatusVisual> = {
  GREEN:  { label: 'Green',  tone: 'success', pill: P.success, dot: D.success },
  YELLOW: { label: 'Yellow', tone: 'warning', pill: P.warning, dot: D.warning },
  RED:    { label: 'Red',    tone: 'danger',  pill: P.danger,  dot: D.danger },
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
    title: 'Blocked assets need attention',
    icon: '✕',
    tone: 'danger',
    urgency: 'high',
    description: (_s, v) =>
      `${v.blocked} ${v.blocked === 1 ? operatorCopy.asset.singular : operatorCopy.asset.plural} blocked by validation errors.`,
    hint: 'Clean up inventory issues, then return to Queue to publish.',
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
  FAST:     { label: 'Fast',     tone: 'success', badgeColor: 'green', pill: P.success, dot: D.success },
  ON_TRACK: { label: 'On track', tone: 'info',    badgeColor: 'blue',  pill: P.info,    dot: D.info },
  SLOW:     { label: 'Slow',     tone: 'warning', badgeColor: 'amber', pill: P.warning, dot: D.warning },
  STALE:    { label: 'Stale',    tone: 'danger',  badgeColor: 'red',   pill: P.danger,  dot: D.danger },
  LOW_DATA: { label: 'Low data', tone: 'muted',   badgeColor: 'slate', pill: P.muted,   dot: D.muted },
};

export function movementSignalVisual(signal: string): MovementSignalMeta {
  return MOVEMENT_SIGNAL_REGISTRY[signal as MovementSignalKey] ?? MOVEMENT_SIGNAL_REGISTRY.LOW_DATA;
}

/** Lower sorts first when ordering inventory by movement signal. */
export const MOVEMENT_SIGNAL_SORT_ORDER: Record<MovementSignalKey, number> = {
  STALE: 0,
  SLOW: 1,
  ON_TRACK: 2,
  FAST: 3,
  LOW_DATA: 4,
};

// ── Intake run status ──────────────────────────────────────────────────────────

export type IngressRunStatusKey = 'COMMITTED' | 'PARTIAL' | 'FAILED' | 'RECEIVED' | 'PROCESSING';

export const INGRESS_RUN_STATUS_REGISTRY: Record<IngressRunStatusKey, StatusVisual> = {
  COMMITTED:  { label: 'Committed',  tone: 'success', pill: P.success, dot: D.success },
  PARTIAL:    { label: 'Partial',    tone: 'warning', pill: P.warning, dot: D.warning },
  FAILED:     { label: 'Failed',     tone: 'danger',  pill: P.danger,  dot: D.danger },
  RECEIVED:   { label: 'Received',   tone: 'info',    pill: P.info,    dot: D.info },
  PROCESSING: { label: 'Processing', tone: 'info',    pill: P.info,    dot: D.info },
};

export function ingressRunStatusVisual(status: string): StatusVisual {
  return INGRESS_RUN_STATUS_REGISTRY[status as IngressRunStatusKey] ?? {
    label: status,
    tone: 'muted',
    pill: P.muted,
    dot: D.muted,
  };
}

// ── Empty-state copy ───────────────────────────────────────────────────────────

export const EMPTY_STATE_COPY = operatorCopy.emptyStates;

export const TONE_SURFACE: Record<StatusTone, { bg: string; border: string; accent: string }> = {
  neutral: { bg: 'bg-surface-card', border: 'border-silver-200', accent: 'text-ink-body' },
  success: { bg: 'bg-status-success-bg/80', border: 'border-status-success-border', accent: 'text-status-success-text' },
  info:    { bg: 'bg-status-info-bg/80', border: 'border-status-info-border', accent: 'text-status-info-text' },
  warning: { bg: 'bg-status-warning-bg/80', border: 'border-status-warning-border', accent: 'text-status-warning-text' },
  danger:  { bg: 'bg-status-error-bg/80', border: 'border-status-error-border', accent: 'text-status-error-text' },
  muted:   { bg: 'bg-status-neutral-bg', border: 'border-status-neutral-border', accent: 'text-status-neutral-text' },
};
