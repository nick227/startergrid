import type { SnapshotRemovedCandidate } from './lifecycleEventService.js';

export type IngressSnapshotReview = {
  snapshotMode: boolean;
  snapshotDryRun: boolean;
  snapshotRemovalsApplied: number;
  candidates: SnapshotRemovedCandidate[];
  pendingCount: number;
};

export function parseIngressSnapshotReview(summaryJson: unknown): IngressSnapshotReview | null {
  if (!summaryJson || typeof summaryJson !== 'object') return null;
  const summary = summaryJson as Record<string, unknown>;
  if (summary.snapshotMode !== true) return null;

  const raw = summary.snapshotRemovedCandidates;
  const candidates: SnapshotRemovedCandidate[] = Array.isArray(raw)
    ? raw.filter(
        (item): item is SnapshotRemovedCandidate =>
          item != null &&
          typeof item === 'object' &&
          typeof (item as SnapshotRemovedCandidate).stockNumber === 'string' &&
          typeof (item as SnapshotRemovedCandidate).vehicleId === 'string' &&
          (item as SnapshotRemovedCandidate).reason === 'missing_from_feed',
      )
    : [];

  const applied = typeof summary.snapshotRemovalsApplied === 'number' ? summary.snapshotRemovalsApplied : 0;
  const dryRun = summary.snapshotDryRun !== false;

  return {
    snapshotMode: true,
    snapshotDryRun: dryRun,
    snapshotRemovalsApplied: applied,
    candidates,
    pendingCount: dryRun ? candidates.length : Math.max(0, candidates.length - applied),
  };
}
