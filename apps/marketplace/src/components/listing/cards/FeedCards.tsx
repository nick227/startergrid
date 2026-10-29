import type { MarketplaceFeedItem } from '../../../lib/api.ts';
import { formatDistanceAway, formatLocation, formatPrice } from '../../../lib/display.ts';
import { listingHref } from '../../../lib/routes.ts';
import { useCategoryId, useCategorySlug, useCategorySchema } from '../../../contexts/CategoryContext.tsx';
import { useTrackVisibleMarketplaceItem } from '../../../hooks/useTrackVisibleMarketplaceItem.ts';
import { isNewArrival, NEW_ARRIVAL_LABEL } from '../../../features/listings/listingBadges.ts';
import { FeedMediaCarousel } from '../../ui/FeedMediaCarousel.tsx';
import { fromVehicleCard, type ConsumerListingCard } from '../../../lib/listingReadModel.ts';
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
  const schema = useCategorySchema();
  const slug = useCategorySlug();
  return <MarketplaceProductCard card={fromVehicleCard(item.vehicle, schema, slug)} index={index} compact={compact} impressionKey={item.impressionKey} />;
}

/** Shared product container for Browse and seller storefront inventory. */
export function MarketplaceProductCard({ card, index = 0, compact = false, impressionKey }: {
  card: ConsumerListingCard;
  index?: number;
  compact?: boolean;
  impressionKey?: string;
}) {
  const categoryId = useCategoryId();
  const articleRef = useTrackVisibleMarketplaceItem<HTMLElement>({
    type: 'vehicle',
    impressionKey: impressionKey ?? `storefront:${card.identity.source}:${card.listingId}`,
    listingId: card.listingId,
    category: categoryId,
  });
  const title = card.title;
  const location = formatLocation(card.sellerCity ?? null, card.sellerState ?? null) ?? '';
  const href = listingHref(card.categorySlug, card.listingId, title);
  const dropped = card.originalPriceCents != null && card.originalPriceCents > card.priceCents;
  const recent = isNewArrival(card.listedAt);

  if (compact) {
    return (
      <article ref={articleRef} className="group mp-card flex gap-3 p-2.5 transition hover:border-silver-300 hover:shadow-elevation-2">
        <a href={href} className="mp-focus h-[4.75rem] w-[7.25rem] shrink-0 overflow-hidden rounded-lg bg-[#e8eef3]">
          {card.mediaUrls[0]
            ? <img src={card.mediaUrls[0]} alt={title} className="h-full w-full object-contain p-1.5" loading={index < 6 ? 'eager' : 'lazy'} decoding="async" />
            : <div className="h-full w-full" />}
        </a>
        <div className="min-w-0 flex-1 py-0.5">
          <div className="flex items-start justify-between gap-2">
            <a href={href} className="mp-focus min-w-0 truncate text-sm font-semibold text-ink-heading hover:text-cta">
              {title}
            </a>
            <FavoriteButton listingId={card.listingId} />
          </div>
          <VehicleSpec card={card} />
          <VehiclePrice card={card} />
          <VehicleFacts location={location} distanceMiles={card.distanceMiles} />
        </div>
      </article>
    );
  }

  return (
    <article ref={articleRef} className="group mp-card min-w-0 flex h-full flex-col transition hover:border-silver-300 hover:shadow-elevation-2">
      <div className="relative">
        <FeedMediaCarousel mediaItems={card.rawVehicle?.mediaItems ?? []} fallbackImageUrls={card.mediaUrls} alt={title} eager={index < 6} href={href} />
        {(dropped || recent) && (
          <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-wrap gap-1.5">
            {recent && <span className="mp-thumb-badge bg-navy-800">{NEW_ARRIVAL_LABEL}</span>}
            {dropped && <span className="mp-thumb-badge bg-emerald-700">New price</span>}
          </div>
        )}
        <div className="absolute right-3 top-3 z-10">
          <FavoriteButton listingId={card.listingId} />
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 px-3.5 pb-3.5 pt-3">
        <a href={href} className="mp-focus line-clamp-2 text-[15px] font-semibold leading-snug text-ink-heading hover:text-cta">
          {title}
        </a>
        <VehicleSpec card={card} />
        <VehiclePrice card={card} />
        <VehicleFacts location={location} distanceMiles={card.distanceMiles} />
      </div>
    </article>
  );
}

function VehicleSpec({ card }: { card: ConsumerListingCard }) {
  const usage = card.primarySpec?.value ?? null;
  const spec = [card.subtitle, usage].filter(Boolean).join(' · ');
  if (!spec) return null;
  return <p className="truncate text-sm text-ink-muted">{spec}</p>;
}

function VehiclePrice({ card }: { card: ConsumerListingCard }) {
  const previous = card.originalPriceCents;
  const dropped = previous != null && previous > card.priceCents;
  return (
    <p className="flex flex-wrap items-baseline gap-2">
      <span className="text-lg font-bold tabular-nums tracking-tight text-ink">{formatPrice(card.priceCents)}</span>
      {dropped && previous != null && (
        <span className="text-xs text-ink-muted line-through">{formatPrice(previous)}</span>
      )}
    </p>
  );
}

function VehicleFacts({ location, distanceMiles }: { location: string; distanceMiles?: number | null }) {
  const distance = distanceMiles != null ? formatDistanceAway(distanceMiles) : null;
  if (!location && !distance) return null;
  return (
    <p className="truncate text-xs text-ink-muted">
      {location || null}
      {distance && (
        <>
          {location ? ' · ' : null}
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
        <span className="w-fit rounded-md bg-orange-50 px-2 py-1 text-[11px] font-semibold text-orange-700">
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
