import type { VehiclePerformanceItem } from '../../lib/types.ts';
import type { PlatformPerformanceItem } from '../../lib/types.ts';
import {
  COMPARABLE_GROUP_RULE,
  formatMovementBenchmarkLine,
  formatPlatformExpandLine,
  hasSimilarBenchmark,
  movementBenchmarkParts,
  movementTaskHint,
} from '../../lib/movementBenchmark.ts';
import { Badge } from '../ui/Badge.tsx';
import type { MovementSignal } from '../../lib/types.ts';
import { movementSignalVisual } from '../../lib/statusRegistry.ts';

type CellProps = { perf: VehiclePerformanceItem };

/** Compact table cell: "12 days · Similar avg 19 · Fast" */
export function MovementBenchmarkCell({ perf }: CellProps) {
  const p = movementBenchmarkParts(perf);

  if (!hasSimilarBenchmark(perf)) {
    return (
      <span className="text-xs text-ink-muted tabular-nums leading-snug">
        {p.daysOnline} days · Not enough comparable data
      </span>
    );
  }

  return (
    <span className="text-xs text-ink-body tabular-nums leading-snug">
      {p.daysOnline} days · Similar avg {p.similarAvg} ·{' '}
      <span className="inline-flex align-middle">
        <MovementSignalBadge signal={perf.movementSignal} />
      </span>
    </span>
  );
}

// ── Movement signal badge ─────────────────────────────────────────────────────

export function MovementSignalBadge({ signal }: { signal: MovementSignal | string }) {
  const meta = movementSignalVisual(signal);
  return <Badge color={meta.badgeColor}>{meta.label}</Badge>;
}

type ExpandProps = {
  perf: VehiclePerformanceItem;
  platformPerfBySlug?: Map<string, PlatformPerformanceItem>;
};

/** Expanded row detail — task-oriented, not a dashboard. */
export function MovementBenchmarkExpand({ perf, platformPerfBySlug }: ExpandProps) {
  const p = movementBenchmarkParts(perf);
  const hint = movementTaskHint(perf);
  const assistEntries = Object.entries(perf.platformAssists);

  return (
    <div className="text-xs text-ink-body space-y-1.5">
      <p>
        <span className="font-medium text-ink-body">Movement signal · </span>
        {formatMovementBenchmarkLine(perf)}
      </p>

      <p className="text-ink-faint">{COMPARABLE_GROUP_RULE}</p>

      {p.hasBenchmark ? (
        <p className="text-ink-muted">
          {p.sampleSize} similar sold vehicle{p.sampleSize !== 1 ? 's' : ''}
          {p.similarAvg != null && <> · similar average {p.similarAvg} days</>}
          {p.similarMedian != null && <> · median {p.similarMedian} days</>}
        </p>
      ) : (
        <p className="text-ink-muted">Not enough comparable data for a benchmark yet.</p>
      )}

      {hint && <p className="text-ink-muted">{hint}</p>}

      {assistEntries.length > 0 && (
        <div className="text-ink-muted space-y-0.5 pt-0.5">
          <p className="font-medium text-ink-body">Observed assist (not attribution)</p>
          {assistEntries.map(([slug, d]) => (
            <p key={slug} className="text-ink-faint pl-2">
              {formatPlatformExpandLine(slug, d.leads, platformPerfBySlug?.get(slug))}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
