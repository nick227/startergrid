import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useLifecycleFlowReport } from '@/hooks/usePhase3Report.ts';
import { EmptyState } from '@/components/ui';
import { ErrorState } from '@/components/operator';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { ReportLifecyclePanel } from '@/components/reports/ReportLifecyclePanel.tsx';
import { ReportPageShell } from '@/components/reports/ReportPageShell.tsx';
import { ReportTimeRangeBar } from '@/components/reports/ReportTimeRangeBar.tsx';
import { reportCatalogCopy } from '@/lib/reportCopy.ts';
import { apiReportRange, findReport, type ReportRangePreset } from '@/lib/reportsCatalog.ts';
import { reportDetailHash } from '@/lib/reportRoutes.ts';
import { lifecycleTransitionsSorted } from '@/lib/reportPhase3Presentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = OperatorPageBaseProps & { reportRange: ReportRangePreset };

export default function LifecycleReportPage({ dealerId, nav, activeTab, reportRange }: Props) {
  const def = findReport('lifecycle')!;
  const copy = reportCatalogCopy(def);
  const range = apiReportRange(reportRange, def.defaultRange) as ReportRangePreset;
  const query = useLifecycleFlowReport(dealerId, reportRange);

  const summary = query.data?.summary;
  const situation = summary
    ? `${copy.decision} · ${operatorCopy.reports.lifecycleSummaryLine(summary.intakeCount, summary.soldExits, summary.removedExits, summary.netChange)}`
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
      <ReportLifecyclePanel
        summary={summary ?? { intakeCount: 0, soldExits: 0, removedExits: 0, reactivatedCount: 0, netChange: 0 }}
        transitions={lifecycleTransitionsSorted(query.data?.transitions ?? [])}
        loading={query.loading && !query.data}
        emptyState={
          <EmptyState
            icon="🔁"
            title={EMPTY_STATE_COPY.noLifecycleFlow.title}
            subtitle={EMPTY_STATE_COPY.noLifecycleFlow.subtitle}
          />
        }
      />
    </ReportPageShell>
  );
}
