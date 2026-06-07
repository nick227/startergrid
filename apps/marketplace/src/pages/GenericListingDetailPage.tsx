import { useQuery, queryErrorMessage } from '../hooks/useQuery.ts';
import { usePageMeta } from '../hooks/usePageMeta.ts';
import { fetchVehicle, isNotFoundError, type MarketplaceVehicleCard } from '../lib/api.ts';
import { formatPrice, formatUsage, formatLocation, conditionLabel } from '../lib/display.ts';
import { getListReturn } from '../lib/listReturn.ts';
import { MarketplaceEventType } from '../lib/events.ts';
import { useTrackMarketplaceEvent } from '../hooks/useTrackMarketplaceEvent.ts';
import { useCategoryId, useCategorySchema, useCategorySlug } from '../contexts/CategoryContext.tsx';
import { PageShell } from '../components/layout/PageShell.tsx';
import { FavoriteButton } from '../components/ui/FavoriteButton.tsx';
import { DetailPageSkeleton } from '../components/ui/SkeletonGrid.tsx';
import { ErrorState } from '../components/ui/ErrorState.tsx';
import { NotFoundState } from '../components/ui/NotFoundState.tsx';
import { LeadInquiryForm } from '../components/ui/LeadInquiryForm.tsx';
import { MediaSection } from '../components/vdp/MediaSection.tsx';
import { ConditionBadge } from '../components/ui/ConditionBadge.tsx';

type Props = { listingId: string };

export default function GenericListingDetailPage({ listingId }: Props) {
  const categoryId = useCategoryId();
  const slug = useCategorySlug();
  const schema = useCategorySchema();
  const backHref = getListReturn(slug);
  const usageFieldLabel = schema.fields.find(field => field.key === 'mileage')?.label ?? 'Usage';

  const { data, loading, error, reload } = useQuery(
    () => fetchVehicle(listingId, categoryId),
    [listingId, categoryId],
  );

  const { core, commerce, classification } = data?.vehicle ?? {};
  const usageUnit = classification?.usageUnit === 'hours' ? 'hours' : classification?.usageUnit === 'miles' ? 'miles' : undefined;
  const title = core?.title ?? `${schema.asset.singular} details`;
  const metaDescription = data && commerce && classification
    ? `${formatPrice(commerce.priceCents)} · ${formatUsage(classification.mileage, usageUnit)}`
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
            title={`${schema.asset.titleLabel} not found`}
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
  const condition = vehicle.core.condition as MarketplaceVehicleCard['condition'];
  const detailClassification = vehicle.classification;
  const colors = vehicle.colors;
  const location = vehicle.location;
  const detailUsageUnit = detailClassification.usageUnit === 'hours'
    ? 'hours'
    : detailClassification.usageUnit === 'miles'
      ? 'miles'
      : undefined;
  const dealerLocation = formatLocation(location.dealerCity, location.dealerState);
  const usageValue = formatUsage(detailClassification.mileage ?? 0, detailUsageUnit);

  return (
    <PageShell backHref={backHref} backLabel="Back to results">
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2 lg:gap-10">
        <MediaSection media={vehicle.media} alt={vehicle.core.title} />

        <div className="space-y-6">
          <header className="space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <h1 className="text-2xl font-bold leading-tight text-ink-heading sm:text-3xl">
                {vehicle.core.title}
              </h1>
              <ConditionBadge condition={condition} />
            </div>
            {vehicle.core.trim && (
              <p className="text-base text-ink-muted">{vehicle.core.trim}</p>
            )}
            <p className="text-sm text-ink-faint">
              {schema.asset.refLabel} {vehicle.core.stockNumber}
            </p>
          </header>

          <div className="rounded-xl border border-silver-200 bg-white p-5 shadow-elevation-1">
            <p className="mp-label text-ink-faint">Price</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-ink">
              {formatPrice(vehicle.commerce.priceCents)}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-4 rounded-xl bg-surface-inset p-4">
            <Spec label="Year" value={String(vehicle.core.year)} />
            <Spec label="Make" value={vehicle.core.make} />
            <Spec label="Model" value={vehicle.core.model} />
            <Spec label={usageFieldLabel} value={usageValue} />
            {detailClassification.unitType && (
              <Spec label="Type" value={detailClassification.unitType} className="col-span-2" />
            )}
            {detailClassification.lengthFt != null && (
              <Spec label="Length" value={`${detailClassification.lengthFt} ft`} className="col-span-2" />
            )}
            {detailClassification.engineHours != null && (
              <Spec label="Engine hours" value={formatUsage(detailClassification.engineHours, 'hours')} className="col-span-2" />
            )}
            {detailClassification.bodyStyle && (
              <Spec label="Body style" value={detailClassification.bodyStyle} className="col-span-2" />
            )}
            {colors.exteriorColor && (
              <Spec label="Color" value={colors.exteriorColor} className="col-span-2" />
            )}
            <Spec label="Condition" value={conditionLabel(condition)} />
            {dealerLocation && (
              <Spec label="Location" value={dealerLocation} className="col-span-2" />
            )}
          </dl>

          <div className="flex items-center gap-2">
            <FavoriteButton listingId={vehicle.core.listingId} />
            <span className="text-sm text-ink-muted">Save this {schema.asset.singular}</span>
          </div>

          <div className="rounded-xl border border-silver-200 bg-white p-5">
            <p className="mp-label text-ink-faint">Seller</p>
            <p className="mt-1 text-lg font-semibold text-ink-heading">{location.dealerName}</p>
            {dealerLocation && <p className="mt-1 text-sm text-ink-muted">{dealerLocation}</p>}
          </div>

          <div id="inquiry">
            <LeadInquiryForm
              listingId={vehicle.core.listingId}
              vehicleLabel={vehicle.core.title}
              dealerName={location.dealerName}
            />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function Spec({
  label,
  value,
  className = '',
}: {
  label: string;
  value: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <dt className="mp-label text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-ink-body">{value}</dd>
    </div>
  );
}
