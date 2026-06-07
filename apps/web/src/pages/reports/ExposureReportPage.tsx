import { useMemo, useState } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useReportsData } from '@/hooks/useReportsData.ts';
import { triggerPerformanceCompute } from '@/lib/api/sdk.ts';
import { ControlBlock } from '@/components/layout';
import { EmptyState } from '@/components/ui';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { ReportExposureList } from '@/components/reports/ReportExposureList.tsx';
import { ReportPageShell } from '@/components/reports/ReportPageShell.tsx';
import { ReportTimeRangeBar } from '@/components/reports/ReportTimeRangeBar.tsx';
import { reportCatalogCopy } from '@/lib/reportCopy.ts';
import { findReport } from '@/lib/reportsCatalog.ts';
import {
  lowestCoveragePct,
  platformCoverageRows,
} from '@/lib/reportPresentation.ts';
import { reportPlatformMatchesSearch } from '@/lib/reportRowPresentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = OperatorPageBaseProps;

export default function ExposureReportPage({ dealerId, nav, activeTab }: Props) {
  const copy = reportCatalogCopy(findReport('exposure')!);
  const { perf, reload } = useReportsData(dealerId);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await triggerPerformanceCompute(dealerId);
      reload();
    } finally {
      setRefreshing(false);
    }
  };

  const activeTotal = perf.data?.summary.activeCount ?? 0;
  const rows = useMemo(() => {
    const covered = platformCoverageRows(perf.data?.platforms ?? [], activeTotal);
    return covered
      .filter(p => reportPlatformMatchesSearch(p, search))
      .sort((a, b) => (a.coveragePct ?? 0) - (b.coveragePct ?? 0));
  }, [perf.data?.platforms, activeTotal, search]);

  const low = lowestCoveragePct(platformCoverageRows(perf.data?.platforms ?? [], activeTotal));
  const situation = `${copy.decision} · ${activeTotal} active · lowest coverage ${low != null ? `${low}%` : '—'}`;

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
        searchPlaceholder={operatorCopy.reports.searchPlatforms}
        onRefresh={() => void handleRefresh()}
        refreshing={refreshing || perf.loading}
      />

      <ReportExposureList
        rows={rows}
        activeTotal={activeTotal}
        nav={nav}
        loading={perf.loading && !perf.data}
        emptyState={
          <EmptyState
            icon="📊"
            title={EMPTY_STATE_COPY.noPerformancePlatforms.title}
            subtitle={EMPTY_STATE_COPY.noPerformancePlatforms.subtitle}
          />
        }
      />
    </ReportPageShell>
  );
}
