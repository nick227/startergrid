import { useMemo, useState } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useSyncActivityReport } from '@/hooks/usePhase2Report.ts';
import { ControlBlock } from '@/components/layout';
import { EmptyState } from '@/components/ui';
import { ErrorState } from '@/components/operator';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { ReportSyncActivityList } from '@/components/reports/ReportSyncActivityList.tsx';
import { ReportContentSection } from '@/components/reports/ReportContentSection.tsx';
import { ReportPageShell } from '@/components/reports/ReportPageShell.tsx';
import { ReportTimeRangeBar } from '@/components/reports/ReportTimeRangeBar.tsx';
import { ReportToolbar } from '@/components/reports/ReportToolbar.tsx';
import { reportCatalogCopy } from '@/lib/reportCopy.ts';
import { apiReportRange, findReport, type ReportRangePreset } from '@/lib/reportsCatalog.ts';
import { reportDetailHash } from '@/lib/reportRoutes.ts';
import type { ReportMetric } from '@/lib/reportMetrics.ts';
import {
  syncActivityMatchesSearch,
  syncActivityRowsSorted,
} from '@/lib/reportPhase2Presentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = OperatorPageBaseProps & { reportRange: ReportRangePreset };

export default function SyncActivityReportPage({ dealerId, nav, activeTab, reportRange }: Props) {
  const def = findReport('sync-summary')!;
  const copy = reportCatalogCopy(def);
  const range = apiReportRange(reportRange, def.defaultRange) as ReportRangePreset;
  const query = useSyncActivityReport(dealerId, reportRange);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const sorted = syncActivityRowsSorted(query.data?.channels ?? []);
    return sorted.filter(r => syncActivityMatchesSearch(r, search));
  }, [query.data?.channels, search]);

  const total = query.data?.summary.totalEvents ?? 0;
  const channelCount = query.data?.channels.length ?? 0;
  const metrics: ReportMetric[] | undefined = query.data
    ? [
        { label: 'Total events', value: total },
        { label: 'Channels', value: channelCount },
      ]
    : undefined;

  const setRange = (next: ReportRangePreset) => {
    window.location.hash = reportDetailHash(dealerId, def.family, def.slug, next);
  };

  if (query.error && !query.data) {
    return (
      <ReportPageShell dealerId={dealerId} activeTab={activeTab} nav={nav} title={copy.title} decision={copy.decision}>
        <ErrorState message={query.error} onRetry={query.reload} />
      </ReportPageShell>
    );
  }

  return (
    <ReportPageShell
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      title={copy.title}
      decision={copy.decision}
      metrics={metrics}
      metricsLoading={query.loading}
      onRefresh={query.reload}
      refreshing={query.loading}
      lastRefresh={query.lastRefresh ?? undefined}
      toolbar={
        <ReportToolbar>
          <ReportTimeRangeBar value={range} onChange={setRange} />
        </ReportToolbar>
      }
    >
      <ReportContentSection title={operatorCopy.reports.platformsSection}>
        <ControlBlock
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={operatorCopy.reports.searchChannels}
          onRefresh={query.reload}
          refreshing={query.loading}
        />

        <ReportSyncActivityList
          rows={rows}
          nav={nav}
          loading={query.loading && !query.data}
          emptyState={
            <EmptyState
              icon="🔄"
              title={EMPTY_STATE_COPY.noSyncActivity.title}
              subtitle={EMPTY_STATE_COPY.noSyncActivity.subtitle}
            />
          }
        />
      </ReportContentSection>
    </ReportPageShell>
  );
}
