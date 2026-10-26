import { useCallback, useEffect, useState } from 'react';
import { fetchDealershipActivity, type DealershipActivityEvent } from '@/lib/api/dealershipRecordApi.ts';
import { activitySentence, relativeTime } from '@/lib/dealershipLabels.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';

/** Recorded events only. Nothing here is synthesized. */
export function DealershipActivity({ dealerId, refreshKey }: { dealerId: string; refreshKey?: number }) {
  const [events, setEvents] = useState<DealershipActivityEvent[] | null>(null);
  const [nextBefore, setNextBefore] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async (before?: string | null) => {
    try {
      const page = await fetchDealershipActivity(dealerId, { before, limit: 50 });
      setEvents(prev => (before && prev ? [...prev, ...page.events] : page.events));
      setNextBefore(page.nextBefore);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load activity.');
    }
  }, [dealerId]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  if (error && !events) {
    return (
      <div className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white text-sm text-ink-body">
        {error} <button type="button" onClick={() => void load()} className="ml-2 font-semibold text-navy-700 hover:underline">Try again</button>
      </div>
    );
  }
  if (!events) return <div className="surface-card-operator p-6"><Skeleton rows={5} /></div>;

  return (
    <div className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white space-y-4">
      <h2 className="text-base font-semibold text-ink-heading">Activity</h2>
      {events.length === 0 ? (
        <p className="text-sm text-ink-muted">Nothing has been recorded for this dealership yet.</p>
      ) : (
        <ol className="space-y-3">
          {events.map(event => (
            <li key={event.id} className="flex items-start justify-between gap-4 text-sm">
              <div className="min-w-0">
                <p className="text-ink-heading">{activitySentence(event)}</p>
                <p className="text-xs text-ink-muted truncate">{event.actorEmail}</p>
              </div>
              <time dateTime={event.createdAt} title={new Date(event.createdAt).toLocaleString()} className="text-xs text-ink-muted shrink-0">
                {relativeTime(event.createdAt)}
              </time>
            </li>
          ))}
        </ol>
      )}
      {nextBefore && (
        <button type="button" disabled={loadingMore}
          onClick={() => { setLoadingMore(true); void load(nextBefore).finally(() => setLoadingMore(false)); }}
          className="text-sm font-semibold text-navy-700 hover:underline disabled:opacity-40">
          {loadingMore ? 'Loading…' : 'Show older activity'}
        </button>
      )}
    </div>
  );
}
