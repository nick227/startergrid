import { isConsumerMarketplaceLive, type BusinessCategoryId } from '@auto-dealer/category-schemas';
import { useQuery, queryErrorMessage } from '../hooks/useQuery.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import {
  fetchVehicle,
  fetchCategoryItem,
  isNotFoundError,
  type MarketplaceVehicleDetailResponse,
} from '../lib/api.ts';
import { formatPrice, formatMileage } from '../lib/display.ts';
import { getListReturn } from '../lib/listReturn.ts';
import { isAutomotiveSlug, sitesHref, sellerHref } from '../lib/routes.ts';
import { MarketplaceEventType } from '../lib/events.ts';
import { useTrackMarketplaceEvent } from '../hooks/useTrackMarketplaceEvent.ts';
import { useCategoryId, useCategorySchema, useCategorySlug } from '../contexts/CategoryContext.tsx';
import { PageShell } from '../components/layout/PageShell.tsx';
import { FavoriteButton } from '../components/ui/FavoriteButton.tsx';
import { DetailPageSkeleton } from '../components/ui/SkeletonGrid.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { NotFoundState } from '../components/ui/NotFoundState.tsx';
import { LeadInquiryForm } from '../components/ui/LeadInquiryForm.tsx';
import { CoreHeaderSection } from '../components/vdp/CoreHeaderSection.tsx';
import { AvailabilitySection } from '../components/vdp/AvailabilitySection.tsx';
import { CommerceSection } from '../components/vdp/CommerceSection.tsx';
import { LocationSection } from '../components/vdp/LocationSection.tsx';
import { ClassificationSection } from '../components/vdp/ClassificationSection.tsx';
import { ColorsSection } from '../components/vdp/ColorsSection.tsx';
import { EngineSection } from '../components/vdp/EngineSection.tsx';
import { EfficiencySection } from '../components/vdp/EfficiencySection.tsx';
import { ConditionHistorySection } from '../components/vdp/ConditionHistorySection.tsx';
import { FeaturesSection } from '../components/vdp/FeaturesSection.tsx';
import { WarrantySection } from '../components/vdp/WarrantySection.tsx';
import { MediaSection } from '../components/vdp/MediaSection.tsx';
import { ContentSection } from '../components/vdp/ContentSection.tsx';
import {
  ListingDetailEngagementPanels,
  ListingDetailShareAction,
  ReportListingButton,
  useListingDetailEngagement,
} from '../components/listings/ListingDetailEngagement.tsx';
import { FulfillmentSection } from '../components/vdp/FulfillmentSection.tsx';
import { SimilarListingsRail } from '../components/listings/SimilarListingsRail.tsx';
import { ConditionBadge } from '../components/ui/ConditionBadge.tsx';
import { DealerBlock } from '../components/ui/DealerBlock.tsx';
import { PublicationSpecsSection } from '../components/vdp/PublicationSpecsSection.tsx';
import { fromCategoryItemDetail, type ConsumerListingDetail } from '../lib/listingReadModel.ts';
import { getCategoryComposition } from '../config/marketplaceComposition.ts';

type Props = { listingId: string };

type DetailResult =
  | { type: 'vehicle'; data: MarketplaceVehicleDetailResponse }
  | { type: 'category_item'; detail: ConsumerListingDetail };

export default function VehicleDetailPage({ listingId }: Props) {
  const schema = useCategorySchema();
  const slug = useCategorySlug();
  const backHref = getListReturn(slug);

  // Automotive is always open; other categories require explicit marketplace enablement.
  if (!isAutomotiveSlug(slug) && !isConsumerMarketplaceLive(schema)) {
    return (
      <PageShell backHref={backHref} backLabel="Back to results">
        <NotFoundState
          title="Marketplace unavailable"
          description={`The ${schema.label.toLowerCase()} marketplace is not open to consumers yet.`}
          backHref={sitesHref()}
          backLabel="All marketplaces"
        />
      </PageShell>
    );
  }

  return <ListingDetailPage listingId={listingId} />;
}

// ── Single shared fetch + render path for all consumer-enabled categories ─────

