import { useMemo, useState } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useObservedDemandReport } from '@/hooks/usePhase2Report.ts';
import { ControlBlock } from '@/components/layout';
import { EmptyState } from '@/components/ui';
import { ErrorState } from '@/components/operator';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { ReportObservedDemandList } from '@/components/reports/ReportObservedDemandList.tsx';
import { ReportPageShell } from '@/components/reports/ReportPageShell.tsx';
import { ReportTimeRangeBar } from '@/components/reports/ReportTimeRangeBar.tsx';
import { reportCatalogCopy } from '@/lib/reportCopy.ts';
import { apiReportRange, findReport, type ReportRangePreset } from '@/lib/reportsCatalog.ts';
import { reportDetailHash } from '@/lib/reportRoutes.ts';
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
  const situation = summary
    ? `${copy.decision} · ${operatorCopy.reports.demandSummaryLine(summary.assetsWithObservedDemand, summary.highAgeZeroDemandCount)}`
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
      <p className="text-xs text-ink-faint mb-3 -mt-2">{operatorCopy.reports.observedDemandDisclaimer}</p>

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
    </ReportPageShell>
  );
}
