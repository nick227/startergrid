import { lastSyncSummary } from '@/lib/syncPresentation.ts';
import { EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import type { SyncEvent } from '@/lib/types.ts';

type Props = { events: SyncEvent[] | null };

export function LastSyncLine({ events }: Props) {
  const summary = events?.length ? lastSyncSummary(events) : null;

  return (
    <p className="text-center text-xs text-ink-muted py-2">
      {summary ? (
        <>
          <span className="font-semibold text-ink-body">Last update:</span> {summary.when} — {summary.what}
        </>
      ) : (
        EMPTY_STATE_COPY.noSyncActivity.subtitle
      )}
    </p>
  );
}
