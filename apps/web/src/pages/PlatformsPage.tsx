import { useMemo, useState, useEffect } from 'react';
import { fetchPublishStatus, fetchAccounts, fetchPlatformPerformance } from '@/lib/api/sdk.ts';
import type { PlatformAccountDetail, PlatformPerformanceItem } from '@/lib/types.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { OperatorPage, ErrorState } from '@/components/operator';
import { PageSituation, ControlBlock } from '@/components/layout';
import { FilterChips } from '@/components/generic';
import { PlatformChannelList } from '@/components/platforms/PlatformChannelList.tsx';
import {
  PLATFORM_CONNECTION_FILTERS,
  platformMatchesFilter,
  platformSituationSummary,
  sortPlatformsForDisplay,
  type PlatformConnectionFilter,
} from '@/lib/platformPresentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = OperatorPageBaseProps & {
  initialPlatformSlug?: string | null;
};

const SORT_OPTIONS = [
  { value: 'urgency', label: 'Needs attention first' },
  { value: 'name', label: 'Name A–Z' },
];

export default function PlatformsPage({ dealerId, nav, activeTab, initialPlatformSlug }: Props) {
  const { data, loading, error, reload, lastRefresh } = useAsyncQuery(
    () => fetchPublishStatus(dealerId),
    [dealerId]
  );
  const accountsQuery = useAsyncQuery(() => fetchAccounts(dealerId), [dealerId]);
  const perfQuery = useAsyncQuery(() => fetchPlatformPerformance(dealerId), [dealerId]);

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<PlatformConnectionFilter>('ALL');
  const [sort, setSort] = useState<'urgency' | 'name'>('urgency');
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialPlatformSlug ?? null);

  useEffect(() => {
    if (initialPlatformSlug) setSelectedSlug(initialPlatformSlug);
  }, [initialPlatformSlug]);

  const accountBySlug = useMemo(() => {
    const m = new Map<string, PlatformAccountDetail>();
    for (const a of accountsQuery.data?.accounts ?? []) m.set(a.platformSlug, a);
    return m;
  }, [accountsQuery.data]);

  const perfBySlug = useMemo(() => {
    const m = new Map<string, PlatformPerformanceItem>();
    for (const p of perfQuery.data?.platforms ?? []) m.set(p.platformSlug, p);
    return m;
  }, [perfQuery.data]);

  const platforms = data?.platforms ?? [];

  const visible = useMemo(() => {
    let list = platforms.filter(p => platformMatchesFilter(p, filter));
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        p =>
          p.platformName.toLowerCase().includes(q) ||
          p.platformSlug.toLowerCase().includes(q)
      );
    }
    return sortPlatformsForDisplay(list, sort);
  }, [platforms, filter, search, sort]);

  const handleRefresh = () => {
    reload();
    accountsQuery.reload();
    perfQuery.reload();
  };

  if (error && !data) {
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} onRefresh={handleRefresh}>
        <ErrorState message={error} onRetry={handleRefresh} />
      </OperatorPage>
    );
  }

  const situation = data ? platformSituationSummary(platforms) : operatorCopy.platforms.loading;

  return (
    <OperatorPage
      dealerId={dealerId}
      dealerName={data?.dealerName}
      activeTab={activeTab}
      nav={nav}
      onRefresh={handleRefresh}
      refreshing={loading}
      lastRefresh={lastRefresh ?? undefined}
      hideDealerId
    >
      <PageSituation title={operatorCopy.platforms.title} line={situation} />

      <ControlBlock
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={operatorCopy.platforms.searchPlaceholder}
        sort={sort}
        sortOptions={SORT_OPTIONS}
        onSortChange={v => setSort(v as 'urgency' | 'name')}
        filters={
          <FilterChips
            chips={PLATFORM_CONNECTION_FILTERS.map(f => ({ key: f.key, label: f.label }))}
            activeKey={filter}
            onSelect={key => setFilter(key as PlatformConnectionFilter)}
          />
        }
      />

      <PlatformChannelList
        platforms={visible}
        perfBySlug={perfBySlug}
        accountBySlug={accountBySlug}
        dealerId={dealerId}
        nav={nav}
        selectedSlug={selectedSlug}
        onSelectSlug={setSelectedSlug}
        onAccountSaved={() => {
          accountsQuery.reload();
          reload();
        }}
        loading={loading && !data}
        emptyMessage={operatorCopy.platforms.emptyFilter}
      />
    </OperatorPage>
  );
}
