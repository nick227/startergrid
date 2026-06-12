import { useState } from 'react';
import type { VehicleDetailDto } from '@/lib/api/sdk.ts';
import { markVehicleRemoved } from '@/lib/api/sdk.ts';

type Props = {
  vehicle: VehicleDetailDto;
  onReload: () => void;
};

// Archive, not delete: lifecycle removal keeps the record and its history.
// Hard delete intentionally does not exist in the UI.
export function VehicleDangerZone({ vehicle, onReload }: Props) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = !vehicle.soldAt && !vehicle.removedAt;
  if (!isActive) return null;

  const { liveCount, queuedCount } = vehicle.distribution;

  const handleArchive = async () => {
    setBusy(true);
    setError(null);
    try {
      await markVehicleRemoved(vehicle.dealershipId, vehicle.id);
      onReload();
    } catch (e) {
      setError((e as Error).message || 'Archive failed');
      setBusy(false);
    }
  };

  return (
    <section className="bg-white rounded-xl shadow-sm border border-red-200 p-6">
      <h2 className="text-[10px] font-bold text-red-600 uppercase tracking-widest pb-2 border-b border-red-100">
        Danger Zone
      </h2>
      <div className="mt-4 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold text-ink-heading">Archive vehicle (remove from inventory)</p>
          <ul className="mt-1.5 text-[11px] text-ink-muted space-y-0.5 list-disc list-inside">
            <li>Removes it from the public storefront and marketplace</li>
            <li>
              {liveCount > 0
                ? `Queues takedown from ${liveCount} live channel${liveCount === 1 ? '' : 's'}`
                : 'Not currently live on any channel'}
            </li>
            <li>
              {queuedCount > 0
                ? `Cancels ${queuedCount} pending sync update${queuedCount === 1 ? '' : 's'}`
                : 'No pending sync updates to cancel'}
            </li>
            <li>Preserves sales, lead, performance, and history records — relist any time</li>
          </ul>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-2">
          {!confirming ? (
            <button
              type="button"
              onClick={() => setConfirming(true)}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-red-200 text-red-600 hover:bg-red-50 transition-all shadow-sm"
            >
              Archive Vehicle
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => setConfirming(false)}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-white border border-silver-200 text-ink-muted hover:bg-silver-50 disabled:opacity-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleArchive}
                className="px-3 py-1.5 text-xs font-bold rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-all shadow-sm"
              >
                {busy ? 'Archiving…' : 'Confirm Archive'}
              </button>
            </div>
          )}
          {error && <span className="text-[11px] text-red-600">{error}</span>}
        </div>
      </div>
    </section>
  );
}
