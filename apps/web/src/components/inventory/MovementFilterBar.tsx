import type { MovementFilter } from '@/lib/inventoryVehicleOps.ts';
import { movementFilterLabel } from '@/lib/inventoryVehicleOps.ts';
import type { MovementSignal } from '@/lib/types.ts';
import { movementSignalVisual } from '@/lib/statusRegistry.ts';

const SIGNAL_FILTERS: MovementSignal[] = ['STALE', 'SLOW', 'ON_TRACK', 'FAST', 'LOW_DATA'];

type Props = {
  active: MovementFilter;
  counts: Record<MovementFilter, number>;
  onSelect: (filter: MovementFilter) => void;
  benchmarksUpdating?: boolean;
};

export function MovementFilterBar({ active, counts, onSelect, benchmarksUpdating }: Props) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold text-ink-faint uppercase tracking-widest mr-1">
          Movement
        </span>
        <button
          type="button"
          onClick={() => onSelect('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${
            active === 'ALL'
              ? 'bg-navy-900 text-white border-navy-950'
              : 'bg-white text-ink-body border-silver-200 hover:border-silver-300'
          }`}
        >
          {movementFilterLabel('ALL')} ({counts.ALL})
        </button>
        {SIGNAL_FILTERS.map(signal => {
          const count = counts[signal] ?? 0;
          if (count === 0 && active !== signal) return null;
          const meta = movementSignalVisual(signal);
          const isActive = active === signal;
          return (
            <button
              key={signal}
              type="button"
              onClick={() => onSelect(signal)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                isActive
                  ? 'bg-navy-900 text-white border-navy-950'
                  : 'bg-white text-ink-body border-silver-200 hover:border-silver-300'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
              {meta.label} ({count})
            </button>
          );
        })}
      </div>
      {benchmarksUpdating && (
        <p className="text-[10px] text-amber-700">Benchmarks updating after sync — filters may shift briefly.</p>
      )}
    </div>
  );
}
