import type { ReactNode } from 'react';

type Props = {
  lead: ReactNode;
  statusLabel: string;
  statusClassName: string;
  meta?: string;
  actionLabel?: string;
  onAction?: (e: React.MouseEvent) => void;
  onPress?: () => void;
  selected?: boolean;
};

export function OperationalRowCard({
  lead,
  statusLabel,
  statusClassName,
  meta,
  actionLabel,
  onAction,
  onPress,
  selected,
}: Props) {
  return (
    <article
      role={onPress ? 'button' : undefined}
      tabIndex={onPress ? 0 : undefined}
      onClick={onPress}
      onKeyDown={onPress ? e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPress(); } } : undefined}
      className={`surface-card-operator p-4 transition-colors ${
        onPress ? 'cursor-pointer hover:border-navy-500/30 hover:shadow-elevation-2' : ''
      } ${selected ? 'ring-2 ring-navy-500/40 border-navy-500/30' : ''}`}
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <div className="text-sm font-semibold text-ink-heading min-w-0">{lead}</div>
            <span className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold border ${statusClassName}`}>
              {statusLabel}
            </span>
          </div>
          {meta && <p className="text-xs text-ink-muted leading-snug">{meta}</p>}
        </div>
        {actionLabel && onAction && (
          <button
            type="button"
            onClick={e => { e.stopPropagation(); onAction(e); }}
            className="text-xs font-bold text-orange-600 hover:underline shrink-0 self-start"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </article>
  );
}
