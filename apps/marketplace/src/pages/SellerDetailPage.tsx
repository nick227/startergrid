import { useState, useMemo } from 'react';
import { useQuery, queryErrorMessage } from '../hooks/useQuery.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { fetchSeller, isNotFoundError } from '../lib/api.ts';
import { formatResultCount, formatPrice } from '../lib/display.ts';
import { getListReturn, saveListReturn } from '../lib/listReturn.ts';
import { MarketplaceEventType } from '../lib/events.ts';
import { useTrackMarketplaceEvent } from '../hooks/useTrackMarketplaceEvent.ts';
import { listHref } from '../lib/routes.ts';
import { useCategoryId, useCategorySchema, useCategorySlug } from '../contexts/CategoryContext.tsx';
import { PageShell } from '../components/layout/PageShell.tsx';
import { MarketplaceProductCard } from '../components/listing/cards/FeedCards.tsx';
import { DealerHero } from '../components/ui/DealerBlock.tsx';
import { ListingGrid } from '../components/ui/ListingGrid.tsx';
import { DealerHeaderSkeleton, SkeletonGrid } from '../components/ui/SkeletonGrid.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { EmptyState } from '../components/ui/EmptyState.tsx';
import { NotFoundState } from '../components/ui/NotFoundState.tsx';
import { LeadInquiryForm } from '../features/leadCapture/LeadInquiryForm.tsx';
import { fromVehicleCard, fromCategoryItemCard, type ConsumerListingCard } from '../lib/listingReadModel.ts';

type Props = { sellerId: string; fromListing?: string };

export default function SellerDetailPage(props: Props) {
  const categoryId = useCategoryId();
  return <SellerStorefront key={`${categoryId}:${props.sellerId}`} {...props} />;
}

function SellerStorefront({ sellerId, fromListing }: Props) {
  const categoryId = useCategoryId();
  const slug = useCategorySlug();
  const schema = useCategorySchema();
  const [selectedListingId, setSelectedListingId] = useState<string | null>(null);

  const { data, loading, error, reload } = useQuery(
    () => fetchSeller(sellerId, categoryId),
    [sellerId, categoryId],
  );
  const backHref = getListReturn(slug);

  const items: ConsumerListingCard[] = useMemo(() => {
    if (!data) return [];
    const list: ConsumerListingCard[] = [];
    if (data.vehicles?.length) {
      for (const v of data.vehicles) {
        list.push(fromVehicleCard(v, schema, slug));
      }
    }
    if (data.categoryItems?.length) {
      for (const item of data.categoryItems) {
        list.push(fromCategoryItemCard(item, schema, slug));
      }
    }
    return list;
  }, [data, schema, slug]);

  const count = items.length;

  usePageMeta(
    data?.dealerName ?? 'Seller',
    data ? `${formatResultCount(count, schema.asset.singular)} on the marketplace` : undefined,
  );
  useTrackMarketplaceEvent(data ? {
    eventType: MarketplaceEventType.DEALER_PAGE_VIEW,
    dealerId: sellerId,
    category: categoryId,
  } : null);

  if (loading && !data) {
    return (
      <PageShell backHref={backHref} backLabel="Back to results">
        <div className="mp-page min-w-0 py-6 sm:py-8">
          <DealerHeaderSkeleton />
          <div className="mt-8">
            <SkeletonGrid count={4} label={`Loading ${schema.asset.plural}`} />
          </div>
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell backHref={backHref} backLabel="Back to results">
        <div className="mp-page min-w-0 py-6 sm:py-8">
          {isNotFoundError(error) ? (
            <NotFoundState
              title="Seller not found"
              description="This seller page is not available on this marketplace."
              backHref={backHref}
              backLabel="Back to results"
            />
          ) : (
            <ErrorState message={queryErrorMessage(error)} onRetry={reload} />
          )}
        </div>
      </PageShell>
    );
  }

  if (!data) return null;

  const activeListingId =
    (items.some(item => item.listingId === selectedListingId) ? selectedListingId : null) ||
    (fromListing && items.some(i => i.listingId === fromListing)
      ? fromListing
      : items[0]?.listingId || null);
  const selectedItem = items.find(i => i.listingId === activeListingId) || items[0] || null;

  return (
    <PageShell backHref={backHref} backLabel="Back to results">
      <div className="mp-page min-w-0 py-6 sm:py-8">
        <DealerHero
          dealerName={data.dealerName}
          city={data.city ?? data.dealerCity}
          state={data.state ?? data.dealerState}
          websiteUrl={data.websiteUrl}
          inquireHref={count > 0 ? '#inquiry' : undefined}
        />

        <section aria-labelledby="storefront-inventory">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 border-b border-silver-200 pb-4">
            <div>
              <h2 id="storefront-inventory" className="mp-section-title">Shop inventory</h2>
              <p className="mt-1 text-sm text-ink-muted">{formatResultCount(count, schema.asset.singular)} on the {schema.label.toLowerCase()} marketplace</p>
            </div>
            <a href={listHref(slug)} className="mp-focus text-sm font-semibold text-cta hover:underline">Browse all {schema.asset.plural} →</a>
          </div>

          {count === 0 ? (
            <EmptyState
              title={`No ${schema.asset.plural} listed right now`}
              description="Check back for new arrivals, or explore listings from other sellers."
              actionLabel={`Browse all ${schema.asset.plural}`}
              onAction={() => {
                saveListReturn(slug, {});
                window.location.hash = listHref(slug).slice(1);
              }}
            />
          ) : (
            <ListingGrid>
              {items.map((card, index) => (
                <MarketplaceProductCard key={`${card.identity.source}:${card.listingId}`} card={card} index={index} />
              ))}
            </ListingGrid>
          )}
        </section>

        {selectedItem && (
          <section id="inquiry" tabIndex={-1} aria-labelledby="storefront-inquiry" className="mt-10 grid scroll-mt-20 gap-6 rounded-2xl border border-silver-200 bg-surface-inset p-4 sm:p-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-10">
            <div className="min-w-0">
              <p className="mp-label mb-2">Contact the seller</p>
              <h2 id="storefront-inquiry" className="break-words text-2xl font-semibold tracking-tight text-ink-heading">Inquire with {data.dealerName}</h2>
              <p className="mt-2 text-sm leading-relaxed text-ink-muted">Ask about availability, details, or next steps. Your inquiry goes directly to the seller. No account required.</p>
              {items.length > 1 && (
                <div className="mt-6">
                  <label htmlFor="inquiry-item" className="mb-2 block text-sm font-semibold text-ink-heading">Item you’re interested in</label>
                  <select id="inquiry-item" className="mp-input" value={selectedItem.listingId} onChange={event => setSelectedListingId(event.target.value)}>
                    {items.map(item => <option key={item.listingId} value={item.listingId}>{item.title} — {formatPrice(item.priceCents)}</option>)}
                  </select>
                </div>
              )}
            </div>

            <div className="min-w-0">
              <LeadInquiryForm
                key={selectedItem.listingId}
                listingId={selectedItem.listingId}
                vehicleLabel={selectedItem.title}
                dealerName={data.dealerName}
                isCategoryItem={selectedItem.identity.source === 'category_item'}
              />
            </div>
          </section>
        )}

      </div>
    </PageShell>
  );
}
