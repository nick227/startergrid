import type { VehicleIssue, VehiclePerformanceItem } from '../../lib/types.ts';

type Props = {
  issues: VehicleIssue[];
  perf?: VehiclePerformanceItem | null;
};

export function VehicleRowExpand({ issues, perf }: Props) {
  const hasComparableData = (perf?.comparableCount ?? 0) >= 3 && perf?.avgComparableDays != null;

  return (
    <div className="space-y-1.5">
      {issues.map((iss, i) => (
        <div
          key={i}
          className={`text-xs py-0.5 ${iss.severity === 'FAIL' ? 'text-red-600' : 'text-amber-600'}`}
        >
          {iss.severity === 'FAIL' ? '✕' : '⚠'} {iss.message}
        </div>
      ))}

      {perf && (
        <div className={`text-xs text-slate-500 pt-1 ${issues.length > 0 ? 'mt-1.5 border-t border-slate-100' : ''}`}>
          <span className="font-medium text-slate-600">Movement signal · </span>
          {perf.daysOnline}d online
          {hasComparableData ? (
            <>
              {' · '}avg comparable {Math.round(perf.avgComparableDays!)}d
              {' · '}{perf.comparableCount} comparable vehicle{perf.comparableCount !== 1 ? 's' : ''}
            </>
          ) : (
            <span className="text-slate-400"> · Not enough comparable data</span>
          )}
          {Object.keys(perf.platformAssists).length > 0 && (
            <div className="mt-0.5 text-slate-400">
              Observed assists:{' '}
              {Object.entries(perf.platformAssists)
                .map(([slug, d]) => `${slug} (${d.leads} lead${d.leads !== 1 ? 's' : ''})`)
                .join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
