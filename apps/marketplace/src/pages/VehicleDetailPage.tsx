import { useQuery, queryErrorMessage } from '../hooks/useQuery.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { fetchVehicle, isNotFoundError } from '../lib/api.ts';
import {
  formatPrice,
  formatMileage,
  formatListedDate,
  conditionLabel,
  vehicleTitle,
} from '../lib/display.ts';
import { getListReturn } from '../lib/listReturn.ts';
import { MarketplaceEventType } from '../lib/events.ts';
import { useTrackMarketplaceEvent } from '../hooks/useTrackMarketplaceEvent.ts';
import { PageShell } from '../components/layout/PageShell.tsx';
import { DetailPageSkeleton } from '../components/ui/SkeletonGrid.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { NotFoundState } from '../components/ui/NotFoundState.tsx';
import { ConditionBadge } from '../components/ui/ConditionBadge.tsx';
import { VehicleGallery } from '../components/ui/VehicleGallery.tsx';
import { SpecGrid } from '../components/ui/SpecGrid.tsx';
import { DealerBlock } from '../components/ui/DealerBlock.tsx';
import { SectionCard } from '../components/ui/SectionCard.tsx';
import { LeadInquiryForm } from '../components/ui/LeadInquiryForm.tsx';

type Props = { listingId: string };

export default function VehicleDetailPage({ listingId }: Props) {
  const { data, loading, error, reload } = useQuery(
    () => fetchVehicle(listingId),
    [listingId]
  );
  const backHref = getListReturn();

  const title = data ? vehicleTitle(data.vehicle) : 'Vehicle details';
  const metaDescription = data
    ? `${formatPrice(data.vehicle.priceCents)} · ${formatMileage(data.vehicle.mileage)}`
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

  const { vehicle, additionalMediaUrls, fullDescription } = data;
  const allImages = [...vehicle.mediaUrls, ...additionalMediaUrls];
  const heading = vehicleTitle(vehicle);

  return (
    <PageShell backHref={backHref} backLabel="Back to results">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <VehicleGallery images={allImages} alt={heading} />

        <div className="space-y-6">
          <header className="space-y-3">
            <ConditionBadge condition={vehicle.condition} />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            {vehicle.trim && <p className="text-base text-slate-600 sm:text-lg">{vehicle.trim}</p>}
            <p className="text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
              {formatPrice(vehicle.priceCents)}
            </p>
          </header>

          <SpecGrid
            specs={[
              { label: 'Mileage',   value: formatMileage(vehicle.mileage) },
              { label: 'Condition', value: conditionLabel(vehicle.condition) },
              { label: 'Exterior',  value: vehicle.exteriorColor ?? 'Not listed' },
              { label: 'Listed',    value: formatListedDate(vehicle.listedAt) },
            ]}
          />

          {fullDescription && (
            <SectionCard title="Description">
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {fullDescription}
              </p>
            </SectionCard>
          )}

          <DealerBlock
            dealerId={vehicle.dealerId}
            dealerName={vehicle.dealerName}
            city={vehicle.dealerCity}
            state={vehicle.dealerState}
          />

          <LeadInquiryForm
            listingId={vehicle.listingId}
            vehicleLabel={heading}
            dealerName={vehicle.dealerName}
          />
        </div>
      </div>
    </PageShell>
  );
}
