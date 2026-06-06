import type { VehicleIssue, VehiclePerformanceItem, PlatformPerformanceItem } from '../../lib/types.ts';
import { MovementBenchmarkExpand } from './MovementBenchmark.tsx';

type Props = {
  issues: VehicleIssue[];
  perf?: VehiclePerformanceItem | null;
  platformPerfBySlug?: Map<string, PlatformPerformanceItem>;
};

export function VehicleRowExpand({ issues, perf, platformPerfBySlug }: Props) {
  return (
    <div className="space-y-2">
      {issues.map((iss, i) => (
        <div
          key={i}
          className={`text-xs py-0.5 ${iss.severity === 'FAIL' ? 'text-red-600' : 'text-amber-600'}`}
        >
          {iss.severity === 'FAIL' ? '✕' : '⚠'} {iss.message}
        </div>
      ))}

      {perf && (
        <div className={issues.length > 0 ? 'pt-1.5 border-t border-slate-100' : ''}>
          <MovementBenchmarkExpand perf={perf} platformPerfBySlug={platformPerfBySlug} />
        </div>
      )}
    </div>
  );
}
