import type { PlatformQueueStats } from '@/lib/types.ts';
import { formatQueueSchedule, postingModeLabel } from '@/lib/queueControl.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { Button } from '@/components/ui/Button.tsx';

type Props = {
  platformName: string;
  platformSlug: string;
  stats: PlatformQueueStats | null;
  readyVehicleCount?: number;
  nav: OperatorNavHandlers;
  onDismiss: () => void;
};

export function PlatformConnectBanner({
  platformName,
  platformSlug,
  stats,
  readyVehicleCount,
  nav,
  onDismiss,
}: Props) {
  const scheduled = stats?.scheduled ?? 0;
  const needsApproval = stats?.needsApproval ?? 0;
  const queued = (stats?.queued ?? 0) + scheduled;
  const nextBatch = stats?.nextScheduledFor ? formatQueueSchedule(stats.nextScheduledFor) : null;

  return (
    <section className="mb-5 rounded-xl border border-green-200 bg-green-50/80 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <p className="text-sm font-bold text-green-900">{platformName} is connected.</p>
          {readyVehicleCount != null && readyVehicleCount > 0 && (
            <p className="text-sm text-green-800">
              {readyVehicleCount} selected {readyVehicleCount === 1 ? 'item is' : 'items are'} ready for first publish.
            </p>
          )}
          <ul className="text-sm text-green-800 space-y-0.5">
            {scheduled > 0 && (
              <li>
                {scheduled} scheduled{nextBatch ? ` for ${nextBatch}` : ''}.
              </li>
            )}
            {needsApproval > 0 && (
              <li>{needsApproval} need approval before they can go out.</li>
            )}
            {queued === 0 && needsApproval === 0 && (
              <li>Inventory changes will appear here when they are queued for this channel.</li>
            )}
            {stats && (
              <li className="text-xs text-green-700/80 pt-1">
                Posting mode: {postingModeLabel(stats.postingMode)}
              </li>
            )}
          </ul>
        </div>
        <div className="flex flex-wrap gap-2 shrink-0">
          <Button size="sm" onClick={() => nav.goToPlatformQueue(platformSlug)}>
            {operatorCopy.platforms.openQueue}
          </Button>
          <Button size="sm" variant="secondary" onClick={() => nav.goToPlatformDetail(platformSlug)}>
            Channel settings
          </Button>
          <button
            type="button"
            onClick={onDismiss}
            className="px-3 py-1.5 text-xs font-semibold text-green-800/70 hover:text-green-900"
          >
            Dismiss
          </button>
        </div>
      </div>
    </section>
  );
}
