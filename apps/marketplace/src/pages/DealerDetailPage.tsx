import { useQuery } from '../hooks/useQuery.ts';
import { fetchDealer } from '../lib/api.ts';
import { Shell, LoadingSkeleton, ErrorState, EmptyState } from '../components/Shell.tsx';
import { VehicleCard } from '../components/VehicleCard.tsx';
import { listHref } from '../lib/routes.ts';

type Props = { dealerId: string };

export default function DealerDetailPage({ dealerId }: Props) {
  const { data, loading, error, reload } = useQuery(
    () => fetchDealer(dealerId),
    [dealerId]
  );

  if (loading && !data) return (
    <Shell backHref={listHref()} backLabel="Browse">
      <LoadingSkeleton label="Loading dealer…" />
    </Shell>
  );

  if (error) return (
    <Shell backHref={listHref()} backLabel="Browse">
      <ErrorState message={error} onRetry={reload} />
    </Shell>
  );

  if (!data) return null;

  const location = [data.dealerCity, data.dealerState].filter(Boolean).join(', ');

  return (
    <Shell backHref={listHref()} backLabel="Browse">
      {/* Dealer header */}
      <div className="mb-8 pb-6 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900">{data.dealerName}</h1>
        {location && <p className="text-slate-500 mt-1">{location}</p>}
        {data.websiteUrl && (
          <a
            href={data.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block mt-2 text-sm text-blue-600 hover:text-blue-700 transition-colors"
          >
            {data.websiteUrl} ↗
          </a>
        )}
      </div>

      {/* Vehicle grid */}
      <h2 className="text-lg font-semibold text-slate-800 mb-4">
        {data.vehicles.length > 0
          ? `${data.vehicles.length} vehicle${data.vehicles.length !== 1 ? 's' : ''} available`
          : 'Inventory'}
      </h2>

      {data.vehicles.length === 0 ? (
        <EmptyState label="No vehicles currently listed." />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {data.vehicles.map(card => (
            <VehicleCard key={card.listingId} card={card} />
          ))}
        </div>
      )}
    </Shell>
  );
}
