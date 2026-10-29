import { useEffect, useRef } from 'react';
import type { MarketplaceVehicleCard } from '../../../lib/api.ts';
import { formatDistanceAway, formatPrice, formatLocation } from '../../../lib/display.ts';
import { listingHref, sellerHref } from '../../../lib/routes.ts';
import { useCategoryId, useCategorySlug, useCategorySchema } from '../../../contexts/CategoryContext.tsx';
import { trackMarketplaceEvent, MarketplaceEventType } from '../../../lib/events.ts';
import { ListingImage } from '../../ui/ListingImage.tsx';
import { ConditionBadge } from '../badges/ConditionBadge.tsx';
import { FavoriteButton } from '../../../features/favorites/FavoriteButton.tsx';
import { AvailabilityBadge } from '../badges/AvailabilityBadge.tsx';
import { NewArrivalBadge } from '../badges/NewArrivalBadge.tsx';
import { FulfillmentBadge } from '../badges/FulfillmentBadge.tsx';
import { fromVehicleCard, type ConsumerListingCard } from '../../../lib/listingReadModel.ts';

type Props = {
  card: MarketplaceVehicleCard | ConsumerListingCard;
  onQuickView?: (listingId: string) => void;
};

export function ListingCard({ card, onQuickView }: Props) {
  const slug = useCategorySlug();
  const categoryId = useCategoryId();
  const schema = useCategorySchema();

  const item: ConsumerListingCard = 'identity' in card ? card : fromVehicleCard(card, schema, slug);
  const tracked = useRef(false);
  const location = formatLocation(item.sellerCity ?? null, item.sellerState ?? null);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    trackMarketplaceEvent({
      eventType: MarketplaceEventType.VEHICLE_IMPRESSION,
      listingId: item.listingId,
      category: categoryId,
    });
  }, [item.listingId, categoryId]);

  const targetSlug = item.categorySlug || slug;

  return (
    <article className="group mp-card flex h-full flex-col overflow-hidden transition hover:border-navy-500/40 hover:shadow-elevation-3">
      <div className="relative">
        <a href={listingHref(targetSlug, item.listingId, item.title)} className="mp-focus block">
          <ListingImage src={item.mediaUrls[0]} alt={item.title} />
        </a>
        <div className="absolute right-3 top-3 z-10">
          <FavoriteButton listingId={item.listingId} />
        </div>
      </div>

      <a href={listingHref(targetSlug, item.listingId, item.title)} className="mp-focus block flex-1">
        <div className="space-y-3 p-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold leading-snug text-ink-heading">{item.title}</h3>
            {item.subtitle && <p className="text-sm text-ink-muted">{item.subtitle}</p>}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <AvailabilityBadge schema={schema} status={item.availabilityStatus as any} />
              <NewArrivalBadge listedAt={item.listedAt} />
            </div>
          </div>

          <p className="text-xl font-bold tabular-nums text-ink">
            {formatPrice(item.priceCents)}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
            {item.primarySpec && (
              <>
                <span>{item.primarySpec.value}</span>
                <span className="text-silver-300" aria-hidden="true">·</span>
              </>
            )}
            <ConditionBadge condition={item.condition as any} />
          </div>
        </div>
      </a>

      <div className="border-t border-silver-200 px-4 py-3">
        <FulfillmentBadge schema={schema} className="mb-2" />
        <p className="mp-label text-ink-faint">Seller</p>
        <a
          href={sellerHref(targetSlug, item.sellerId)}
          className="mp-focus mt-0.5 block text-sm font-medium text-ink-body hover:text-cta"
        >
          {item.sellerName}
        </a>
        {item.distanceMiles != null && (
          <p className="mt-0.5 text-xs text-ink-muted" data-testid="card-distance">
            {formatDistanceAway(item.distanceMiles)}
          </p>
        )}
        {location && <p className="mt-0.5 text-xs text-ink-muted">{location}</p>}
        {onQuickView && (
          <button
            type="button"
            onClick={() => onQuickView(item.listingId)}
            className="mp-focus mt-3 rounded-lg border border-silver-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink"
          >
            Quick view
          </button>
        )}
      </div>
    </article>
  );
}
