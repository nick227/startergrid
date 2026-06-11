import type { VehicleDistributionDto } from '@/lib/api/sdk.ts';

type Props = {
  distribution: VehicleDistributionDto;
};

export function VehiclePublishingSummary({ distribution }: Props) {
  const metrics = [
    { label: 'Live',    value: distribution.liveCount,    color: distribution.liveCount > 0 ? 'text-green-600' : 'text-ink-faint' },
    { label: 'Queued',  value: distribution.queuedCount,  color: distribution.queuedCount > 0 ? 'text-blue-600' : 'text-ink-faint' },
    { label: 'Failed',  value: distribution.failedCount,  color: distribution.failedCount > 0 ? 'text-red-600' : 'text-ink-faint' },
    { label: 'Blocked', value: distribution.blockedCount, color: distribution.blockedCount > 0 ? 'text-amber-600' : 'text-ink-faint' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {metrics.map(m => (
          <div key={m.label} className="text-center p-2.5 bg-surface-raised rounded-lg border border-silver-100">
            <p className={`text-lg font-bold ${m.color}`}>{m.value}</p>
            <p className="text-[10px] text-ink-faint mt-0.5">{m.label}</p>
          </div>
        ))}
      </div>

      {distribution.totalEligiblePlatforms > 0 && (
        <p className="text-[11px] text-ink-muted">
          {distribution.totalEligiblePlatforms} connected platform{distribution.totalEligiblePlatforms !== 1 ? 's' : ''}
        </p>
      )}

      {distribution.lastSyncAt && (
        <p className="text-[11px] text-ink-muted">
          Last sync: {new Date(distribution.lastSyncAt).toLocaleString(undefined, {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
          })}
        </p>
      )}

      {distribution.nextAction && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          <span className="font-semibold">Next: </span>{distribution.nextAction}
        </div>
      )}

      {!distribution.liveCount && !distribution.queuedCount && !distribution.failedCount && (
        <p className="text-xs text-ink-muted">Not queued for any platform yet.</p>
      )}
    </div>
  );
}
