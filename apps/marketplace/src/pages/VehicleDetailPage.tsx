import { useQuery, queryErrorMessage } from '../hooks/useQuery.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { fetchVehicle, isNotFoundError } from '../lib/api.ts';
import { formatPrice, formatMileage } from '../lib/display.ts';
import { getListReturn } from '../lib/listReturn.ts';
import { MarketplaceEventType } from '../lib/events.ts';
import { useTrackMarketplaceEvent } from '../hooks/useTrackMarketplaceEvent.ts';
import { PageShell } from '../components/layout/PageShell.tsx';
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

type Props = { listingId: string };

export default function VehicleDetailPage({ listingId }: Props) {
  const { data, loading, error, reload } = useQuery(
    () => fetchVehicle(listingId),
    [listingId]
  );
  const backHref = getListReturn();

  const { core, commerce } = data?.vehicle ?? {};
  const title = core?.title ?? 'Vehicle details';
  const metaDescription = data
    ? `${formatPrice(commerce!.priceCents)} · ${formatMileage(data.vehicle.classification.mileage)}`
    : undefined;

  usePageMeta(title, metaDescription);
  useTrackMarketplaceEvent(data ? { eventType: MarketplaceEventType.VEHICLE_DETAIL_VIEW, listingId } : null);

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

  const { vehicle } = data;

  return (
    <PageShell backHref={backHref} backLabel="Back to results">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <MediaSection media={vehicle.media} alt={vehicle.core.title} />

        <div className="space-y-6">
          <CoreHeaderSection core={vehicle.core} commerce={vehicle.commerce} />
          <CommerceSection commerce={vehicle.commerce} />
          <LocationSection location={vehicle.location} />
          <LeadInquiryForm
            listingId={vehicle.core.listingId}
            vehicleLabel={vehicle.core.title}
            dealerName={vehicle.location.dealerName}
          />
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
    </PageShell>
  );
}
