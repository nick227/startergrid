import type { PublishState, PublishStateSummary } from '../../lib/types.ts';
import { PUBLISH_STATE_KEYS, publishStateVisual } from '../../lib/statusRegistry.ts';

type Props = {
  summary: PublishStateSummary;
  loading?: boolean;
  highlightNonZero?: boolean;
};

export function StateSummaryCards({ summary, loading, highlightNonZero = true }: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-20 rounded-2xl bg-slate-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {PUBLISH_STATE_KEYS.map((state: PublishState) => {
        const count = summary[state] ?? 0;
        const v = publishStateVisual(state);
        const active = highlightNonZero && count > 0;
        return (
          <div
            key={state}
            className={`rounded-2xl border p-4 transition-shadow ${
              active ? `${v.pill} shadow-sm` : 'bg-slate-50/80 text-slate-400 border-slate-100'
            }`}
          >
            <div className={`text-3xl font-bold tracking-tight leading-none ${active ? '' : 'opacity-50'}`}>
              {count}
            </div>
            <div className={`text-xs mt-2 font-medium leading-tight ${active ? 'opacity-90' : ''}`}>
              {v.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
