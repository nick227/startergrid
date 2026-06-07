import { useMemo, useState } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { usePublishThroughputReport } from '@/hooks/usePhase2Report.ts';
import { ControlBlock } from '@/components/layout';
import { EmptyState } from '@/components/ui';
import { ErrorState } from '@/components/operator';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { ReportThroughputList } from '@/components/reports/ReportThroughputList.tsx';
import { ReportPageShell } from '@/components/reports/ReportPageShell.tsx';
import { ReportTimeRangeBar } from '@/components/reports/ReportTimeRangeBar.tsx';
import { reportCatalogCopy } from '@/lib/reportCopy.ts';
import { apiReportRange, findReport, type ReportRangePreset } from '@/lib/reportsCatalog.ts';
import { reportDetailHash } from '@/lib/reportRoutes.ts';
import {
  throughputMatchesSearch,
  throughputRowsSorted,
} from '@/lib/reportPhase2Presentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = OperatorPageBaseProps & { reportRange: ReportRangePreset };

export default function ThroughputReportPage({ dealerId, nav, activeTab, reportRange }: Props) {
  const def = findReport('throughput')!;
  const copy = reportCatalogCopy(def);
  const range = apiReportRange(reportRange, def.defaultRange) as ReportRangePreset;
  const query = usePublishThroughputReport(dealerId, reportRange);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const sorted = throughputRowsSorted(query.data?.channels ?? []);
    return sorted.filter(r => throughputMatchesSearch(r, search));
  }, [query.data?.channels, search]);

  const summary = query.data?.summary;
  const situation = summary
    ? `${copy.decision} · ${operatorCopy.reports.throughputSummary(summary.sentInPeriod, summary.failedInPeriod, summary.openQueueCount)}`
    : copy.decision;

  const setRange = (next: ReportRangePreset) => {
    window.location.hash = reportDetailHash(dealerId, def.family, def.slug, next);
  };

  if (query.error && !query.data) {
    return (
      <ReportPageShell dealerId={dealerId} activeTab={activeTab} nav={nav} title={copy.title} line={copy.decision}>
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
      line={situation}
      onRefresh={query.reload}
      refreshing={query.loading}
      lastRefresh={query.lastRefresh ?? undefined}
      toolbar={<ReportTimeRangeBar value={range} onChange={setRange} />}
    >
      <ControlBlock
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={operatorCopy.reports.searchChannels}
        onRefresh={query.reload}
        refreshing={query.loading}
      />

      <ReportThroughputList
        rows={rows}
        nav={nav}
        loading={query.loading && !query.data}
        emptyState={
          <EmptyState
            icon="📤"
            title={EMPTY_STATE_COPY.noThroughputChannels.title}
            subtitle={EMPTY_STATE_COPY.noThroughputChannels.subtitle}
          />
        }
      />
    </ReportPageShell>
  );
}