function ListingDetailPage({ listingId }: Props) {
  const categoryId = useCategoryId();
  const slug = useCategorySlug();
  const schema = useCategorySchema();
  const backHref = getListReturn(slug);

  const { data, loading, error, reload } = useQuery<DetailResult>(async () => {
    if (schema.lifecycleMode === 'digital_distribution') {
      const item = await fetchCategoryItem(listingId);
      return { type: 'category_item', detail: fromCategoryItemDetail(item, schema, slug) };
    }
    try {
      const vehicle = await fetchVehicle(listingId, categoryId);
      return { type: 'vehicle', data: vehicle };
    } catch (err) {
      if (isNotFoundError(err)) {
        const item = await fetchCategoryItem(listingId);
        return { type: 'category_item', detail: fromCategoryItemDetail(item, schema, slug) };
      }
      throw err;
    }
  }, [listingId, categoryId, schema.lifecycleMode, slug]);

  const title =
    data?.type === 'vehicle'
      ? data.data.vehicle.core.title
      : data?.type === 'category_item'
      ? data.detail.title
      : `${schema.asset.singular} details`;

  const metaDescription =
    data?.type === 'vehicle'
      ? `${formatPrice(data.data.vehicle.commerce.priceCents)} · ${formatMileage(data.data.vehicle.classification.mileage)}`
      : data?.type === 'category_item'
      ? `${formatPrice(data.detail.priceCents)} · ${data.detail.author ? `By ${data.detail.author}` : schema.label}`
      : undefined;

  usePageMeta(title, metaDescription);
  useTrackMarketplaceEvent(data ? {
    eventType: MarketplaceEventType.VEHICLE_DETAIL_VIEW,
    listingId,
    category: categoryId,
  } : null);

  if (loading && !data) {
    return (
      <PageShell backHref={backHref} backLabel="Back to results">
        <div className="mp-rail py-6">
          <DetailPageSkeleton />
        </div>
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell backHref={backHref} backLabel="Back to results">
        <div className="mp-rail py-6">
          {isNotFoundError(error) ? (
            <NotFoundState
              title="Listing not found"
              description="This listing may have sold or is no longer available."
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

  if (data.type === 'category_item') {
    return (
      <CategoryItemDetailContent
        listingId={listingId}
        categoryId={categoryId}
        slug={slug}
        backHref={backHref}
        detail={data.detail}
      />
    );
  }

  return (
    <ListingDetailContent
      listingId={listingId}
      categoryId={categoryId}
      slug={slug}
      backHref={backHref}
      vehicle={data.data.vehicle}
      ctas={data.data.ctas}
    />
  );
}

// ── Layout: Category Item Detail (Digital / E-books / Retail items) ─────────────

function CategoryItemDetailContent({
  listingId,
  categoryId,
  slug,
  backHref,
  detail,
}: {
  listingId: string;
  categoryId: BusinessCategoryId;
  slug: string;
  backHref: string;
  detail: ConsumerListingDetail;
}) {
  const composition = getCategoryComposition(slug);
  const shareUrl = window.location.href;

  return (
    <PageShell backHref={backHref} backLabel="Back to results">
      <div className="mp-rail py-6 pb-24 lg:pb-12">
        
        {/* Main Branding Heading */}
        <div className="mb-6">
          <header className="space-y-4 pt-4">
            <a
              href={sellerHref(slug, detail.sellerId, detail.listingId)}
              className="inline-flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wide hover:text-cta transition"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4 text-cta">
                <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
              <span>{detail.sellerName}</span>
              <span className="text-xs text-cta lowercase">· storefront →</span>
            </a>

            <div className="space-y-2">
              <ConditionBadge condition={detail.condition as any} />
              <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{detail.title}</h1>
              {detail.subtitle && <p className="text-lg text-slate-600 sm:text-xl">{detail.subtitle}</p>}
            </div>

            <p className="text-3xl font-bold tabular-nums text-slate-900 sm:text-4xl">
              {formatPrice(detail.priceCents)}
            </p>

            <dl className="grid grid-cols-2 gap-2 text-sm text-slate-600 pt-2 border-t border-slate-100">
              {detail.stockNumber && (
                <div>
                  <dt className="mp-label text-slate-400">{composition.refLabel}</dt>
                  <dd className="font-medium text-slate-800">{detail.stockNumber}</dd>
                </div>
              )}
              {detail.primaryIdentifier && (
                <div>
                  <dt className="mp-label text-slate-400">{detail.primaryIdentifier.label}</dt>
                  <dd className="font-mono text-xs font-medium text-slate-800 sm:text-sm">{detail.primaryIdentifier.value}</dd>
                </div>
              )}
            </dl>
          </header>
        </div>

        {/* Contained Media Frame */}
        <div className="mb-8 rounded-2xl bg-gradient-to-b from-silver-100 to-silver-50 p-6 sm:p-10 flex items-center justify-center border border-silver-200 shadow-sm">
          <img
            src={detail.mediaUrls[0] || '/demo-assets/multi-entity-books.svg'}
            alt={detail.title}
            className="max-h-[360px] max-w-full rounded-xl shadow-md object-contain bg-white p-3 border border-silver-200"
          />
        </div>

        {/* Two Column Layout for Details */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px] lg:gap-10 items-start">
          
          {/* Main Column */}
          <div className="space-y-6 order-last lg:order-1">
            <FulfillmentSection />
            <PublicationSpecsSection detail={detail} />
            {detail.description && (
              <ContentSection content={{ fullDescription: detail.description, dealerNotes: null, disclaimer: null, legalDisclosure: null }} />
            )}
          </div>

          {/* Right Sidebar Column */}
          <div className="space-y-6 order-first lg:sticky lg:top-20 lg:self-start lg:order-2">
            <div className="flex flex-wrap items-center gap-2">
              <FavoriteButton listingId={detail.listingId} />
              <span className="text-sm text-ink-muted">Save this title</span>
              <ListingDetailShareAction
                shareTitle={detail.title}
                shareUrl={shareUrl}
                className="ml-auto"
              />
            </div>
            <div className="text-right">
              <ReportListingButton listingId={listingId} />
            </div>

            <DealerBlock
              dealerId={detail.sellerId}
              dealerName={detail.sellerName}
              city={detail.sellerCity ?? null}
              state={detail.sellerState ?? null}
              fromListing={detail.listingId}
            />

            <div id="inquiry">
              <LeadInquiryForm
                listingId={detail.listingId}
                vehicleLabel={detail.title}
                dealerName={detail.sellerName}
                isCategoryItem={true}
              />
            </div>
          </div>
        </div>

        <SimilarListingsRail
          listingId={listingId}
          categoryId={categoryId}
          categorySlug={slug}
        />
      </div>
    </PageShell>
  );
}

// ── Layout: shared across all categories, auto-specific sections gated ────────

function ListingDetailContent({
  listingId,
  categoryId,
  slug,
  backHref,
  vehicle,
  ctas,
}: {
  listingId: string;
  categoryId: BusinessCategoryId;
  slug: string;
  backHref: string;
  vehicle: MarketplaceVehicleDetailResponse['vehicle'];
  ctas: MarketplaceVehicleDetailResponse['ctas'];
}) {
  const engagement = useListingDetailEngagement({
    categorySlug: slug,
    listingId,
    vehicle,
  });

  // Engine and efficiency are automotive-specific; all other sections are
  // either universal or internally guard on data presence.
  const isAuto = isAutomotiveSlug(slug);

  return (
    <PageShell backHref={backHref} backLabel="Back to results">
      <div className="mp-rail py-6 pb-24 lg:pb-12">
        
        {/* Main Branding Heading */}
        <div className="mb-6">
          <CoreHeaderSection core={vehicle.core} commerce={vehicle.commerce} location={vehicle.location} />
        </div>

        {/* Contained Media Section */}
        <div className="mb-8 rounded-2xl overflow-hidden bg-silver-100 border border-silver-200 shadow-sm">
          <MediaSection media={vehicle.media} alt={vehicle.core.title} location={vehicle.location} />
        </div>

        {/* Two Column Layout for Details */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px] lg:gap-10 items-start">
          
          {/* Main Column */}
          <div className="space-y-6 order-last lg:order-1">
            <FulfillmentSection />
            <ClassificationSection classification={vehicle.classification} />
            <ColorsSection colors={vehicle.colors} />
            {isAuto && <EngineSection engine={vehicle.engine} />}
            {isAuto && <EfficiencySection efficiency={vehicle.efficiency} />}
            <ConditionHistorySection conditionHistory={vehicle.conditionHistory} />
            <FeaturesSection features={vehicle.features} />
            <WarrantySection warranty={vehicle.warranty} />
            <ContentSection content={vehicle.content} />
          </div>

          {/* Right Sidebar Column */}
          <div className="space-y-6 order-first lg:sticky lg:top-20 lg:self-start lg:order-2">
            <div className="flex flex-wrap items-center gap-2">
              <FavoriteButton listingId={vehicle.core.listingId} />
              <span className="text-sm text-ink-muted">Save this listing</span>
              <ListingDetailShareAction
                shareTitle={engagement.shareTitle}
                shareUrl={engagement.shareUrl}
                className="ml-auto"
              />
            </div>
            <div className="text-right">
              <ReportListingButton listingId={listingId} />
            </div>
            <AvailabilitySection commerce={vehicle.commerce} />
            <CommerceSection commerce={vehicle.commerce} />
            <LocationSection location={vehicle.location} fromListing={listingId} />
            <div id="inquiry">
              <LeadInquiryForm
                listingId={vehicle.core.listingId}
                vehicleLabel={vehicle.core.title}
                dealerName={vehicle.location.dealerName}
                isCategoryItem={false}
              />
            </div>
          </div>
        </div>

        <SimilarListingsRail
          listingId={listingId}
          categoryId={categoryId}
          categorySlug={slug}
          make={vehicle.core.make}
        />

        <ListingDetailEngagementPanels
          categorySlug={slug}
          listingId={listingId}
          shareTitle={engagement.shareTitle}
          shareUrl={engagement.shareUrl}
          priceSummary={engagement.priceSummary}
          sellerSummary={engagement.sellerSummary}
          ctas={ctas}
        />
      </div>
    </PageShell>
  );
}
