import type { LifecycleTransitionRow } from '@auto-dealer/api-client';
import { PanelSkeleton } from '@/components/operator';
import type { ReportMetric } from '@/lib/reportMetrics.ts';
import { ReportSummaryMetrics } from '@/components/reports/ReportSummaryMetrics.tsx';
import { ReportContentSection } from '@/components/reports/ReportContentSection.tsx';

type Props = {
  summary: {
    intakeCount: number;
    soldExits: number;
    removedExits: number;
    reactivatedCount: number;
    netChange: number;
  };
  transitions: LifecycleTransitionRow[];
  loading?: boolean;
  emptyState: React.ReactNode;
};

function summaryMetrics(summary: Props['summary']): ReportMetric[] {
  return [
    { label: 'Intake', value: summary.intakeCount, tone: 'info' },
    { label: 'Sold', value: summary.soldExits },
    { label: 'Removed', value: summary.removedExits, tone: 'warning' },
    { label: 'Reactivated', value: summary.reactivatedCount, tone: 'success' },
    {
      label: 'Net change',
      value: summary.netChange >= 0 ? `+${summary.netChange}` : summary.netChange,
      tone: summary.netChange >= 0 ? 'success' : summary.netChange < 0 ? 'warning' : 'default',
    },
  ];
}

export function ReportLifecyclePanel({ summary, transitions, loading, emptyState }: Props) {
  if (loading) return <PanelSkeleton rows={4} />;
  if (!summary.intakeCount && !transitions.length) return <>{emptyState}</>;

  return (
    <ReportContentSection
      title="Transition breakdown"
      subtitle="Lifecycle events recorded in the selected range"
    >
      <div className="mb-6">
        <ReportSummaryMetrics items={summaryMetrics(summary)} columns={5} />
      </div>

      {transitions.length > 0 && (
        <ul className="space-y-2">
          {transitions.map(row => (
            <li
              key={row.transitionState}
              className="surface-card-operator rounded-lg border border-silver-200/90 px-4 py-3.5 flex items-center justify-between gap-4"
            >
              <span className="text-sm font-semibold text-ink-heading">{row.transitionState}</span>
              <span className="text-sm tabular-nums font-medium text-ink-muted">
                {row.count} {row.count === 1 ? 'transition' : 'transitions'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </ReportContentSection>
  );
}
