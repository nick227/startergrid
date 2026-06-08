import { useEffect, useRef } from 'react';
import type { MarketplaceVehicleCard } from '../lib/api.ts';
import { formatPrice, formatUsage, formatLocation, vehicleHeading } from '../lib/display.ts';
import { listingHref, sellerHref } from '../lib/routes.ts';
import { useCategoryId, useCategorySlug } from '../contexts/CategoryContext.tsx';
import { trackMarketplaceEvent, MarketplaceEventType } from '../lib/events.ts';
import { VehicleImage } from './ui/VehicleImage.tsx';
import { ConditionBadge } from './ui/ConditionBadge.tsx';
import { FavoriteButton } from './ui/FavoriteButton.tsx';
import { NewArrivalBadge } from './listings/NewArrivalBadge.tsx';
import { FulfillmentBadge } from './listings/FulfillmentBadge.tsx';
import { useCategorySchema } from '../contexts/CategoryContext.tsx';

type Props = {
  card: MarketplaceVehicleCard;
  onQuickView?: (listingId: string) => void;
};

export function VehicleCard({ card, onQuickView }: Props) {
  const slug = useCategorySlug();
  const categoryId = useCategoryId();
  const schema = useCategorySchema();
  const usageUnit = card.usageUnit === 'hours' ? 'hours' : card.usageUnit === 'miles' ? 'miles' : undefined;
  const tracked = useRef(false);
  const location = formatLocation(card.dealerCity, card.dealerState);
  const title = vehicleHeading(card);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackMarketplaceEvent({
      eventType: MarketplaceEventType.VEHICLE_IMPRESSION,
      listingId: card.listingId,
      category: categoryId,
    });
  }, [card.listingId, categoryId]);

  return (
    <article className="group mp-card flex h-full flex-col overflow-hidden transition hover:border-navy-500/40 hover:shadow-elevation-3">
      <div className="relative">
        <a href={listingHref(slug, card.listingId)} className="mp-focus block rounded-t-2xl overflow-hidden">
          <VehicleImage
            src={card.mediaUrls[0]}
            alt={title}
            imgClassName="transition-transform duration-200 group-hover:scale-105"
          />
        </a>
        <div className="absolute right-2 top-2 z-10 flex flex-col items-end gap-2">
          <NewArrivalBadge listedAt={card.listedAt} />
          <FavoriteButton listingId={card.listingId} />
        </div>
        {onQuickView && (
          <button
            type="button"
            onClick={() => onQuickView(card.listingId)}
            className="absolute bottom-2 left-2 z-10 rounded-lg bg-white/90 px-2.5 py-1 text-xs font-semibold text-ink shadow hover:bg-white"
          >
            Quick view
          </button>
        )}
      </div>

      <a href={listingHref(slug, card.listingId)} className="mp-focus block flex-1">
        <div className="space-y-3 p-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold leading-snug text-ink-heading">{title}</h3>
            {card.trim && <p className="text-sm text-ink-muted">{card.trim}</p>}
          </div>

          <p className="text-xl font-bold tabular-nums text-ink">
            {formatPrice(card.priceCents)}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            <span>{formatUsage(card.mileage, usageUnit)}</span>
            <span className="text-silver-300" aria-hidden="true">·</span>
            <ConditionBadge condition={card.condition} />
          </div>
        </div>
      </a>

      <div className="border-t border-silver-200 px-4 py-3">
        <FulfillmentBadge schema={schema} className="mb-2" />
        <p className="mp-label text-ink-faint">Seller</p>
        <a
          href={sellerHref(slug, card.dealerId)}
          className="mp-focus mt-0.5 block text-sm font-medium text-ink-body hover:text-cta"
        >
          {card.dealerName}
        </a>
        {location && <p className="mt-0.5 text-xs text-ink-muted">{location}</p>}
      </div>
    </article>
  );
}
