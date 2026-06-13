import { useMemo, useSyncExternalStore } from 'react';
import type {
  MarketplaceFeedItem,
  MarketplaceVehicleCard,
} from '../../../lib/api.ts';
import { formatDistanceAway, formatLocation, formatPrice, formatUsage, vehicleHeading } from '../../../lib/display.ts';
import { listingHref, sellerHref } from '../../../lib/routes.ts';
import { useCategoryId, useCategorySchema, useCategorySlug } from '../../../contexts/CategoryContext.tsx';
import { useTrackVisibleMarketplaceItem } from '../../../hooks/useTrackVisibleMarketplaceItem.ts';
import {
  getCompareServerSnapshot,
  getCompareSnapshot,
  MAX_COMPARE,
  subscribeCompare,
  toggleCompare,
} from '../../../features/listings/listingCompare.ts';
import type { CategorySchema } from '@auto-dealer/category-schemas';
import { ConditionBadge } from '../badges/ConditionBadge.tsx';
import { FeedMediaCarousel } from '../../ui/FeedMediaCarousel.tsx';
import { FavoriteButton } from '../../../features/favorites/FavoriteButton.tsx';
import { AvailabilityBadge } from '../badges/AvailabilityBadge.tsx';
import { NewArrivalBadge } from '../badges/NewArrivalBadge.tsx';
import { FulfillmentBadge } from '../badges/FulfillmentBadge.tsx';
import { PriceDropBadge } from '../badges/PriceDropBadge.tsx';
import {
  buildListingCardMetaLabels,
  buildListingFilterConfig,
  type ListingFilterConfig,
} from '../../../features/listings/listingFilterConfig.ts';
import { buildCompareItemFromCard } from '../../../features/listings/listingCompareItem.ts';
import { isCompareEnabled } from '../../../features/listings/listingCompareFields.ts';

type FeedItemProps = {
  item: MarketplaceFeedItem;
  index: number;
  compact?: boolean;
  onQuickView?: (listingId: string) => void;
};

export function FeedItemCard({ item, index, compact = false, onQuickView }: FeedItemProps) {
  if (item.type === 'vehicle') return <VehicleFeedCard item={item} index={index} compact={compact} onQuickView={onQuickView} />;
  if (item.type === 'dealerPromo') return <DealerPromoFeedCard item={item} />;
  return <MarketplaceNoticeFeedCard item={item} />;
}

type CardSharedProps = {
  card: MarketplaceVehicleCard;
  slug: string;
  schema: CategorySchema;
  filterConfig: ListingFilterConfig;
  metaLabels: ReturnType<typeof buildListingCardMetaLabels>;
  articleRef: React.Ref<HTMLElement>;
  title: string;
  location: string;
  showCompare: boolean;
  inCompare: boolean;
  compareDisabled: boolean;
  canQuickView: boolean;
  index: number;
  onQuickView?: (listingId: string) => void;
};

function VehicleFeedCard({
  item,
  index,
  compact,
  onQuickView,
}: {
  item: Extract<MarketplaceFeedItem, { type: 'vehicle' }>;
  index: number;
  compact: boolean;
  onQuickView?: (listingId: string) => void;
}) {
  const card = item.vehicle;
  const slug = useCategorySlug();
  const categoryId = useCategoryId();
  const schema = useCategorySchema();
  const filterConfig = useMemo(() => buildListingFilterConfig(slug, schema), [slug, schema]);
  const metaLabels = useMemo(() => buildListingCardMetaLabels(schema, filterConfig), [schema, filterConfig]);
  const articleRef = useTrackVisibleMarketplaceItem<HTMLElement>({
    type: item.type,
    impressionKey: item.impressionKey,
    listingId: card.listingId,
    category: categoryId,
  });
  const title = vehicleHeading(card);
  const location = formatLocation(card.dealerCity, card.dealerState) ?? '';
  const showCompare = isCompareEnabled(filterConfig);
  const compareItems = useSyncExternalStore(subscribeCompare, getCompareSnapshot, getCompareServerSnapshot);
  const inCompare = compareItems.some(i => i.listingId === card.listingId);
  const compareDisabled = !inCompare && compareItems.length >= MAX_COMPARE;
  const canQuickView = Boolean(onQuickView);

  const shared: CardSharedProps = {
    card, slug, schema, filterConfig, metaLabels, articleRef,
    title, location, showCompare, inCompare, compareDisabled, canQuickView, index, onQuickView,
  };

  if (compact) return <VehicleFeedCardCompact {...shared} />;
  return <VehicleFeedCardGrid {...shared} />;
}

