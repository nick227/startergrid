import { useQuery, queryErrorMessage } from '../hooks/useQuery.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { fetchVehicle, isNotFoundError, type MarketplaceVehicleDetailResponse } from '../lib/api.ts';
import { formatPrice, formatMileage } from '../lib/display.ts';
import { getListReturn } from '../lib/listReturn.ts';
import { isAutomotiveSlug } from '../lib/routes.ts';
import GenericListingDetailPage from './GenericListingDetailPage.tsx';
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
  useListingDetailEngagement,
} from '../components/listings/ListingDetailEngagement.tsx';

type Props = { listingId: string };

export default function VehicleDetailPage({ listingId }: Props) {
  const slug = useCategorySlug();
  const schema = useCategorySchema();
  const backHref = getListReturn(slug);

  if (!isAutomotiveSlug(slug)) {
    if (schema.status === 'active') {
      return <GenericListingDetailPage listingId={listingId} />;
    }
    return (
      <PageShell backHref={backHref} backLabel="Back to results">
        <NotFoundState
          title="Listing details coming soon"
          description={`Item detail pages for the ${schema.label.toLowerCase()} marketplace are not available yet.`}
          backHref={backHref}
          backLabel="Back to results"
        />
      </PageShell>
    );
  }

  return <AutomotiveVehicleDetailPage listingId={listingId} />;
}

function AutomotiveVehicleDetailPage({ listingId }: Props) {
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
            title="Vehicle not found"
            description="This listing may have sold or is no longer on the marketplace."
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
    <AutomotiveListingDetailContent
      listingId={listingId}
      slug={slug}
      backHref={backHref}
      vehicle={data.vehicle}
    />
  );
}

function AutomotiveListingDetailContent({
  listingId,
  slug,
  backHref,
  vehicle,
}: {
  listingId: string;
  slug: string;
  backHref: string;
  vehicle: MarketplaceVehicleDetailResponse['vehicle'];
}) {
  const engagement = useListingDetailEngagement({
    categorySlug: slug,
    listingId,
    vehicle,
  });

  return (
    <PageShell backHref={backHref} backLabel="Back to results">
      <div className="pb-24 lg:pb-0">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <MediaSection media={vehicle.media} alt={vehicle.core.title} />

        <div className="space-y-6 lg:sticky lg:top-20 lg:self-start">
          <CoreHeaderSection core={vehicle.core} commerce={vehicle.commerce} />
          <div className="flex flex-wrap items-center gap-2">
            <FavoriteButton listingId={vehicle.core.listingId} />
            <span className="text-sm text-ink-muted">Save this listing</span>
            <ListingDetailShareAction
              shareTitle={engagement.shareTitle}
              shareUrl={engagement.shareUrl}
              className="ml-auto"
            />
          </div>
          <CommerceSection commerce={vehicle.commerce} />
          <LocationSection location={vehicle.location} />
          <div id="inquiry">
            <LeadInquiryForm
              listingId={vehicle.core.listingId}
              vehicleLabel={vehicle.core.title}
              dealerName={vehicle.location.dealerName}
            />
          </div>
        </div>
      </div>

      <div className="mt-10 space-y-6">
        <ClassificationSection classification={vehicle.classification} />
        <ColorsSection colors={vehicle.colors} />
        <EngineSection engine={vehicle.engine} />
        <EfficiencySection efficiency={vehicle.efficiency} />
        <ConditionHistorySection conditionHistory={vehicle.conditionHistory} />
        <FeaturesSection features={vehicle.features} />
        <WarrantySection warranty={vehicle.warranty} />
        <ContentSection content={vehicle.content} />
      </div>

      <ListingDetailEngagementPanels
        categorySlug={slug}
        listingId={listingId}
        shareTitle={engagement.shareTitle}
        shareUrl={engagement.shareUrl}
        priceSummary={engagement.priceSummary}
        sellerSummary={engagement.sellerSummary}
      />
      </div>
    </PageShell>
  );
}
