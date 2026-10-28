import type { MarketplaceFeedItem, MarketplaceVehicleCard } from '../../../lib/api.ts';
import { formatDistanceAway, formatLocation, formatPrice, formatUsage, vehicleHeading } from '../../../lib/display.ts';
import { listingHref } from '../../../lib/routes.ts';
import { useCategoryId, useCategorySlug } from '../../../contexts/CategoryContext.tsx';
import { useTrackVisibleMarketplaceItem } from '../../../hooks/useTrackVisibleMarketplaceItem.ts';
import { FeedMediaCarousel } from '../../ui/FeedMediaCarousel.tsx';
import { FavoriteButton } from '../../../features/favorites/FavoriteButton.tsx';

type FeedItemProps = {
  item: MarketplaceFeedItem;
  index: number;
  compact?: boolean;
};

export function FeedItemCard({ item, index, compact = false }: FeedItemProps) {
  if (item.type === 'vehicle') return <VehicleFeedCard item={item} index={index} compact={compact} />;
  if (item.type === 'dealerPromo') return <DealerPromoFeedCard item={item} />;
  return <MarketplaceNoticeFeedCard item={item} />;
}

function VehicleFeedCard({
  item,
  index,
  compact,
}: {
  item: Extract<MarketplaceFeedItem, { type: 'vehicle' }>;
  index: number;
  compact: boolean;
}) {
  const card = item.vehicle;
  const slug = useCategorySlug();
  const categoryId = useCategoryId();
  const articleRef = useTrackVisibleMarketplaceItem<HTMLElement>({
    type: item.type,
    impressionKey: item.impressionKey,
    listingId: card.listingId,
    category: categoryId,
  });
  const title = vehicleHeading(card);
  const location = formatLocation(card.dealerCity, card.dealerState) ?? '';
  const href = listingHref(slug, card.listingId, title);

  if (compact) {
    return (
      <article ref={articleRef} className="group mp-card flex gap-3 p-2.5 transition hover:border-navy-500/40 hover:shadow-elevation-2">
        <a href={href} className="mp-focus h-20 w-28 shrink-0 overflow-hidden rounded-lg bg-surface-inset">
          {card.mediaUrls[0]
            ? <img src={card.mediaUrls[0]} alt={title} className="h-full w-full object-cover" loading={index < 6 ? 'eager' : 'lazy'} decoding="async" />
            : <div className="h-full w-full" />}
        </a>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <a href={href} className="mp-focus min-w-0 truncate text-sm font-semibold text-ink-heading hover:text-cta">
              {title}
            </a>
            <FavoriteButton listingId={card.listingId} />
          </div>
          {card.trim && <p className="truncate text-xs text-ink-muted">{card.trim}</p>}
          <VehiclePrice card={card} />
          <VehicleFacts card={card} location={location} />
        </div>
      </article>
    );
  }

  return (
    <article ref={articleRef} className="group mp-card flex h-full flex-col transition hover:border-navy-500/40 hover:shadow-elevation-2">
      <div className="relative">
        <a href={href} className="mp-focus block">
          <FeedMediaCarousel mediaItems={card.mediaItems} fallbackImageUrls={card.mediaUrls} alt={title} eager={index < 6} />
        </a>
        <div className="absolute right-2 top-2 z-10">
          <FavoriteButton listingId={card.listingId} />
        </div>
      </div>
      <div className="flex flex-col gap-0.5 px-3 py-2.5">
        <a href={href} className="mp-focus line-clamp-2 text-sm font-semibold leading-snug text-ink-heading hover:text-cta">
          {title}
        </a>
        {card.trim && <p className="truncate text-xs text-ink-muted">{card.trim}</p>}
        <VehiclePrice card={card} />
        <VehicleFacts card={card} location={location} />
      </div>
    </article>
  );
}

function VehiclePrice({ card }: { card: MarketplaceVehicleCard }) {
  const previous = card.originalPriceCents;
  const dropped = previous != null && previous > card.priceCents;
  return (
    <p className="flex items-baseline gap-2">
      <span className="text-base font-bold tabular-nums text-ink">{formatPrice(card.priceCents)}</span>
      {dropped && previous != null && (
        <span className="text-xs text-ink-muted line-through">{formatPrice(previous)}</span>
      )}
    </p>
  );
}

function VehicleFacts({ card, location }: { card: MarketplaceVehicleCard; location: string }) {
  const usage = card.mileage > 0
    ? formatUsage(card.mileage, card.usageUnit === 'hours' ? 'hours' : 'miles')
    : null;
  const distance = card.distanceMiles != null ? formatDistanceAway(card.distanceMiles) : null;
  if (!usage && !location && !distance) return null;
  return (
    <p className="truncate text-xs text-ink-muted">
      {usage}
      {usage && (location || distance) ? ' · ' : null}
      {location || null}
      {distance && (
        <>
          {(usage || location) ? ' · ' : null}
          <span data-testid="card-distance">{distance}</span>
        </>
      )}
    </p>
  );
}

function DealerPromoFeedCard({ item }: { item: Extract<MarketplaceFeedItem, { type: 'dealerPromo' }> }) {
  const ref = useTrackVisibleMarketplaceItem<HTMLElement>({ type: item.type, impressionKey: item.impressionKey });
  return (
    <article ref={ref} className="mp-card flex h-full flex-col border-orange-100 bg-white transition hover:shadow-elevation-3">
      {item.promo.mediaUrl && (
        <div className="mp-aspect-vehicle overflow-hidden rounded-lg bg-surface-inset">
          <img src={item.promo.mediaUrl} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-4 p-5">
        <span className="w-fit rounded-pill border border-orange-100 bg-orange-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-orange-600">
          Sponsored dealer
        </span>
        <div>
          <h3 className="text-lg font-semibold text-ink-heading">{item.promo.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-body">{item.promo.body}</p>
        </div>
        <a href={item.promo.ctaHref} className="mp-btn-primary mt-auto w-full">
          {item.promo.ctaLabel}
        </a>
      </div>
    </article>
  );
}

function MarketplaceNoticeFeedCard({ item }: { item: Extract<MarketplaceFeedItem, { type: 'marketplaceNotice' }> }) {
  const ref = useTrackVisibleMarketplaceItem<HTMLElement>({ type: item.type, impressionKey: item.impressionKey });
  return (
    <article ref={ref} className="mp-card flex h-full flex-col justify-center border-blue-100 bg-blue-50 p-5">
      <p className="mp-label text-navy-700">Marketplace notice</p>
      <h3 className="mt-2 text-lg font-semibold text-ink-heading">{item.notice.title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-ink-body">{item.notice.body}</p>
    </article>
  );
}
