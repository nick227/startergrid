import type { VehiclePerformanceItem, PlatformPerformanceItem, VehicleReadinessItem } from '@/lib/types.ts';
import type { PlatformCoverageRow } from '@/lib/reportPresentation.ts';
import { reportAssetTitle, reportPlatformTitle } from '@/lib/reportRowPresentation.ts';
import { readinessRowTitle, readinessStatusVisual } from '@/lib/reportPresentation.ts';

export function MiniAssetRow({ item, valueLabel, onClick }: { item: VehiclePerformanceItem; valueLabel: string | number; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between py-2 text-sm text-left hover:bg-surface-inset/50 px-2 -mx-2 rounded transition-colors group"
    >
      <span className="text-ink-heading font-medium truncate pr-4 group-hover:text-navy-700">{reportAssetTitle(item)}</span>
      <span className="text-ink-muted shrink-0 tabular-nums font-semibold">{valueLabel}</span>
    </button>
  );
}

export function MiniPlatformRow({ item, valueLabel, onClick }: { item: PlatformPerformanceItem; valueLabel: string | number; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between py-2 text-sm text-left hover:bg-surface-inset/50 px-2 -mx-2 rounded transition-colors group"
    >
      <span className="text-ink-heading font-medium truncate pr-4 group-hover:text-navy-700">{reportPlatformTitle(item)}</span>
      <span className="text-ink-muted shrink-0 tabular-nums font-semibold">{valueLabel}</span>
    </button>
  );
}

export function MiniCoverageRow({ item, valueLabel, onClick }: { item: PlatformCoverageRow; valueLabel: string | number; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between py-2 text-sm text-left hover:bg-surface-inset/50 px-2 -mx-2 rounded transition-colors group"
    >
      <span className="text-ink-heading font-medium truncate pr-4 group-hover:text-navy-700">{reportPlatformTitle(item as any)}</span>
      <span className="text-ink-muted shrink-0 tabular-nums font-semibold">{valueLabel}</span>
    </button>
  );
}

export function MiniIssueRow({ item, onClick }: { item: VehicleReadinessItem; onClick?: () => void }) {
  const status = readinessStatusVisual(item);
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center justify-between py-2 text-sm text-left hover:bg-surface-inset/50 px-2 -mx-2 rounded transition-colors group"
    >
      <span className="text-ink-heading font-medium truncate pr-4 group-hover:text-navy-700">{readinessRowTitle(item)}</span>
      <span className={`shrink-0 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${status.pill}`}>
        {status.label}
      </span>
    </button>
  );
}

export function MiniGenericRow({ label, value, onClick }: { label: string; value: string | number; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`w-full flex items-center justify-between py-2 text-sm text-left px-2 -mx-2 rounded transition-colors group ${onClick ? 'hover:bg-surface-inset/50 cursor-pointer' : ''}`}
    >
      <span className={`text-ink-heading font-medium truncate pr-4 ${onClick ? 'group-hover:text-navy-700' : ''}`}>{label}</span>
      <span className="text-ink-muted shrink-0 tabular-nums font-semibold">{value}</span>
    </button>
  );
}
