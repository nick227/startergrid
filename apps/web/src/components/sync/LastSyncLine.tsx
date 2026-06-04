import { lastSyncSummary } from '@/lib/syncPresentation.ts';
import type { SyncEvent } from '@/lib/types.ts';

type Props = { events: SyncEvent[] | null };

export function LastSyncLine({ events }: Props) {
  const summary = events?.length ? lastSyncSummary(events) : null;

  return (
    <p className="text-center text-xs text-slate-500 py-2">
      {summary ? (
        <>
          <span className="font-semibold text-slate-600">Last time:</span> {summary.when} — {summary.what}
        </>
      ) : (
        'No sync run recorded yet for this dealer.'
      )}
    </p>
  );
}
