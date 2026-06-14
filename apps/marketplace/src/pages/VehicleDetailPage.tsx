import { useState } from 'react';
import { isConsumerMarketplaceLive, type BusinessCategoryId } from '@auto-dealer/category-schemas';
import { useQuery, queryErrorMessage } from '../hooks/useQuery.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { fetchVehicle, isNotFoundError, type MarketplaceVehicleDetailResponse } from '../lib/api.ts';
import { formatPrice, formatMileage } from '../lib/display.ts';
import { getListReturn } from '../lib/listReturn.ts';
import { isAutomotiveSlug, sitesHref } from '../lib/routes.ts';
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

type Props = { listingId: string };

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

  const { data, loading, error, reload } = useQuery(
    () => fetchVehicle(listingId, categoryId),
    [listingId, categoryId],
  );

  const { core, commerce } = data?.vehicle ?? {};
  const title = core?.title ?? `${schema.asset.singular} details`;
  const metaDescription = data
    ? `${formatPrice(commerce!.priceCents)} · ${formatMileage(data.vehicle.classification.mileage)}`
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
        <DetailPageSkeleton />
      </PageShell>
    );
  }

  if (error) {
    return (
      <PageShell backHref={backHref} backLabel="Back to results">
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
      </PageShell>
    );
  }

  if (!data) return null;

  return (
    <ListingDetailContent
      listingId={listingId}
      categoryId={categoryId}
      slug={slug}
      backHref={backHref}
      vehicle={data.vehicle}
      ctas={data.ctas}
    />
  );
}

// ── Layout: shared across all categories, auto-specific sections gated ────────

function MarkAsSoldButton({ listingId, onSold }: { listingId: string; onSold: () => void }) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSold = async () => {
    if (done || loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/marketplace/vehicles/${listingId}/sold`, { method: 'POST' });
      if (res.ok) {
        setDone(true);
        onSold();
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
      <p className="font-semibold text-amber-800 mb-2">Demo mode — simulate a sale</p>
      <button
        type="button"
        onClick={() => void handleSold()}
        disabled={loading || done}
        className="px-3 py-1.5 rounded bg-amber-600 text-white font-semibold disabled:opacity-50 hover:bg-amber-700 transition-colors"
      >
        {done ? 'Marked as sold' : loading ? 'Processing…' : 'Mark as Sold'}
      </button>
      {done && <p className="mt-1.5 text-amber-700">Operator-web has been notified. Vehicle removed from marketplace.</p>}
    </div>
  );
}

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
  const [soldOut, setSoldOut] = useState(false);
  const isDemoMode = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('demo') === '1';

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
      <div className="pb-24 lg:pb-0">
        
        {/* Main Branding Heading */}
        <div className="mb-6">
          <CoreHeaderSection core={vehicle.core} commerce={vehicle.commerce} location={vehicle.location} />
        </div>

        {/* Full-width Photo Grid */}
        <div className="mb-8 w-screen relative left-1/2 -translate-x-1/2 bg-black/5">
          <div className="mx-auto max-w-[1920px]">
            <MediaSection media={vehicle.media} alt={vehicle.core.title} location={vehicle.location} />
          </div>
        </div>

        {/* Two Column Layout for Details */}
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_360px] lg:gap-10">
          
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
            <LocationSection location={vehicle.location} />
            {isDemoMode && !soldOut && (
              <MarkAsSoldButton listingId={listingId} onSold={() => setSoldOut(true)} />
            )}
            {soldOut ? (
              <div className="rounded-lg border border-silver-200 bg-silver-50 p-4 text-center text-sm text-ink-muted">
                This vehicle has been sold and is no longer available.
              </div>
            ) : (
              <div id="inquiry">
                <LeadInquiryForm
                  listingId={vehicle.core.listingId}
                  vehicleLabel={vehicle.core.title}
                  dealerName={vehicle.location.dealerName}
                />
              </div>
            )}
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
