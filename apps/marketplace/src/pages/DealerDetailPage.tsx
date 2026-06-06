import { useQuery } from '../hooks/useQuery.ts';
import { fetchDealer } from '../lib/api.ts';
import { dealerLocation } from '../lib/vehicleDisplay.ts';
import { getListReturn } from '../lib/listReturn.ts';
import { Shell, LoadingSkeleton, ErrorState, EmptyState, VehicleGridSkeleton } from '../components/Shell.tsx';
import { VehicleCard } from '../components/VehicleCard.tsx';

type Props = { dealerId: string };

function formatWebsiteLabel(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export default function DealerDetailPage({ dealerId }: Props) {
  const { data, loading, error, reload } = useQuery(
    () => fetchDealer(dealerId),
    [dealerId]
  );
  const backHref = getListReturn();

  if (loading && !data) {
    return (
      <Shell backHref={backHref} backLabel="Back to results">
        <LoadingSkeleton label="Loading dealer…" />
        <div className="mt-8">
          <VehicleGridSkeleton count={3} />
        </div>
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

  const location = dealerLocation(data.dealerCity, data.dealerState);
  const count = data.vehicles.length;

  return (
    <Shell backHref={backHref} backLabel="Back to results">
      <header className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-slate-900 to-slate-700 px-6 py-8 text-white">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-300">Dealer</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{data.dealerName}</h1>
          {location && (
            <p className="mt-2 text-sm text-slate-200">{location}</p>
          )}
        </div>

        {data.websiteUrl && (
          <div className="border-t border-slate-100 px-6 py-4">
            <a
              href={data.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 transition hover:text-blue-700"
            >
              Visit {formatWebsiteLabel(data.websiteUrl)}
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        )}
      </header>

      <section>
        <h2 className="mb-5 text-lg font-semibold text-slate-900">
          {count > 0
            ? `${count.toLocaleString()} vehicle${count !== 1 ? 's' : ''} on the marketplace`
            : 'Marketplace inventory'}
        </h2>

        {count === 0 ? (
          <EmptyState
            title="No vehicles listed right now"
            description="This dealer has no marketplace-eligible inventory at the moment. Check back later or browse all vehicles."
          />
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.vehicles.map(card => (
              <VehicleCard key={card.listingId} card={card} />
            ))}
          </div>
        )}
      </section>
    </Shell>
  );
}
