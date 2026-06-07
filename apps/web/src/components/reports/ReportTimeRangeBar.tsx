import type { ReportRangePreset } from '@/lib/reportsCatalog.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { reportRangeLabel } from '@/lib/reportCopy.ts';

const PRESETS: ReportRangePreset[] = ['now', '7d', '30d', '90d'];

type Props = {
  value: ReportRangePreset;
  snapshotOnly?: boolean;
  onChange: (range: ReportRangePreset) => void;
};

export function ReportTimeRangeBar({ value, snapshotOnly, onChange }: Props) {
  if (snapshotOnly) {
    return (
      <p className="text-xs text-ink-muted mb-4">
        {reportRangeLabel('now')} · {operatorCopy.reports.snapshotOnlyHint}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      <span className="text-xs font-semibold text-ink-muted uppercase tracking-wide">Range</span>
      {PRESETS.map(preset => (
        <button
          key={preset}
          type="button"
          disabled={snapshotOnly}
          onClick={() => onChange(preset)}
          className={`px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors ${
            value === preset
              ? 'bg-navy-950 text-white border-navy-950'
              : 'bg-surface-card-operator text-ink-muted border-silver-200 hover:border-silver-300'
          }`}
        >
          {reportRangeLabel(preset)}
        </button>
      ))}
    </div>
  );
}
