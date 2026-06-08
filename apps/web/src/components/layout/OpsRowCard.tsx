import type React from 'react';
import type { OpsRowField } from '@/lib/opsRowPresentation.ts';

export type OpsRowAction = {
  label: string;
  onClick: () => void;
};

type Props = {
  title: string;
  statusLabel: string;
  statusClassName: string;
  secondaryMeta: string;
  desktopFields?: OpsRowField[];
  selected?: boolean;
  detailOpen?: boolean;
  selectable?: boolean;
  onSelect?: () => void;
  actions: OpsRowAction[];
  surfaceClassName?: string;
  ctaNode?: React.ReactNode;
};

export function OpsRowCard({
  title,
  statusLabel,
  statusClassName,
  secondaryMeta,
  desktopFields,
  selected,
  detailOpen,
  selectable,
  onSelect,
  actions,
  surfaceClassName,
  ctaNode,
}: Props) {
  return (
    <article
      className={`surface-card-operator p-4 transition-colors ${surfaceClassName ?? ''} ${
        detailOpen ? 'ring-2 ring-navy-500/40 border-navy-500/30' : ''
      } ${selected ? 'border-orange-300/60' : ''}`}
    >
      <div className="flex gap-3">
        {selectable && (
          <div className="pt-0.5 shrink-0">
            <input
              type="checkbox"
              checked={selected ?? false}
              onChange={onSelect}
              onClick={e => e.stopPropagation()}
              className="w-4 h-4 accent-orange-600"
              aria-label={`Select ${title}`}
            />
          </div>
        )}

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-ink-heading min-w-0">{title}</h3>
            <span className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold border ${statusClassName}`}>
              {statusLabel}
            </span>
            {ctaNode}
          </div>

          <p className="text-xs text-ink-muted leading-snug">{secondaryMeta}</p>

          {desktopFields && desktopFields.length > 0 && (
            <dl className="hidden lg:grid lg:grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-1.5 pt-1 border-t border-silver-100">
              {desktopFields.map(field => (
                <div key={field.label} className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{field.label}</dt>
                  <dd className="text-xs text-ink-body truncate tabular-nums">{field.value}</dd>
                </div>
              ))}
            </dl>
          )}

          <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
            {actions.map(action => (
              <button
                key={action.label}
                type="button"
                onClick={e => { e.stopPropagation(); action.onClick(); }}
                className="text-xs font-bold text-orange-600 hover:underline"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

/** @deprecated Use OpsRowCard */
export const AssetRowCard = OpsRowCard;
export type { OpsRowAction as AssetRowAction };
