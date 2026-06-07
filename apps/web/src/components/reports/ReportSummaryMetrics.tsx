import type { ReportMetric } from '@/lib/reportMetrics.ts';
import { METRIC_TONE_CLASS } from '@/lib/reportMetrics.ts';

type Props = {
  items: ReportMetric[];
  loading?: boolean;
  columns?: 2 | 3 | 4 | 5;
};

const COL_CLASS: Record<number, string> = {
  2: 'grid-cols-2',
  3: 'grid-cols-2 sm:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-4',
  5: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5',
};

export function ReportSummaryMetrics({ items, loading, columns = 4 }: Props) {
  if (!items.length) return null;

  return (
    <dl className={`grid ${COL_CLASS[columns] ?? COL_CLASS[4]} gap-3`}>
      {items.map(item => (
        <div
          key={item.label}
          className="surface-card-operator rounded-lg border border-silver-200/90 bg-surface-card px-4 py-3.5 shadow-elevation-1"
        >
          <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">{item.label}</dt>
          <dd className={`mt-1.5 text-2xl font-bold tabular-nums tracking-tight ${METRIC_TONE_CLASS[item.tone ?? 'default']}`}>
            {loading ? (
              <span className="inline-block h-7 w-12 rounded bg-silver-100 animate-pulse" aria-hidden />
            ) : (
              item.value
            )}
          </dd>
        </div>
      ))}
    </dl>
  );
}
