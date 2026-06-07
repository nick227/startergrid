import { operatorCopy } from '@/lib/copy/operator.ts';
import { useMemo, useState } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useReportsData } from '@/hooks/useReportsData.ts';
import { triggerPerformanceCompute } from '@/lib/api/sdk.ts';
import { ControlBlock } from '@/components/layout';
import { FilterChips } from '@/components/generic';
import { EmptyState } from '@/components/ui';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { ReportAssetList } from '@/components/reports/ReportAssetList.tsx';
import { ReportPageShell } from '@/components/reports/ReportPageShell.tsx';
import { ReportTimeRangeBar } from '@/components/reports/ReportTimeRangeBar.tsx';
import { reportCatalogCopy } from '@/lib/reportCopy.ts';
import { findReport } from '@/lib/reportsCatalog.ts';
import {
  reportAssetMatchesSearch,
  reportAssetMatchesSignal,
  reportSituationLine,
  type ReportSignalFilter,
} from '@/lib/reportRowPresentation.ts';
import type { PlatformPerformanceItem } from '@/lib/types.ts';
import { movementActionCount } from '@/lib/reportPresentation.ts';

type Props = OperatorPageBaseProps;

const SIGNAL_FILTERS: Array<{ key: ReportSignalFilter; label: string }> = [
  { key: 'ALL', label: 'All signals' },
  { key: 'STALE', label: 'Stale' },
  { key: 'SLOW', label: 'Slow' },
  { key: 'FAST', label: 'Fast' },
  { key: 'LOW_DATA', label: 'Low data' },
];

export default function MovementReportPage({ dealerId, nav, activeTab }: Props) {
  const def = findReport('movement')!;
  const copy = reportCatalogCopy(def);
  const { perf, reload } = useReportsData(dealerId);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [signalFilter, setSignalFilter] = useState<ReportSignalFilter>('ALL');

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await triggerPerformanceCompute(dealerId);
      reload();
    } finally {
      setRefreshing(false);
    }
  };

  const platformPerfBySlug = useMemo(() => {
    const m = new Map<string, PlatformPerformanceItem>();
    for (const p of perf.data?.platforms ?? []) m.set(p.platformSlug, p);
    return m;
  }, [perf.data?.platforms]);

  const visible = useMemo(
    () =>
      (perf.data?.vehicles ?? []).filter(
        v => reportAssetMatchesSignal(v, signalFilter) && reportAssetMatchesSearch(v, search),
      ),
    [perf.data?.vehicles, signalFilter, search],
  );

  const situation = perf.data?.summary
    ? `${copy.decision} · ${reportSituationLine(perf.data.summary)} · ${movementActionCount(perf.data.vehicles)} need action`
    : copy.decision;

  return (
    <ReportPageShell
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      title={copy.title}
      line={situation}
      onRefresh={() => void handleRefresh()}
      refreshing={refreshing || perf.loading}
      lastRefresh={perf.lastRefresh ?? undefined}
      toolbar={<ReportTimeRangeBar value="now" snapshotOnly onChange={() => {}} />}
    >
      <ControlBlock
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={operatorCopy.reports.searchAssets}
        onRefresh={() => void handleRefresh()}
        refreshing={refreshing || perf.loading}
        filters={
          <FilterChips
            chips={SIGNAL_FILTERS}
            activeKey={signalFilter}
            onSelect={key => setSignalFilter(key as ReportSignalFilter)}
          />
        }
      />

      <ReportAssetList
        rows={visible}
        platformPerfBySlug={platformPerfBySlug}
        nav={nav}
        loading={perf.loading && !perf.data}
        emptyState={
          <EmptyState
            icon="📦"
            title={EMPTY_STATE_COPY.noPerformanceVehicles.title}
            subtitle={EMPTY_STATE_COPY.noPerformanceVehicles.subtitle}
          />
        }
      />
    </ReportPageShell>
  );
}
