import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '../hooks/useQuery.ts';
import { fetchVehicles, type ListFilters } from '../lib/api.ts';
import { saveListReturn } from '../lib/listReturn.ts';
import { listHref, parseRoute, type ListQuery } from '../lib/routes.ts';
import { VehicleCard } from '../components/VehicleCard.tsx';
import { ListFilterBar } from '../components/ListFilterBar.tsx';
import { Pagination } from '../components/Pagination.tsx';
import {
  Shell,
  PageHero,
  VehicleGridSkeleton,
  ErrorState,
  EmptyState,
} from '../components/Shell.tsx';

const PAGE_SIZE = 24;

type Props = { initialQuery?: ListQuery };

export default function VehicleListPage({ initialQuery = {} }: Props) {
  const [make,      setMake]      = useState(initialQuery.make ?? '');
  const [model,     setModel]     = useState(initialQuery.model ?? '');
  const [condition, setCondition] = useState<ListFilters['condition']>(initialQuery.condition);
  const [page,      setPage]      = useState(initialQuery.page ?? 1);

  const listQuery: ListQuery = {
    make:      make.trim()  || undefined,
    model:     model.trim() || undefined,
    condition,
    page:      page > 1 ? page : undefined,
  };

  useEffect(() => {
    saveListReturn(listQuery);
    const target = listHref(listQuery);
    if (window.location.hash !== target) {
      window.location.hash = target.slice(1);
    }
  }, [make, model, condition, page]);

  useEffect(() => {
    function syncFromHash() {
      const route = parseRoute();
      if (route.page !== 'list') return;
      const q = route.query;
      setMake(q.make ?? '');
      setModel(q.model ?? '');
      setCondition(q.condition);
      setPage(q.page ?? 1);
    }
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  const filters: ListFilters = { ...listQuery, page, pageSize: PAGE_SIZE };

  const loader = useCallback(
    () => fetchVehicles(filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [make, model, condition, page]
  );
  const { data, loading, error, reload } = useQuery(loader, [make, model, condition, page]);

  function resetFilters() {
    setMake('');
    setModel('');
    setCondition(undefined);
    setPage(1);
  }

  const vehicles = data?.vehicles ?? [];
  const total    = data?.total    ?? 0;
  const hasNext  = data?.nextPage != null;
  const hasActiveFilters = Boolean(make.trim() || model.trim() || condition);

  return (
    <Shell>
      <PageHero
        title="Browse vehicles"
        subtitle="Compare price, mileage, and condition from participating dealers. Read-only listings — no account required."
      />

      <div className="mb-8">
        <ListFilterBar
          make={make}
          model={model}
          condition={condition}
          onMakeChange={v => { setMake(v); setPage(1); }}
          onModelChange={v => { setModel(v); setPage(1); }}
          onConditionChange={v => { setCondition(v); setPage(1); }}
          onSubmit={reload}
          onClear={resetFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </div>

      {loading && !data ? (
        <VehicleGridSkeleton />
      ) : error ? (
        <ErrorState message={error} onRetry={reload} />
      ) : vehicles.length === 0 ? (
        <EmptyState
          title="No vehicles match your search"
          description="Try different make or model keywords, or clear filters to see everything available."
          actionLabel={hasActiveFilters ? 'Clear filters' : undefined}
          onAction={hasActiveFilters ? resetFilters : undefined}
        />
      ) : (
        <>
          <p className="mb-5 text-sm font-medium text-slate-600">
            {total.toLocaleString()} vehicle{total !== 1 ? 's' : ''} available
          </p>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {vehicles.map(card => (
              <VehicleCard key={card.listingId} card={card} />
            ))}
          </div>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            hasNext={hasNext}
            onPageChange={setPage}
          />
        </>
      )}
    </Shell>
  );
}
