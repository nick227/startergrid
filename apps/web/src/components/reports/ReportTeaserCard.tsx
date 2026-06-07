import type { ReactNode } from 'react';
import type { ReportFamily } from '@/lib/reportsCatalog.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = {
  title: string;
  decision: string;
  family: ReportFamily;
  metricLabel: string;
  metricValue: string | number;
  href: string;
  phaseAvailable: boolean;
  preview?: ReactNode;
};

const FAMILY_BADGE: Record<ReportFamily, string> = {
  inventory: 'bg-navy-50 text-navy-800 border-navy-200/80',
  platform: 'bg-orange-50 text-orange-900 border-orange-200/80',
};

const FAMILY_LABEL: Record<ReportFamily, string> = {
  inventory: 'Inventory',
  platform: 'Platform',
};

export function ReportTeaserCard({
  title,
  decision,
  family,
  metricLabel,
  metricValue,
  href,
  phaseAvailable,
  preview,
}: Props) {
  const open = () => {
    if (!phaseAvailable) return;
    window.location.hash = href.startsWith('#') ? href : `#${href}`;
  };

  return (
    <article
      className={`group surface-card-operator rounded-lg border border-silver-200/90 bg-surface-card shadow-elevation-1 flex flex-col h-full transition-all ${
        phaseAvailable
          ? 'hover:border-navy-400/40 hover:shadow-elevation-2 cursor-pointer focus-within:ring-2 focus-within:ring-navy-500/30'
          : 'opacity-90'
      }`}
    >
      <button
        type="button"
        onClick={open}
        disabled={!phaseAvailable}
        className="flex flex-col flex-1 text-left p-5 gap-4 disabled:cursor-default"
      >
        <div className="flex items-start justify-between gap-3">
          <span
            className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${FAMILY_BADGE[family]}`}
          >
            {FAMILY_LABEL[family]}
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold text-ink-heading tracking-tight group-hover:text-navy-900 transition-colors">
            {title}
          </h3>
          <p className="text-xs text-ink-muted mt-2 leading-relaxed line-clamp-3">{decision}</p>
        </div>

        <div className="rounded-md border border-silver-100 bg-surface-inset/60 px-3 py-2.5">
          <dl>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">{metricLabel}</dt>
            <dd className="text-2xl font-bold text-ink-heading tabular-nums tracking-tight mt-0.5">{metricValue}</dd>
          </dl>
        </div>

        {preview && <div className="text-xs text-ink-muted leading-snug border-t border-silver-100 pt-3">{preview}</div>}

        {phaseAvailable ? (
          <span className="text-xs font-semibold text-orange-600 group-hover:text-orange-700 mt-auto">
            {operatorCopy.reports.viewFullReport} →
          </span>
        ) : (
          <span className="text-xs text-ink-faint mt-auto">{operatorCopy.reports.comingSoon}</span>
        )}
      </button>
    </article>
  );
}
