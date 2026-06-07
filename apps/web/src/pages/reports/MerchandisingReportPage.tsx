import { useMemo, useState } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useMerchandisingActivityReport } from '@/hooks/usePhase3Report.ts';
import { ControlBlock } from '@/components/layout';
import { EmptyState } from '@/components/ui';
import { ErrorState } from '@/components/operator';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { ReportMerchandisingList } from '@/components/reports/ReportMerchandisingList.tsx';
import { ReportContentSection } from '@/components/reports/ReportContentSection.tsx';
import { ReportPageShell } from '@/components/reports/ReportPageShell.tsx';
import { ReportTimeRangeBar } from '@/components/reports/ReportTimeRangeBar.tsx';
import { ReportToolbar } from '@/components/reports/ReportToolbar.tsx';
import { reportCatalogCopy } from '@/lib/reportCopy.ts';
import { apiReportRange, findReport, type ReportRangePreset } from '@/lib/reportsCatalog.ts';
import { reportDetailHash } from '@/lib/reportRoutes.ts';
import type { ReportMetric } from '@/lib/reportMetrics.ts';
import {
  merchandisingMatchesSearch,
  merchandisingRowsSorted,
} from '@/lib/reportPhase3Presentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = OperatorPageBaseProps & { reportRange: ReportRangePreset };

export default function MerchandisingReportPage({ dealerId, nav, activeTab, reportRange }: Props) {
  const def = findReport('merchandising')!;
  const copy = reportCatalogCopy(def);
  const range = apiReportRange(reportRange, def.defaultRange) as ReportRangePreset;
  const query = useMerchandisingActivityReport(dealerId, reportRange);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const sorted = merchandisingRowsSorted(query.data?.assets ?? []);
    return sorted.filter(r => merchandisingMatchesSearch(r, search));
  }, [query.data?.assets, search]);

  const summary = query.data?.summary;
  const metrics: ReportMetric[] | undefined = summary
    ? [
        { label: 'Assets worked', value: summary.assetsWithActivity },
        {
          label: 'Active neglected',
          value: summary.activeAssetsNeglected,
          tone: summary.activeAssetsNeglected > 0 ? 'warning' : 'default',
        },
        { label: 'Total updates', value: summary.totalUpdates },
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

        <ReportMerchandisingList
          rows={rows}
          nav={nav}
          loading={query.loading && !query.data}
          emptyState={
            <EmptyState
              icon="🛠"
              title={EMPTY_STATE_COPY.noMerchandisingActivity.title}
              subtitle={EMPTY_STATE_COPY.noMerchandisingActivity.subtitle}
            />
          }
        />
      </ReportContentSection>
    </ReportPageShell>
  );
}
