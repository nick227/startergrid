import { useMemo, useState } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useObservedDemandReport } from '@/hooks/usePhase2Report.ts';
import { ControlBlock } from '@/components/layout';
import { EmptyState } from '@/components/ui';
import { ErrorState } from '@/components/operator';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { ReportObservedDemandList } from '@/components/reports/ReportObservedDemandList.tsx';
import { ReportContentSection } from '@/components/reports/ReportContentSection.tsx';
import { ReportNotice } from '@/components/reports/ReportNotice.tsx';
import { ReportPageShell } from '@/components/reports/ReportPageShell.tsx';
import { ReportTimeRangeBar } from '@/components/reports/ReportTimeRangeBar.tsx';
import { ReportToolbar } from '@/components/reports/ReportToolbar.tsx';
import { reportCatalogCopy } from '@/lib/reportCopy.ts';
import { apiReportRange, findReport, type ReportRangePreset } from '@/lib/reportsCatalog.ts';
import { reportDetailHash } from '@/lib/reportRoutes.ts';
import type { ReportMetric } from '@/lib/reportMetrics.ts';
import {
  observedDemandMatchesSearch,
  observedDemandRowsSorted,
} from '@/lib/reportPhase2Presentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = OperatorPageBaseProps & { reportRange: ReportRangePreset };

export default function ObservedDemandReportPage({ dealerId, nav, activeTab, reportRange }: Props) {
  const def = findReport('demand')!;
  const copy = reportCatalogCopy(def);
  const range = apiReportRange(reportRange, def.defaultRange) as ReportRangePreset;
  const query = useObservedDemandReport(dealerId, reportRange);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const sorted = observedDemandRowsSorted(query.data?.assets ?? []);
    return sorted.filter(r => observedDemandMatchesSearch(r, search));
  }, [query.data?.assets, search]);

  const summary = query.data?.summary;
  const metrics: ReportMetric[] | undefined = summary
    ? [
        { label: 'With demand', value: summary.assetsWithObservedDemand, tone: 'info' },
        {
          label: 'High-age, no demand',
          value: summary.highAgeZeroDemandCount,
          tone: summary.highAgeZeroDemandCount > 0 ? 'warning' : 'default',
        },
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
      notice={<ReportNotice>{operatorCopy.reports.observedDemandDisclaimer}</ReportNotice>}
      onRefresh={query.reload}
      refreshing={query.loading}
      lastRefresh={query.lastRefresh ?? undefined}
      toolbar={
        <ReportToolbar>
          <ReportTimeRangeBar value={range} onChange={setRange} />
        </ReportToolbar>
      }
    >
      <ReportContentSection
        title={operatorCopy.reports.assetsSection}
        subtitle={operatorCopy.reports.assetsSectionSubtitle}
      >
        <ControlBlock
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder={operatorCopy.reports.searchAssets}
          onRefresh={query.reload}
          refreshing={query.loading}
        />

        <ReportObservedDemandList
          rows={rows}
          nav={nav}
          loading={query.loading && !query.data}
          emptyState={
            <EmptyState
              icon="📬"
              title={EMPTY_STATE_COPY.noObservedDemand.title}
              subtitle={EMPTY_STATE_COPY.noObservedDemand.subtitle}
            />
          }
        />
      </ReportContentSection>
    </ReportPageShell>
  );
}
