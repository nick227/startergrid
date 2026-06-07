import type { ReportRangePreset } from '@/lib/reportsCatalog.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { reportRangeLabel } from '@/lib/reportCopy.ts';

const LIVE_PRESETS: ReportRangePreset[] = ['7d', '30d', '90d'];

type Props = {
  value: ReportRangePreset;
  snapshotOnly?: boolean;
  onChange: (range: ReportRangePreset) => void;
};

export function ReportTimeRangeBar({ value, snapshotOnly, onChange }: Props) {
  if (snapshotOnly) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-semibold text-ink-muted">Time range</span>
        <span className="inline-flex items-center px-3 py-1.5 rounded-md text-xs font-semibold bg-navy-950 text-white">
          {reportRangeLabel('now')}
        </span>
        <span className="text-xs text-ink-faint">{operatorCopy.reports.snapshotOnlyHint}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-xs font-semibold text-ink-muted">Time range</span>
      <div
        className="inline-flex flex-wrap gap-1 rounded-lg border border-silver-200 bg-surface-inset/50 p-1"
        role="group"
        aria-label="Report time range"
      >
        {LIVE_PRESETS.map(preset => {
          const active = value === preset;
          return (
            <button
              key={preset}
              type="button"
              onClick={() => onChange(preset)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors focus-ring ${
                active
                  ? 'bg-navy-950 text-white shadow-sm'
                  : 'text-ink-muted hover:text-ink-heading hover:bg-surface-card'
              }`}
            >
              {reportRangeLabel(preset)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