function VehicleFeedCardCompact({
  card, slug, schema, articleRef, title, location,
  showCompare, inCompare, compareDisabled, canQuickView, index, onQuickView,
}: CardSharedProps) {
  return (
    <article ref={articleRef} className="group mp-card flex flex-row gap-3 p-3 transition hover:border-navy-500/40 hover:shadow-elevation-2 sm:gap-4 sm:p-4">
      <a href={listingHref(slug, card.listingId, title)} className="mp-focus shrink-0 overflow-hidden rounded-lg w-24 h-20 sm:w-32 sm:h-24 bg-surface-inset">
        {card.mediaUrls[0]
          ? <img src={card.mediaUrls[0]} alt={title} className="h-full w-full object-cover" loading={index < 6 ? 'eager' : 'lazy'} decoding="async" />
          : <div className="h-full w-full" />}
      </a>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <a href={listingHref(slug, card.listingId, title)} className="mp-focus min-w-0 text-sm font-semibold leading-snug text-ink-heading hover:text-cta line-clamp-2">
            {title}
          </a>
          <FavoriteButton listingId={card.listingId} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <AvailabilityBadge schema={schema} status={card.availabilityStatus} />
          <PriceDropBadge originalPriceCents={card.originalPriceCents} priceCents={card.priceCents} />
        </div>
        <p className="mt-1 text-base font-bold tabular-nums text-ink">{formatPrice(card.priceCents)}</p>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-ink-muted">
          {card.mileage > 0 && <span>{formatUsage(card.mileage, card.usageUnit === 'hours' ? 'hours' : 'miles')}</span>}
          {card.unitType && <span>{card.unitType}</span>}
          {card.lengthFt != null && <span>{card.lengthFt} ft</span>}
          <span>{card.condition}</span>
          {card.distanceMiles != null && (
            <span data-testid="card-distance">{formatDistanceAway(card.distanceMiles)}</span>
          )}
          {location && <span>{location}</span>}
        </div>
        <a href={sellerHref(slug, card.dealerId)} className="mp-focus mt-1 block truncate text-xs text-ink-body hover:text-cta">
          {card.dealerName}
        </a>
        {(showCompare || canQuickView) && (
          <div className="mt-2 flex flex-wrap gap-2">
            <CompareButton card={card} slug={slug} title={title} inCompare={inCompare} compareDisabled={compareDisabled} show={showCompare} size="sm" />
            {canQuickView && (
              <button type="button" onClick={() => onQuickView?.(card.listingId)} className="mp-focus rounded-lg border border-silver-200 bg-white px-2.5 py-1 text-xs font-semibold text-ink-muted hover:text-ink">
                Quick view
              </button>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function VehicleFeedCardGrid({
  card, slug, schema, articleRef, title, location, metaLabels,
  showCompare, inCompare, compareDisabled, canQuickView, index, onQuickView,
}: CardSharedProps) {
  return (
    <article ref={articleRef} className="group mp-card flex h-full flex-col transition hover:border-navy-500/40 hover:shadow-elevation-3">
      <div className="relative">
        <a href={listingHref(slug, card.listingId, title)} className="mp-focus block rounded-t-xl">
          <FeedMediaCarousel mediaItems={card.mediaItems} fallbackImageUrls={card.mediaUrls} alt={title} eager={index < 6} />
        </a>
        <div className="absolute right-2 top-2 z-10">
          <FavoriteButton listingId={card.listingId} />
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="space-y-2">
          <div className="flex items-start justify-between gap-3">
            <a href={listingHref(slug, card.listingId, title)} className="mp-focus min-w-0 text-lg font-semibold leading-snug text-ink-heading hover:text-cta">
              {title}
            </a>
            <ConditionBadge condition={card.condition} className="shrink-0" />
          </div>
          {card.trim && <p className="text-sm leading-snug text-ink-muted">{card.trim}</p>}
          <div className="flex flex-wrap items-center gap-1.5">
            <AvailabilityBadge schema={schema} status={card.availabilityStatus} />
            <NewArrivalBadge listedAt={card.listedAt} />
            <PriceDropBadge originalPriceCents={card.originalPriceCents} priceCents={card.priceCents} />
          </div>
        </div>

        <VehicleMeta card={card} location={location} metaLabels={metaLabels} />

        <div className="mt-auto border-t border-silver-200 pt-4">
          <FulfillmentBadge schema={schema} className="mb-2" />
          <p className="mp-label text-ink-faint">Seller</p>
          <a href={sellerHref(slug, card.dealerId)} className="mp-focus mt-1 block text-sm font-semibold text-ink-body hover:text-cta">
            {card.dealerName}
          </a>
          {card.distanceMiles != null && (
            <p className="mt-1 text-xs text-ink-muted" data-testid="card-distance">
              {formatDistanceAway(card.distanceMiles)}
            </p>
          )}
          {location && <p className="mt-1 text-xs text-ink-muted">{location}</p>}
          {(showCompare || canQuickView) && (
            <div className="mt-3 flex flex-wrap gap-2">
              {canQuickView && (
                <button type="button" onClick={() => onQuickView?.(card.listingId)} className="mp-focus rounded-lg border border-silver-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-muted hover:text-ink">
                  Quick view
                </button>
              )}
              <CompareButton card={card} slug={slug} title={title} inCompare={inCompare} compareDisabled={compareDisabled} show={showCompare} size="md" />
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

function CompareButton({
  card, slug, title, inCompare, compareDisabled, show, size,
}: {
  card: MarketplaceVehicleCard;
  slug: string;
  title: string;
  inCompare: boolean;
  compareDisabled: boolean;
  show: boolean;
  size: 'sm' | 'md';
}) {
  if (!show) return null;
  const padding = size === 'sm' ? 'px-2.5 py-1' : 'px-3 py-1.5';
  return (
    <button
      type="button"
      disabled={compareDisabled}
      onClick={() => toggleCompare(buildCompareItemFromCard(card, slug, title))}
      className={[
        `mp-focus rounded-lg border ${padding} text-xs font-semibold`,
        inCompare
          ? 'border-navy-700 bg-navy-700 text-white'
          : compareDisabled
            ? 'cursor-not-allowed border-silver-200 bg-silver-100 text-ink-muted'
            : 'border-silver-200 bg-white text-ink-muted hover:text-ink',
      ].join(' ')}
      aria-pressed={inCompare}
      aria-label={inCompare ? `Remove ${title} from compare` : `Add ${title} to compare`}
    >
      {inCompare ? 'Comparing' : compareDisabled ? 'Max reached' : 'Compare'}
    </button>
  );
}

function VehicleMeta({
  card,
  location,
  metaLabels,
}: {
  card: MarketplaceVehicleCard;
  location: string;
  metaLabels: ReturnType<typeof buildListingCardMetaLabels>;
}) {
  const usageUnit = card.usageUnit === 'hours' ? 'hours' : card.usageUnit === 'miles' ? 'miles' : undefined;
  return (
    <div className="grid grid-cols-2 gap-3 rounded-lg bg-surface-inset p-3">
      <div className="col-span-2">
        <p className="mp-label text-ink-faint">Price</p>
        <p className="text-2xl font-bold tabular-nums text-ink">{formatPrice(card.priceCents)}</p>
        {card.originalPriceCents != null && card.originalPriceCents > card.priceCents && (
          <p className="mt-1 text-xs text-ink-muted line-through">{formatPrice(card.originalPriceCents)}</p>
        )}
      </div>
      <MetaCell label={metaLabels.year} value={String(card.year)} />
      {metaLabels.usage && (
        <MetaCell label={metaLabels.usage} value={formatUsage(card.mileage, usageUnit)} />
      )}
      <MetaCell label={metaLabels.brand} value={card.make} />
      <MetaCell label={metaLabels.model} value={card.model} />
      {metaLabels.unitType && card.unitType && (
        <MetaCell label={metaLabels.unitType} value={card.unitType} className="col-span-2" />
      )}
      {card.lengthFt != null && (
        <MetaCell label="Length" value={`${card.lengthFt} ft`} className="col-span-2" />
      )}
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
