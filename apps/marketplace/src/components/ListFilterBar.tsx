import type { ListFilters } from '../lib/api.ts';

type Props = {
  make: string;
  model: string;
  condition: ListFilters['condition'];
  onMakeChange: (value: string) => void;
  onModelChange: (value: string) => void;
  onConditionChange: (value: ListFilters['condition']) => void;
  onSubmit: () => void;
  onClear: () => void;
  hasActiveFilters: boolean;
};

const inputClass =
  'w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20';

export function ListFilterBar({
  make,
  model,
  condition,
  onMakeChange,
  onModelChange,
  onConditionChange,
  onSubmit,
  onClear,
  hasActiveFilters,
}: Props) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <form
        onSubmit={e => { e.preventDefault(); onSubmit(); }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_auto_auto_auto]"
      >
        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Make</span>
          <input
            type="text"
            value={make}
            onChange={e => onMakeChange(e.target.value)}
            placeholder="Any make"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Model</span>
          <input
            type="text"
            value={model}
            onChange={e => onModelChange(e.target.value)}
            placeholder="Any model"
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Condition</span>
          <select
            value={condition ?? ''}
            onChange={e => onConditionChange((e.target.value as ListFilters['condition']) || undefined)}
            className={inputClass}
          >
            <option value="">Any condition</option>
            <option value="NEW">New</option>
            <option value="USED">Used</option>
            <option value="CPO">Certified pre-owned</option>
          </select>
        </label>

        <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-2">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
          >
            Search
          </button>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            >
              Clear filters
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
