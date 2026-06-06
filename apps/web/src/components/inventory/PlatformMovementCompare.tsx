import type { PlatformPerformanceItem, VehiclePerformanceItem } from '@/lib/types.ts';
import { platformCompareRows, formatPlatformChannelHint } from '@/lib/movementBenchmark.ts';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';

type Props = {
  perf: VehiclePerformanceItem;
  platformPerfBySlug?: Map<string, PlatformPerformanceItem>;
};

export function PlatformMovementCompare({ perf, platformPerfBySlug }: Props) {
  const rows = platformCompareRows(perf, platformPerfBySlug);

  if (rows.length === 0) {
    return (
      <p className="text-[10px] text-slate-500">
        {EMPTY_STATE_COPY.noPerformancePlatforms.subtitle}
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-[10px]">
        <thead>
          <tr className="text-slate-400 uppercase tracking-wide">
            <th className="pb-1.5 pr-3 font-semibold">Platform</th>
            <th className="pb-1.5 pr-3 font-semibold">This vehicle</th>
            <th className="pb-1.5 font-semibold">Dealer observed</th>
          </tr>
        </thead>
        <tbody className="text-slate-600">
          {rows.map(row => {
            const platform = platformPerfBySlug?.get(row.slug);
            return (
              <tr key={row.slug} className="border-t border-slate-100">
                <td className="py-1.5 pr-3 font-medium text-slate-700">{row.slug}</td>
                <td className="py-1.5 pr-3 tabular-nums">
                  {row.vehicleLeads > 0
                    ? `${row.vehicleLeads} observed assist${row.vehicleLeads !== 1 ? 's' : ''}`
                    : '—'}
                </td>
                <td className="py-1.5 text-slate-500">
                  {(() => {
                    const channelHint = platform ? formatPlatformChannelHint(platform) : null;
                    if (channelHint) return channelHint;
                    if (platform?.avgDaysToMove != null) {
                      return (
                        <>
                          Avg move {Math.round(platform.avgDaysToMove)}d
                          {platform.medianDaysToMove != null && (
                            <> · median {Math.round(platform.medianDaysToMove)}d</>
                          )}
                          {platform.observedAssistLabel && <> · {platform.observedAssistLabel}</>}
                        </>
                      );
                    }
                    if (platform?.observedAssistLabel) return platform.observedAssistLabel;
                    return '—';
                  })()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[10px] text-slate-400 mt-2">Observed assist only — not causal attribution.</p>
    </div>
  );
}
