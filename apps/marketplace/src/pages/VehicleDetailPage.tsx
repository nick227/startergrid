import { useState } from 'react';
import { useQuery } from '../hooks/useQuery.ts';
import { fetchVehicle, formatPrice, formatMileage, formatListedDate } from '../lib/api.ts';
import { Shell, LoadingSkeleton, ErrorState } from '../components/Shell.tsx';
import { dealerHref, listHref } from '../lib/routes.ts';

type Props = { listingId: string };

const CONDITION_LABEL: Record<string, string> = {
  NEW: 'New', USED: 'Used', CPO: 'Certified',
};

export default function VehicleDetailPage({ listingId }: Props) {
  const { data, loading, error, reload } = useQuery(
    () => fetchVehicle(listingId),
    [listingId]
  );
  const [activeImg, setActiveImg] = useState(0);

  if (loading && !data) return (
    <Shell backHref={listHref()} backLabel="Browse">
      <LoadingSkeleton label="Loading vehicle…" />
    </Shell>
  );

  if (error) return (
    <Shell backHref={listHref()} backLabel="Browse">
      <ErrorState message={error} onRetry={reload} />
    </Shell>
  );

  if (!data) return null;

  const { vehicle, additionalMediaUrls } = data;
  const allImages = [...vehicle.mediaUrls, ...additionalMediaUrls];
  const conditionLabel = CONDITION_LABEL[vehicle.condition] ?? vehicle.condition;

  return (
    <Shell backHref={listHref()} backLabel="Browse">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

        {/* Images */}
        <div className="space-y-3">
          <div className="aspect-[4/3] bg-slate-100 rounded-xl overflow-hidden">
            {allImages[activeImg] ? (
              <img
                src={allImages[activeImg]}
                alt={`${vehicle.year} ${vehicle.make} ${vehicle.model}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-300 text-5xl">
                🚗
              </div>
            )}
          </div>
          {allImages.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {allImages.map((url, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImg(i)}
                  className={`shrink-0 w-16 h-12 rounded-lg overflow-hidden border-2 transition-colors ${
                    i === activeImg ? 'border-blue-500' : 'border-transparent hover:border-slate-300'
                  }`}
                >
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="space-y-5">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
                {conditionLabel}
              </span>
              <span className="text-xs text-slate-400">Stock #{vehicle.stockNumber}</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">
              {vehicle.year} {vehicle.make} {vehicle.model}
              {vehicle.trim && <span className="font-normal text-slate-500 text-xl"> {vehicle.trim}</span>}
            </h1>
          </div>

          <p className="text-3xl font-bold text-slate-900 tabular-nums">
            {formatPrice(vehicle.priceCents)}
          </p>

          <dl className="grid grid-cols-2 gap-3">
            {[
              ['Mileage',    formatMileage(vehicle.mileage)],
              ['Color',      vehicle.exteriorColor ?? '—'],
              ['Condition',  conditionLabel],
              ['Listed',     formatListedDate(vehicle.listedAt)],
            ].map(([key, val]) => (
              <div key={key} className="bg-slate-50 rounded-lg p-3">
                <dt className="text-xs font-medium text-slate-400 uppercase tracking-wide">{key}</dt>
                <dd className="mt-0.5 text-sm font-medium text-slate-700">{val}</dd>
              </div>
            ))}
          </dl>

          {/* Dealer */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-1">
            <p className="text-xs text-slate-400 uppercase tracking-wide font-medium">Listed by</p>
            <a
              href={dealerHref(vehicle.dealerId)}
              className="font-semibold text-slate-900 hover:text-blue-600 transition-colors"
            >
              {vehicle.dealerName}
            </a>
            {(vehicle.dealerCity || vehicle.dealerState) && (
              <p className="text-sm text-slate-500">
                {[vehicle.dealerCity, vehicle.dealerState].filter(Boolean).join(', ')}
              </p>
            )}
            <a
              href={dealerHref(vehicle.dealerId)}
              className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
            >
              View all vehicles from this dealer →
            </a>
          </div>
        </div>
      </div>
    </Shell>
  );
}
