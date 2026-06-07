import type { ReactNode } from 'react';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = {
  title: string;
  decision: string;
  metricLabel: string;
  metricValue: string | number;
  href: string;
  phaseAvailable: boolean;
  preview?: ReactNode;
};

export function ReportTeaserCard({
  title,
  decision,
  metricLabel,
  metricValue,
  href,
  phaseAvailable,
  preview,
}: Props) {
  const open = () => {
    window.location.hash = href.startsWith('#') ? href : `#${href}`;
  };

  return (
    <article className="surface-card-operator border border-silver-200 rounded-lg p-4 flex flex-col gap-3">
      <div>
        <h3 className="text-sm font-bold text-ink-heading">{title}</h3>
        <p className="text-xs text-ink-muted mt-1 leading-relaxed">{decision}</p>
      </div>
      <dl className="flex items-baseline gap-2">
        <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{metricLabel}</dt>
        <dd className="text-xl font-bold text-ink-heading tabular-nums">{metricValue}</dd>
      </dl>
      {preview}
      {phaseAvailable ? (
        <button
          type="button"
          onClick={open}
          className="text-xs font-semibold text-orange-600 hover:underline text-left mt-auto"
        >
          {operatorCopy.reports.viewFullReport} →
        </button>
      ) : (
        <p className="text-xs text-ink-faint mt-auto">{operatorCopy.reports.comingSoon}</p>
      )}
    </article>
  );
}
