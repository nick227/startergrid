import { useMemo, useState } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useChannelVelocityReport } from '@/hooks/usePhase3Report.ts';
import { ControlBlock } from '@/components/layout';
import { EmptyState } from '@/components/ui';
import { ErrorState } from '@/components/operator';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { ReportVelocityList } from '@/components/reports/ReportVelocityList.tsx';
import { ReportPageShell } from '@/components/reports/ReportPageShell.tsx';
import { ReportTimeRangeBar } from '@/components/reports/ReportTimeRangeBar.tsx';
import { reportCatalogCopy } from '@/lib/reportCopy.ts';
import { apiReportRange, findReport, type ReportRangePreset } from '@/lib/reportsCatalog.ts';
import { reportDetailHash } from '@/lib/reportRoutes.ts';
import { velocityMatchesSearch, velocityRowsSorted } from '@/lib/reportPhase3Presentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = OperatorPageBaseProps & { reportRange: ReportRangePreset };

export default function VelocityReportPage({ dealerId, nav, activeTab, reportRange }: Props) {
  const def = findReport('velocity')!;
  const copy = reportCatalogCopy(def);
  const range = apiReportRange(reportRange, def.defaultRange) as ReportRangePreset;
  const query = useChannelVelocityReport(dealerId, reportRange);
  const [search, setSearch] = useState('');

  const rows = useMemo(() => {
    const sorted = velocityRowsSorted(query.data?.channels ?? []);
    return sorted.filter(r => velocityMatchesSearch(r, search));
  }, [query.data?.channels, search]);

  const summary = query.data?.summary;
  const situation = summary
    ? `${copy.decision} · ${operatorCopy.reports.velocitySummaryLine(summary.cohortOutcomeCount, summary.channelsWithOutcomes)}`
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
      <p className="text-xs text-ink-faint mb-3 -mt-2">{operatorCopy.reports.velocityDisclaimer}</p>

      <ControlBlock
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder={operatorCopy.reports.searchChannels}
        onRefresh={query.reload}
        refreshing={query.loading}
      />

      <ReportVelocityList
        rows={rows}
        nav={nav}
        loading={query.loading && !query.data}
        emptyState={
          <EmptyState
            icon="⏱"
            title={EMPTY_STATE_COPY.noChannelVelocity.title}
            subtitle={EMPTY_STATE_COPY.noChannelVelocity.subtitle}
          />
        }
      />
    </ReportPageShell>
  );
}
