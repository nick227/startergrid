import { useMemo, useState } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useReportsData } from '@/hooks/useReportsData.ts';
import { triggerPerformanceCompute } from '@/lib/api/sdk.ts';
import { ControlBlock } from '@/components/layout';
import { EmptyState } from '@/components/ui';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { ReportEngagementList } from '@/components/reports/ReportEngagementList.tsx';
import { ReportPageShell } from '@/components/reports/ReportPageShell.tsx';
import { ReportTimeRangeBar } from '@/components/reports/ReportTimeRangeBar.tsx';
import { reportCatalogCopy } from '@/lib/reportCopy.ts';
import { findReport } from '@/lib/reportsCatalog.ts';
import { engagementSortedPlatforms, topEngagementTotal } from '@/lib/reportPresentation.ts';
import { reportPlatformMatchesSearch } from '@/lib/reportRowPresentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = OperatorPageBaseProps;

export default function EngagementReportPage({ dealerId, nav, activeTab }: Props) {
  const copy = reportCatalogCopy(findReport('engagement')!);
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

  const rows = useMemo(() => {
    const sorted = engagementSortedPlatforms(perf.data?.platforms ?? []);
    return sorted.filter(p => reportPlatformMatchesSearch(p, search));
  }, [perf.data?.platforms, search]);

  const top = topEngagementTotal(perf.data?.platforms ?? []);
  const situation = `${copy.decision} · peak observed assists ${top}`;

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
      toolbar={
        <ReportTimeRangeBar
          value="30d"
          snapshotOnly
          onChange={() => {}}
        />
      }
    >
      <p className="text-xs text-ink-faint mb-3 -mt-2">{operatorCopy.reports.assistsDisclaimer}</p>

      <ControlBlock
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={operatorCopy.reports.searchPlatforms}
        onRefresh={() => void handleRefresh()}
        refreshing={refreshing || perf.loading}
      />

      <ReportEngagementList
        rows={rows}
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
