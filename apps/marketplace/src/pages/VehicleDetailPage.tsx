import { useState } from 'react';
import { useQuery } from '../hooks/useQuery.ts';
import { fetchVehicle, formatPrice, formatMileage, formatListedDate } from '../lib/api.ts';
import { dealerLocation, vehicleTitle } from '../lib/vehicleDisplay.ts';
import { getListReturn } from '../lib/listReturn.ts';
import { dealerHref } from '../lib/routes.ts';
import { Shell, LoadingSkeleton, ErrorState } from '../components/Shell.tsx';
import { VehicleImage } from '../components/VehicleImage.tsx';
import { ConditionBadge } from '../components/ConditionBadge.tsx';

type Props = { listingId: string };

export default function VehicleDetailPage({ listingId }: Props) {
  const { data, loading, error, reload } = useQuery(
    () => fetchVehicle(listingId),
    [listingId]
  );
  const [activeImg, setActiveImg] = useState(0);
  const backHref = getListReturn();

  if (loading && !data) {
    return (
      <Shell backHref={backHref} backLabel="Back to results">
        <LoadingSkeleton label="Loading vehicle…" />
      </Shell>
    );
  }

  if (error) {
    return (
      <Shell backHref={backHref} backLabel="Back to results">
        <ErrorState message={error} onRetry={reload} />
      </Shell>
    );
  }

  if (!data) return null;

  const { vehicle, additionalMediaUrls, fullDescription } = data;
  const allImages = [...vehicle.mediaUrls, ...additionalMediaUrls];
  const title = vehicleTitle(vehicle);
  const location = dealerLocation(vehicle.dealerCity, vehicle.dealerState);

  return (
    <Shell backHref={backHref} backLabel="Back to results">
      <div className="grid grid-cols-1 gap-10 lg:grid-cols-2">
        <section aria-label="Photos">
          <VehicleImage
            src={allImages[activeImg]}
            alt={title}
            size="hero"
            className="rounded-2xl"
          />

          {allImages.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {allImages.map((url, i) => (
                <button
                  key={`${url}-${i}`}
                  type="button"
                  onClick={() => setActiveImg(i)}
                  aria-label={`Show photo ${i + 1}`}
                  aria-current={i === activeImg ? 'true' : undefined}
                  className={`h-16 w-20 shrink-0 overflow-hidden rounded-lg border-2 transition ${
                    i === activeImg ? 'border-blue-500' : 'border-transparent hover:border-slate-300'
                  }`}
                >
                  <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6">
          <div className="space-y-3">
            <ConditionBadge condition={vehicle.condition} />
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">
              {vehicle.year} {vehicle.make} {vehicle.model}
            </h1>
            {vehicle.trim && (
              <p className="text-lg text-slate-600">{vehicle.trim}</p>
            )}
            <p className="text-3xl font-bold tabular-nums text-slate-900">
              {formatPrice(vehicle.priceCents)}
            </p>
          </div>

          <dl className="grid grid-cols-2 gap-3">
            {[
              ['Mileage',   formatMileage(vehicle.mileage)],
              ['Condition', vehicle.condition === 'CPO' ? 'Certified pre-owned' : vehicle.condition === 'NEW' ? 'New' : 'Used'],
              ['Exterior',  vehicle.exteriorColor ?? 'Not listed'],
              ['Listed',    formatListedDate(vehicle.listedAt)],
            ].map(([key, val]) => (
              <div key={key} className="rounded-xl border border-slate-200 bg-white p-4">
                <dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{key}</dt>
                <dd className="mt-1 text-sm font-semibold text-slate-800">{val}</dd>
              </div>
            ))}
          </dl>

          {fullDescription && (
            <div className="rounded-xl border border-slate-200 bg-white p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">Description</h2>
              <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {fullDescription}
              </p>
            </div>
          )}

          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Sold by</p>
            <a
              href={dealerHref(vehicle.dealerId)}
              className="mt-1 block text-lg font-semibold text-slate-900 transition hover:text-blue-600"
            >
              {vehicle.dealerName}
            </a>
            {location && (
              <p className="mt-1 text-sm text-slate-600">{location}</p>
            )}
            <a
              href={dealerHref(vehicle.dealerId)}
              className="mt-4 inline-flex text-sm font-semibold text-blue-600 transition hover:text-blue-700"
            >
              View all vehicles from this dealer →
            </a>
          </aside>
        </section>
      </div>
    </Shell>
  );
}
