import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchPublishQueue } from '@/lib/api/sdk.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { formatQueueSchedule, postingModeLabel } from '@/lib/queueControl.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

type Props = {
  dealerId: string;
  platformSlug: string;
  nav: OperatorNavHandlers;
};

export function PlatformQueueSummaryCard({ dealerId, platformSlug, nav }: Props) {
  const { data } = useAsyncQuery(() => fetchPublishQueue(dealerId), [dealerId]);
  const stats = data?.byPlatform?.find(p => p.platformSlug === platformSlug);

  if (!stats) return null;

  const inFlight = stats.scheduled + stats.queued + stats.needsApproval + stats.blocked + stats.held;
  if (inFlight === 0 && !stats.nextScheduledFor) return null;

  return (
    <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-5 space-y-3">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint">Posting schedule</h2>
      <dl className="space-y-2 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-ink-muted">Mode</dt>
          <dd className="font-semibold text-ink-body">{postingModeLabel(stats.postingMode)}</dd>
        </div>
        {stats.nextScheduledFor && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Next batch</dt>
            <dd className="font-semibold text-ink-body">{formatQueueSchedule(stats.nextScheduledFor)}</dd>
          </div>
        )}
        {inFlight > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">In queue</dt>
            <dd className="font-semibold text-ink-body">{inFlight}</dd>
          </div>
        )}
        {stats.needsApproval > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Needs approval</dt>
            <dd className="font-semibold text-amber-700">{stats.needsApproval}</dd>
          </div>
        )}
        {stats.blocked > 0 && (
          <div className="flex justify-between gap-3">
            <dt className="text-ink-muted">Blocked</dt>
            <dd className="font-semibold text-red-700">{stats.blocked}</dd>
          </div>
        )}
      </dl>
      <button
        type="button"
        onClick={() => nav.goToPlatformQueue(platformSlug)}
        className="text-sm font-semibold text-navy-600 hover:text-navy-800"
      >
        {operatorCopy.platforms.viewQueueForPlatform} →
      </button>
    </div>
  );
}
