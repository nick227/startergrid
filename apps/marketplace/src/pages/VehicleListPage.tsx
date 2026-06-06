import { useState, useCallback, useEffect } from 'react';
import { useQuery, queryErrorMessage } from '../hooks/useQuery.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { fetchVehicles, type ListFilters } from '../lib/api.ts';
import { formatResultCount } from '../lib/display.ts';
import { saveListReturn } from '../lib/listReturn.ts';
import { listHref, parseRoute, type ListQuery } from '../lib/routes.ts';
import { VehicleCard } from '../components/VehicleCard.tsx';
import { PageShell } from '../components/layout/PageShell.tsx';
import { PageHeader } from '../components/ui/PageHeader.tsx';
import { FilterBar } from '../components/ui/FilterBar.tsx';
import { Pagination } from '../components/ui/Pagination.tsx';
import { VehicleGrid } from '../components/ui/VehicleGrid.tsx';
import { SkeletonGrid } from '../components/ui/SkeletonGrid.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';

const PAGE_SIZE = 24;

type Props = { initialQuery?: ListQuery };

export default function VehicleListPage({ initialQuery = {} }: Props) {
  const [make,      setMake]      = useState(initialQuery.make ?? '');
  const [model,     setModel]     = useState(initialQuery.model ?? '');
  const [condition, setCondition] = useState<ListFilters['condition']>(initialQuery.condition);
  const [page,      setPage]      = useState(initialQuery.page ?? 1);
  const [focusToken, setFocusToken] = useState(0);

  usePageMeta(
    'Browse vehicles',
    'Compare price, mileage, and condition from participating dealers.',
  );

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
    setFocusToken(t => t + 1);
  }

  const vehicles = data?.vehicles ?? [];
  const total    = data?.total    ?? 0;
  const hasNext  = data?.nextPage != null;
  const hasActiveFilters = Boolean(make.trim() || model.trim() || condition);

  return (
    <PageShell>
      <PageHeader
        title="Browse vehicles"
        subtitle="Compare price, mileage, and condition from participating dealers. Read-only listings — no account required."
      />

      <div className="mb-6 sm:mb-8">
        <FilterBar
          make={make}
          model={model}
          condition={condition}
          onMakeChange={v => { setMake(v); setPage(1); }}
          onModelChange={v => { setModel(v); setPage(1); }}
          onConditionChange={v => { setCondition(v); setPage(1); }}
          onSubmit={reload}
          onClear={resetFilters}
          hasActiveFilters={hasActiveFilters}
          focusToken={focusToken}
        />
      </div>

      {loading && !data ? (
        <SkeletonGrid />
      ) : error ? (
        <ErrorState message={queryErrorMessage(error)} onRetry={reload} />
      ) : vehicles.length === 0 ? (
        <EmptyState
          title="No vehicles match your search"
          description="Try different make or model keywords, or reset filters to browse everything available."
          actionLabel={hasActiveFilters ? 'Reset filters' : undefined}
          onAction={hasActiveFilters ? resetFilters : undefined}
        />
      ) : (
        <>
          <p className="mb-4 text-sm font-medium text-slate-600 sm:mb-5">
            {formatResultCount(total)} available
          </p>

          <VehicleGrid>
            {vehicles.map(card => (
              <VehicleCard key={card.listingId} card={card} />
            ))}
          </VehicleGrid>

          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={total}
            hasNext={hasNext}
            onPageChange={setPage}
          />
        </>
      )}
    </PageShell>
  );
}
