import type { LifecycleScope } from '@/lib/types.ts';
import { LIFECYCLE_SCOPE_LABELS } from '@/lib/lifecycleDisplay.ts';

type Props = {
  active: LifecycleScope;
  counts: { active: number; sold: number; removed: number };
  onSelect: (scope: LifecycleScope) => void;
};

const SCOPES: LifecycleScope[] = ['active', 'sold', 'removed', 'all'];

export function LifecycleFilterBar({ active, counts, onSelect }: Props) {
  const countFor = (scope: LifecycleScope): number => {
    if (scope === 'all') return counts.active + counts.sold + counts.removed;
    return counts[scope];
  };

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lifecycle</p>
      <div className="flex flex-wrap gap-2">
        {SCOPES.map(scope => {
          const selected = active === scope;
          const n = countFor(scope);
          return (
            <button
              key={scope}
              type="button"
              onClick={() => onSelect(scope)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                selected
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}
            >
              {LIFECYCLE_SCOPE_LABELS[scope]}
              <span className={`ml-1.5 tabular-nums ${selected ? 'text-slate-300' : 'text-slate-400'}`}>
                {n}
              </span>
            </button>
          );
        })}
      </div>
      {active === 'removed' && (
        <p className="text-[11px] text-amber-700">
          Removed means missing from an authoritative feed or manually marked — not sold.
        </p>
      )}
    </div>
  );
}
