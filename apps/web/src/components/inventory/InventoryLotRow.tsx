import type { ReactNode } from 'react';
import { formatCatalogPrice } from './browseModel.ts';
import { useVehicleThumbnail } from './useVehicleThumbnail.ts';

type Props = {
  dealerId?: string;
  vehicleId: string;
  title: string;
  stockNumber: string;
  priceCents: number;
  mediaThumbnail: string | null;
  mediaCount: number;
  statusLabel: string;
  matchLabel: string | null;
  placeLabel: string | null;
  selected?: boolean;
  selectable?: boolean;
  onToggle?: (id: string) => void;
  onClick?: (id: string) => void;
  actions?: ReactNode;
};

export function InventoryLotRow({
  dealerId, vehicleId, title, stockNumber, priceCents, mediaThumbnail, mediaCount,
  statusLabel, matchLabel, placeLabel, selected, selectable, onToggle, onClick, actions,
}: Props) {
  const thumbnail = useVehicleThumbnail(dealerId, vehicleId, mediaThumbnail, mediaCount);

  return (
    <article className={`border-b border-silver-100 bg-white px-3 py-3 ${selected ? 'bg-navy-50' : ''}`}>
      <div className="flex items-center gap-3">
        {selectable && (
          <input
            type="checkbox"
            checked={!!selected}
            aria-label={`Select ${title}`}
            onChange={() => onToggle?.(vehicleId)}
            onClick={event => event.stopPropagation()}
            className="h-4 w-4 shrink-0 rounded accent-orange-600"
          />
        )}
        <button type="button" onClick={() => onClick?.(vehicleId)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {thumbnail ? (
            <img src={thumbnail} alt="" className="h-14 w-20 shrink-0 rounded-md object-cover" />
          ) : (
            <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-md bg-silver-100 text-[10px] text-ink-faint">No photo</div>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-ink-heading">{title}</p>
            <p className="truncate font-mono text-xs text-ink-muted">#{stockNumber}</p>
            <p className="truncate text-[11px] text-ink-muted">
              {statusLabel}
              {placeLabel ? ` · ${placeLabel}` : ''}
              {matchLabel ? ` · ${matchLabel}` : ''}
            </p>
          </div>
          <p className="shrink-0 text-sm font-semibold text-ink-heading">{formatCatalogPrice(priceCents)}</p>
        </button>
      </div>
      {actions && <div className="mt-2 pl-7">{actions}</div>}
    </article>
  );
}
