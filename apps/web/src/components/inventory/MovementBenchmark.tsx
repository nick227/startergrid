import type { VehiclePerformanceItem } from '../../lib/types.ts';
import {
  movementBenchmarkParts,
  movementTaskHint,
} from '../../lib/movementBenchmark.ts';
import { MovementSignalBadge } from './inventoryConfig.tsx';

type CellProps = { perf: VehiclePerformanceItem };

/** Compact table cell: "12 days · Similar avg 19 · Fast" */
export function MovementBenchmarkCell({ perf }: CellProps) {
  const p = movementBenchmarkParts(perf);

  return (
    <span className="text-xs text-slate-600 tabular-nums leading-snug">
      {p.daysOnline} days
      {p.hasBenchmark && p.similarAvg != null && (
        <> · Similar avg {p.similarAvg}</>
      )}
      {' · '}
      <span className={`inline-flex align-middle ${p.hasBenchmark ? '' : 'opacity-80'}`}>
        <MovementSignalBadge signal={perf.movementSignal} />
      </span>
    </span>
  );
}

type ExpandProps = { perf: VehiclePerformanceItem };

/** Expanded row detail — task-oriented, not a dashboard. */
export function MovementBenchmarkExpand({ perf }: ExpandProps) {
  const p = movementBenchmarkParts(perf);
  const hint = movementTaskHint(perf);
  const assistEntries = Object.entries(perf.platformAssists);

  return (
    <div className="text-xs text-slate-600 space-y-1">
      <p>
        <span className="font-medium text-slate-700">Movement · </span>
        {p.daysOnline} days online
        {p.hasBenchmark && p.similarMedian != null && (
          <> · median {p.similarMedian}d</>
        )}
        {p.hasBenchmark && p.similarAvg != null && (
          <span className="text-slate-400"> (avg {p.similarAvg}d)</span>
        )}
        {' · '}
        <MovementSignalBadge signal={perf.movementSignal} />
      </p>
      {p.hasBenchmark ? (
        <p className="text-slate-400">
          {p.sampleSize} similar vehicle{p.sampleSize !== 1 ? 's' : ''} · {p.benchmarkLabel}
        </p>
      ) : (
        <p className="text-slate-400">{p.benchmarkLabel}</p>
      )}
      {hint && <p className="text-slate-500">{hint}</p>}
      {assistEntries.length > 0 && (
        <p className="text-slate-400">
          Observed assist:{' '}
          {assistEntries
            .map(([slug, d]) => `${slug} (${d.leads} lead${d.leads !== 1 ? 's' : ''})`)
            .join(', ')}
        </p>
      )}
    </div>
  );
}
