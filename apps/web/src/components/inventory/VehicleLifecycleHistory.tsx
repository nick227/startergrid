import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchVehicleLifecycleEvents } from '@/lib/api/sdk.ts';
import {
  formatLifecycleTransition,
  LIFECYCLE_SOURCE_LABELS,
  LIFECYCLE_STATE_PILL,
} from '@/lib/lifecycleDisplay.ts';

type Props = {
  dealerId: string;
  stockNumber: string;
};

function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function VehicleLifecycleHistory({ dealerId, stockNumber }: Props) {
  const { data, loading, error } = useAsyncQuery(
    () => fetchVehicleLifecycleEvents(dealerId, { stockNumber, limit: 20 }),
    [dealerId, stockNumber],
  );

  const events = data?.events ?? [];

  return (
    <section>
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
        Lifecycle history
      </h4>
      {loading && !data && (
        <p className="text-xs text-slate-400">Loading history…</p>
      )}
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
      {!loading && events.length === 0 && (
        <p className="text-xs text-slate-500">No lifecycle changes recorded yet.</p>
      )}
      {events.length > 0 && (
        <ul className="space-y-2">
          {events.map(ev => (
            <li
              key={ev.id}
              className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-xs"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className={`px-2 py-0.5 rounded border font-semibold ${LIFECYCLE_STATE_PILL[ev.toState]}`}>
                  {formatLifecycleTransition(ev.fromState, ev.toState)}
                </span>
                <span className="text-slate-400">{formatWhen(ev.statusChangedAt)}</span>
              </div>
              <p className="text-slate-600 mt-1">
                {LIFECYCLE_SOURCE_LABELS[ev.source]}
                {ev.note ? ` · ${ev.note}` : ''}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
