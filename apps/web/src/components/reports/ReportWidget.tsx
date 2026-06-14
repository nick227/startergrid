import type { ReactNode } from 'react';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = {
  title: string;
  decision: string;
  metricLabel: string;
  metricValue: string | number;
  onViewAll: () => void;
  children?: ReactNode;
};

export function ReportWidget({
  title,
  decision,
  metricLabel,
  metricValue,
  onViewAll,
  children,
}: Props) {
  return (
    <article className="surface-card-operator rounded-lg border border-silver-200/90 bg-surface-card shadow-elevation-1 flex flex-col h-full overflow-hidden transition-all hover:border-navy-400/40 hover:shadow-elevation-2">
      <div className="p-5 flex-1 flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-bold text-ink-heading tracking-tight">{title}</h3>
            <p className="text-xs text-ink-muted mt-1 leading-relaxed line-clamp-2">{decision}</p>
          </div>
          <div className="shrink-0 text-right rounded-md border border-silver-100 bg-surface-inset/60 px-3 py-2.5">
            <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">{metricLabel}</dt>
            <dd className="text-2xl font-bold text-ink-heading tabular-nums tracking-tight mt-0.5">{metricValue}</dd>
          </div>
        </div>

        {children && (
          <div className="mt-2 flex-1">
            <div className="border-t border-silver-100/50 pt-3">
              {children}
            </div>
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={onViewAll}
        className="px-5 py-3 bg-surface-inset/30 border-t border-silver-100/80 mt-auto text-xs font-semibold text-orange-600 hover:text-orange-700 w-full text-center hover:bg-orange-50/50 transition-colors"
      >
        {operatorCopy.reports.viewFullReport} →
      </button>
    </article>
  );
}
