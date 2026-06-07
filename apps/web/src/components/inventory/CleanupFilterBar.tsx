import { cleanupFilterDefs, type CleanupFilter } from './inventoryConfig.tsx';
import { VEHICLE_READINESS_REGISTRY } from '../../lib/statusRegistry.ts';

type Props = {
  active: CleanupFilter;
  counts: Record<string, number>;
  readinessCounts: { total: number; ready: number; warning: number; blocked: number };
  onSelect: (filter: CleanupFilter) => void;
};

const READINESS_FILTERS: CleanupFilter[] = ['ALL', 'READY', 'WARNING', 'BLOCKED'];

export function CleanupFilterBar({ active, counts, readinessCounts, onSelect }: Props) {
  const issueFilters = cleanupFilterDefs();
  const readinessMeta = {
    READY: VEHICLE_READINESS_REGISTRY.READY,
    WARNING: VEHICLE_READINESS_REGISTRY.WARNING,
    BLOCKED: VEHICLE_READINESS_REGISTRY.BLOCKED,
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {READINESS_FILTERS.map(key => {
          const count =
            key === 'ALL' ? readinessCounts.total
            : readinessCounts[key.toLowerCase() as 'ready' | 'warning' | 'blocked'] ?? 0;
          const meta = key === 'READY' || key === 'WARNING' || key === 'BLOCKED'
            ? readinessMeta[key]
            : null;
          const isActive = active === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isActive
                  ? 'bg-navy-900 text-white border-navy-950 shadow-sm'
                  : 'bg-white text-ink-body border-silver-200 hover:border-silver-300'
              }`}
            >
              {meta && <span className={`w-2 h-2 rounded-full ${meta.dot}`} />}
              {key === 'ALL' ? 'All' : meta?.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] ${isActive ? 'bg-white/20' : 'bg-silver-100'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {issueFilters.some(d => (counts[d.key] ?? 0) > 0) && (
        <div className="flex flex-wrap gap-2 pt-1 border-t border-silver-100">
          <span className="text-[10px] font-bold text-ink-faint uppercase tracking-widest w-full mb-1">
            Issue filters
          </span>
          {issueFilters.map(def => {
            const count = counts[def.key] ?? 0;
            if (count === 0) return null;
            const isActive = active === def.key;
            return (
              <button
                key={def.key}
                type="button"
                onClick={() => onSelect(def.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${
                  isActive
                    ? 'bg-amber-100 border-amber-300 text-amber-900'
                    : 'bg-white border-silver-200 text-ink-body hover:bg-amber-50'
                }`}
              >
                {def.label} ({count})
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
