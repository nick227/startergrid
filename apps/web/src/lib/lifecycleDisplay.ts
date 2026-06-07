import type { VehicleLifecycleState } from '@/lib/types.ts';
import { statusPill } from '../../../../packages/design-tokens/colors.ts';

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
  AVAILABLE: statusPill.success,
  SOLD: statusPill.muted,
  REMOVED: statusPill.warning,
  REACTIVATED: statusPill.info,
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
