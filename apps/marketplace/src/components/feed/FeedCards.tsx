import type {
  MarketplaceFeedItem,
  MarketplaceVehicleCard,
} from '../../lib/api.ts';
import { formatLocation, formatPrice, formatUsage, vehicleHeading } from '../../lib/display.ts';
import { listingHref, sellerHref } from '../../lib/routes.ts';
import { useCategoryId, useCategorySchema, useCategorySlug } from '../../contexts/CategoryContext.tsx';
import { useTrackVisibleMarketplaceItem } from '../../hooks/useTrackVisibleMarketplaceItem.ts';
import { ConditionBadge } from '../ui/ConditionBadge.tsx';
import { FeedMediaCarousel } from '../ui/FeedMediaCarousel.tsx';
import { FavoriteButton } from '../ui/FavoriteButton.tsx';

type FeedItemProps = {
  item: MarketplaceFeedItem;
  index: number;
};

export function FeedItemCard({ item, index }: FeedItemProps) {
  if (item.type === 'vehicle') return <VehicleFeedCard item={item} index={index} />;
  if (item.type === 'dealerPromo') return <DealerPromoFeedCard item={item} />;
  return <MarketplaceNoticeFeedCard item={item} />;
}

function VehicleFeedCard({
  item,
  index,
}: {
  item: Extract<MarketplaceFeedItem, { type: 'vehicle' }>;
  index: number;
}) {
  const card = item.vehicle;
  const slug = useCategorySlug();
  const categoryId = useCategoryId();
  const schema = useCategorySchema();
  const usageLabel = schema.fields.find(field => field.key === 'mileage')?.label ?? 'Mileage';
  const ref = useTrackVisibleMarketplaceItem<HTMLElement>({
    type: item.type,
    impressionKey: item.impressionKey,
    listingId: card.listingId,
    category: categoryId,
  });
  const title = vehicleHeading(card);
  const location = formatLocation(card.dealerCity, card.dealerState);

  return (
    <article ref={ref} className="group mp-card flex h-full flex-col transition hover:border-navy-500/40 hover:shadow-elevation-3">
      <div className="relative">
        <a href={listingHref(slug, card.listingId)} className="mp-focus block rounded-t-xl">
          <FeedMediaCarousel
            mediaItems={card.mediaItems}
            fallbackImageUrls={card.mediaUrls}
            alt={title}
            eager={index < 6}
          />
        </a>
        <div className="absolute right-2 top-2 z-10">
          <FavoriteButton listingId={card.listingId} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <a href={listingHref(slug, card.listingId)} className="mp-focus min-w-0 text-lg font-semibold leading-snug text-ink-heading hover:text-cta">
              {title}
            </a>
            <ConditionBadge condition={card.condition} className="shrink-0" />
          </div>
          {card.trim && <p className="text-sm leading-snug text-ink-muted">{card.trim}</p>}
        </div>

        <VehicleMeta card={card} location={location ?? ''} usageLabel={usageLabel} />

        <div className="mt-auto border-t border-silver-200 pt-4">
          <p className="mp-label text-ink-faint">Seller</p>
          <a href={sellerHref(slug, card.dealerId)} className="mp-focus mt-1 block text-sm font-semibold text-ink-body hover:text-cta">
            {card.dealerName}
          </a>
          {location && <p className="mt-1 text-xs text-ink-muted">{location}</p>}
        </div>
      </div>
    </article>
  );
}

function VehicleMeta({
  card,
  location,
  usageLabel,
}: {
  card: MarketplaceVehicleCard;
  location: string;
  usageLabel: string;
}) {
  const usageUnit = card.usageUnit === 'hours' ? 'hours' : card.usageUnit === 'miles' ? 'miles' : undefined;
  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-inset p-3">
      <div className="col-span-2">
        <p className="mp-label text-ink-faint">Price</p>
        <p className="text-2xl font-bold tabular-nums text-ink">{formatPrice(card.priceCents)}</p>
      </div>
      <MetaCell label="Year" value={String(card.year)} />
      <MetaCell label={usageLabel} value={formatUsage(card.mileage, usageUnit)} />
      <MetaCell label="Make" value={card.make} />
      <MetaCell label="Model" value={card.model} />
      {location && <MetaCell label="Location" value={location} className="col-span-2" />}
    </div>
  );
}

function MetaCell({ label, value, className = '' }: { label: string; value: string; className?: string }) {
  return (
    <div className={className}>
      <p className="mp-label text-ink-faint">{label}</p>
      <p className="mt-0.5 truncate text-sm font-semibold text-ink-body">{value}</p>
    </div>
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
