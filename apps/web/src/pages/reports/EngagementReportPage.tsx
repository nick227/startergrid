import { useMemo, useState } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useReportsData } from '@/hooks/useReportsData.ts';
import { triggerPerformanceCompute } from '@/lib/api/sdk.ts';
import { ControlBlock } from '@/components/layout';
import { EmptyState } from '@/components/ui';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { ReportEngagementList } from '@/components/reports/ReportEngagementList.tsx';
import { ReportContentSection } from '@/components/reports/ReportContentSection.tsx';
import { ReportNotice } from '@/components/reports/ReportNotice.tsx';
import { ReportPageShell } from '@/components/reports/ReportPageShell.tsx';
import { ReportTimeRangeBar } from '@/components/reports/ReportTimeRangeBar.tsx';
import { ReportToolbar } from '@/components/reports/ReportToolbar.tsx';
import { reportCatalogCopy } from '@/lib/reportCopy.ts';
import { findReport } from '@/lib/reportsCatalog.ts';
import type { ReportMetric } from '@/lib/reportMetrics.ts';
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

  const platforms = perf.data?.platforms ?? [];
  const rows = useMemo(() => {
    const sorted = engagementSortedPlatforms(platforms);
    return sorted.filter(p => reportPlatformMatchesSearch(p, search));
  }, [platforms, search]);

  const metrics: ReportMetric[] | undefined = perf.data
    ? [
        { label: 'Peak assists', value: topEngagementTotal(platforms) },
        { label: 'Platforms', value: platforms.length },
      ]
    : undefined;

  return (
    <ReportPageShell
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      title={copy.title}
      decision={copy.decision}
      metrics={metrics}
      metricsLoading={perf.loading}
      onRefresh={() => void handleRefresh()}
      refreshing={refreshing || perf.loading}
      lastRefresh={perf.lastRefresh ?? undefined}
      notice={<ReportNotice>{operatorCopy.reports.assistsDisclaimer}</ReportNotice>}
      toolbar={
        <ReportToolbar>
          <ReportTimeRangeBar value="30d" snapshotOnly onChange={() => {}} />
        </ReportToolbar>
      }
    >
      <ReportContentSection
        title={operatorCopy.reports.platformsSection}
        subtitle={operatorCopy.reports.platformsSectionSubtitle}
      >
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
      </ReportContentSection>
    </ReportPageShell>
  );
}
