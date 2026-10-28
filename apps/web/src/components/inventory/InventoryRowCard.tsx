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
  mileageLabel: string | null;
  statusLabel: string;
  matchLabel: string | null;
  placeLabel: string | null;
  channelLine: string | null;
  selected?: boolean;
  selectable?: boolean;
  onToggle?: (id: string) => void;
  onClick?: (id: string) => void;
  actions?: ReactNode;
};

function PhotoFrame({ src, title, price }: { src: string | null; title: string; price: string }) {
  return (
    <div className="relative aspect-[4/3] overflow-hidden bg-silver-100">
      {src ? (
        <img src={src} alt={title} className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full items-center justify-center text-xs font-medium text-ink-faint">No photo</div>
      )}
      <span className="absolute bottom-2 left-2 rounded bg-navy-950/85 px-2 py-0.5 text-sm font-semibold text-white">
        {price}
      </span>
    </div>
  );
}

export function InventoryRowCard({
  dealerId, vehicleId, title, stockNumber, priceCents, mediaThumbnail, mediaCount,
  mileageLabel, statusLabel, matchLabel, placeLabel, channelLine,
  selected, selectable, onToggle, onClick, actions,
}: Props) {
  const thumbnail = useVehicleThumbnail(dealerId, vehicleId, mediaThumbnail, mediaCount);

  return (
    <article className={`overflow-hidden rounded-xl border bg-white ${selected ? 'border-navy-500' : 'border-silver-200'}`}>
      <div className="relative">
        {selectable && (
          <input
            type="checkbox"
            checked={!!selected}
            aria-label={`Select ${title}`}
            onChange={() => onToggle?.(vehicleId)}
            onClick={event => event.stopPropagation()}
            className="absolute left-2 top-2 z-10 h-4 w-4 rounded accent-orange-600"
          />
        )}
        <button type="button" onClick={() => onClick?.(vehicleId)} className="block w-full text-left">
          <PhotoFrame src={thumbnail} title={title} price={formatCatalogPrice(priceCents)} />
          <div className="space-y-1 px-3 py-2.5">
            <p className="truncate text-sm font-semibold text-ink-heading">{title}</p>
            <p className="truncate text-xs text-ink-muted">
              <span className="font-mono">#{stockNumber}</span>
              {mileageLabel && <span> · {mileageLabel}</span>}
            </p>
            <span className="inline-flex rounded-full border border-silver-200 bg-silver-100 px-2 py-0.5 text-[10px] font-semibold text-ink-body">
              {statusLabel}
            </span>
            {placeLabel && <p className="text-[11px] text-ink-muted">{placeLabel}</p>}
            {matchLabel && <p className="text-[11px] font-medium text-navy-800">{matchLabel}</p>}
            {channelLine && <p className="truncate text-[11px] text-ink-faint">{channelLine}</p>}
          </div>
        </button>
      </div>
      {actions && <div className="border-t border-silver-100 px-3 py-2.5">{actions}</div>}
    </article>
  );
}
