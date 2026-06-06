import { useState, useCallback } from 'react';
import { useQuery } from '../hooks/useQuery.ts';
import { fetchVehicles, type ListFilters } from '../lib/api.ts';
import { VehicleCard } from '../components/VehicleCard.tsx';
import { Shell, LoadingSkeleton, ErrorState, EmptyState } from '../components/Shell.tsx';

export default function VehicleListPage() {
  const [make,      setMake]      = useState('');
  const [model,     setModel]     = useState('');
  const [condition, setCondition] = useState<ListFilters['condition']>(undefined);
  const [page,      setPage]      = useState(1);

  const filters: ListFilters = {
    make:      make.trim()  || undefined,
    model:     model.trim() || undefined,
    condition,
    page,
    pageSize:  24,
  };

  const loader = useCallback(
    () => fetchVehicles(filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [make, model, condition, page]
  );
  const { data, loading, error, reload } = useQuery(loader, [make, model, condition, page]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    reload();
  }

  const vehicles = data?.vehicles ?? [];
  const total    = data?.total    ?? 0;
  const hasNext  = data?.nextPage != null;
  const hasPrev  = page > 1;

  return (
    <Shell>
      {/* Filters */}
      <form onSubmit={handleSearch} className="mb-8 flex flex-wrap gap-3 items-end">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Make</label>
          <input
            type="text"
            value={make}
            onChange={e => { setMake(e.target.value); setPage(1); }}
            placeholder="Any make"
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Model</label>
          <input
            type="text"
            value={model}
            onChange={e => { setModel(e.target.value); setPage(1); }}
            placeholder="Any model"
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-36"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-slate-500 uppercase tracking-wide">Condition</label>
          <select
            value={condition ?? ''}
            onChange={e => { setCondition((e.target.value as ListFilters['condition']) || undefined); setPage(1); }}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Any</option>
            <option value="NEW">New</option>
            <option value="USED">Used</option>
            <option value="CPO">Certified</option>
          </select>
        </div>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Search
        </button>
        {(make || model || condition) && (
          <button
            type="button"
            onClick={() => { setMake(''); setModel(''); setCondition(undefined); setPage(1); }}
            className="px-4 py-2 text-sm text-slate-500 hover:text-slate-700 transition-colors"
          >
            Clear
          </button>
        )}
      </form>

      {/* Results */}
      {loading && !data ? (
        <LoadingSkeleton label="Loading vehicles…" />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : vehicles.length === 0 ? (
        <EmptyState label="No vehicles match your search." />
      ) : (
        <>
          <p className="text-sm text-slate-500 mb-4">
            {total.toLocaleString()} vehicle{total !== 1 ? 's' : ''} available
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vehicles.map(card => (
              <VehicleCard key={card.listingId} card={card} />
            ))}
          </div>

          {/* Pagination */}
          {(hasPrev || hasNext) && (
            <div className="flex items-center justify-center gap-4 mt-10">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={!hasPrev}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← Previous
              </button>
              <span className="text-sm text-slate-500">Page {page}</span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={!hasNext}
                className="px-4 py-2 text-sm rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </Shell>
  );
}
