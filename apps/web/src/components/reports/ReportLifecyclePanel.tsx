import type { LifecycleTransitionRow } from '@auto-dealer/api-client';
import { PanelSkeleton } from '@/components/operator';

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

function Kpi({ label, value }: { label: string; value: number }) {
  return (
    <div className="surface-card-operator border border-silver-200 rounded-lg p-3">
      <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="text-xl font-bold text-ink-heading tabular-nums mt-1">{value}</dd>
    </div>
  );
}

export function ReportLifecyclePanel({ summary, transitions, loading, emptyState }: Props) {
  if (loading) return <PanelSkeleton rows={4} />;
  if (!summary.intakeCount && !transitions.length) return <>{emptyState}</>;

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Kpi label="Intake" value={summary.intakeCount} />
        <Kpi label="Sold" value={summary.soldExits} />
        <Kpi label="Removed" value={summary.removedExits} />
        <Kpi label="Reactivated" value={summary.reactivatedCount} />
        <Kpi label="Net change" value={summary.netChange} />
      </dl>

      {transitions.length > 0 && (
        <ul className="space-y-2">
          {transitions.map(row => (
            <li
              key={row.transitionState}
              className="surface-card-operator border border-silver-200 rounded-lg px-4 py-3 flex items-center justify-between"
            >
              <span className="text-sm font-semibold text-ink-heading">{row.transitionState}</span>
              <span className="text-sm tabular-nums text-ink-muted">{row.count} transitions</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
