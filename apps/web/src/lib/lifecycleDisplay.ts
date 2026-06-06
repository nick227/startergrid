import type { VehicleLifecycleState } from '@/lib/types.ts';

export type LifecycleScope = 'active' | 'sold' | 'removed' | 'all';

export type LifecycleEventSource = 'manual' | 'ingress_row' | 'feed_snapshot';

export const LIFECYCLE_SCOPE_LABELS: Record<LifecycleScope, string> = {
  active: 'Active',
  sold: 'Sold',
  removed: 'Removed',
  all: 'All',
};

export const LIFECYCLE_STATE_LABELS: Record<VehicleLifecycleState, string> = {
  AVAILABLE: 'Active',
  SOLD: 'Sold',
  REMOVED: 'Removed',
  REACTIVATED: 'Reactivated',
};

export const LIFECYCLE_STATE_PILL: Record<VehicleLifecycleState, string> = {
  AVAILABLE: 'bg-emerald-50 text-emerald-800 border-emerald-100',
  SOLD: 'bg-slate-100 text-slate-700 border-slate-200',
  REMOVED: 'bg-amber-50 text-amber-800 border-amber-100',
  REACTIVATED: 'bg-sky-50 text-sky-800 border-sky-100',
};

export const LIFECYCLE_SOURCE_LABELS: Record<LifecycleEventSource, string> = {
  manual: 'Manual update',
  ingress_row: 'Feed row status',
  feed_snapshot: 'Missing from latest feed',
};

export function formatLifecycleTransition(fromState: VehicleLifecycleState, toState: VehicleLifecycleState): string {
  return `${LIFECYCLE_STATE_LABELS[fromState]} → ${LIFECYCLE_STATE_LABELS[toState]}`;
}

export function isActiveLifecycleScope(scope: LifecycleScope): boolean {
  return scope === 'active';
}
