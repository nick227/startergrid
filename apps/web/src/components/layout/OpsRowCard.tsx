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
  onTitleClick?: () => void;
  actions?: OpsRowAction[];
  surfaceClassName?: string;
  ctaNode?: React.ReactNode;
  logoNode?: React.ReactNode;
  subtitleLine?: string | null;
  healthLine?: string | null;
  inlineContent?: React.ReactNode;
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
  onTitleClick,
  actions,
  surfaceClassName,
  ctaNode,
  logoNode,
  subtitleLine,
  healthLine,
  inlineContent,
}: Props) {
  return (
    <article
      className={`surface-card-operator p-4 transition-colors ${surfaceClassName ?? ''} ${
        detailOpen ? 'ring-2 ring-navy-500/40 border-navy-500/30' : ''
      } ${selected ? 'border-orange-300/60' : ''}`}
    >
      <div className="flex gap-3 items-start">
        {selectable && (
          <div className="pt-1 shrink-0">
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

        {logoNode && <div className="pt-0.5 shrink-0">{logoNode}</div>}

        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Header: title + badge on left, CTA on right */}
          <div className="flex items-start gap-3">
            <div className="flex flex-wrap items-center gap-2 min-w-0 flex-1">
              {onTitleClick ? (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); onTitleClick(); }}
                  className="text-sm font-semibold text-ink-heading hover:text-orange-600 hover:underline text-left"
                >
                  {title}
                </button>
              ) : (
                <h3 className="text-sm font-semibold text-ink-heading">{title}</h3>
              )}
              <span className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-bold border ${statusClassName}`}>
                {statusLabel}
              </span>
            </div>
            {ctaNode && <div className="shrink-0">{ctaNode}</div>}
          </div>

          {subtitleLine && (
            <p className="text-xs text-ink-body leading-snug">{subtitleLine}</p>
          )}

          <p className="text-xs text-ink-muted leading-snug">{secondaryMeta}</p>

          {healthLine && (
            <p className="text-xs text-green-700 font-medium">{healthLine}</p>
          )}

          {desktopFields && desktopFields.length > 0 && (
            <dl className="grid grid-cols-2 xl:grid-cols-4 gap-x-4 gap-y-1.5 pt-1.5 border-t border-silver-100">
              {desktopFields.map(field => (
                <div key={field.label} className="min-w-0">
                  <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{field.label}</dt>
                  <dd className="text-xs text-ink-body truncate tabular-nums">{field.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {inlineContent}

          {actions && actions.length > 0 && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 pt-0.5">
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
          )}
        </div>
      </div>
    </article>
  );
}

/** @deprecated Use OpsRowCard */
export const AssetRowCard = OpsRowCard;
export type { OpsRowAction as AssetRowAction };
