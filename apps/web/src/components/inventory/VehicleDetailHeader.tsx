import { useState } from 'react';
import type { VehicleDetailDto } from '@/lib/api/sdk.ts';
import { markVehicleSold, relistVehicle, setVehicleListingStatus } from '@/lib/api/sdk.ts';

function formatPrice(cents: number) {
  return cents > 0 ? `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '—';
}

const readinessBg: Record<'READY' | 'WARNING' | 'BLOCKED', string> = {
  READY:   'bg-green-100 text-green-700 border-green-200',
  WARNING: 'bg-amber-100 text-amber-700 border-amber-200',
  BLOCKED: 'bg-red-100 text-red-700 border-red-200',
};

type Props = {
  vehicle: VehicleDetailDto;
  onClose: () => void;
  onReload: () => void;
};

export function VehicleDetailHeader({ vehicle, onClose, onReload }: Props) {
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const title = [vehicle.year, vehicle.make, vehicle.model].filter(Boolean).join(' ');
  const isSold = !!vehicle.soldAt;
  const isRemoved = !!vehicle.removedAt;
  const isActive = !isSold && !isRemoved;
  const isDraft = vehicle.listingStatus === 'DRAFT';
  const readiness = vehicle.readiness.status;

  const run = async (action: string, fn: () => Promise<void>) => {
    setBusy(action);
    setActionError(null);
    try {
      await fn();
      onReload();
    } catch (e) {
      setActionError((e as Error).message || 'Action failed');
    } finally {
      setBusy(null);
    }
  };

  // Derived display state: Draft → Ready → Live on N → Sold/Removed
  const liveCount = vehicle.distribution.liveCount;
  const stateChip = isSold
    ? { label: 'SOLD', cls: 'bg-navy-50 text-navy-600 border-navy-200' }
    : isRemoved
      ? { label: 'REMOVED', cls: 'bg-silver-100 text-ink-muted border-silver-200' }
      : isDraft
        ? { label: 'DRAFT', cls: 'bg-silver-100 text-ink-body border-silver-300' }
        : liveCount > 0
          ? { label: `LIVE ON ${liveCount}`, cls: 'bg-green-100 text-green-700 border-green-200' }
          : { label: 'READY', cls: 'bg-blue-50 text-blue-700 border-blue-200' };

  return (
    <div className="sticky top-0 z-10 bg-white border-b border-silver-200 px-6 pt-5 pb-4 shrink-0 shadow-sm">
      {/* Row 1: identity + status + close */}
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl font-black text-navy-900 tracking-tight leading-snug truncate">{title || 'Vehicle'}</h2>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-ink-muted">
            <span className="font-mono tracking-tight">VIN {vehicle.vin}</span>
            <span>·</span>
            <span>#{vehicle.stockNumber}</span>
            <span>·</span>
            <span className="font-semibold text-ink-body">{formatPrice(vehicle.priceCents)}</span>
            {vehicle.mileage > 0 && <><span>·</span><span>{vehicle.mileage.toLocaleString()} mi</span></>}
            {vehicle.exteriorColor && <><span>·</span><span>{vehicle.exteriorColor}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${stateChip.cls}`}>
            {stateChip.label}
          </span>
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${readinessBg[readiness]}`}>
            {readiness}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="ml-1 w-6 h-6 flex items-center justify-center rounded text-ink-muted hover:text-ink-heading hover:bg-silver-100 transition-colors text-sm leading-none"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Row 2: primary actions */}
      <div className="flex flex-wrap items-center gap-2 mt-3">
        {isActive && (
          <>
            {/* Draft / Ready segmented toggle — distribution gate, not an action */}
            <div className="inline-flex rounded-lg border border-silver-200 overflow-hidden shadow-sm" role="group" aria-label="Listing status">
              <button
                type="button"
                disabled={busy !== null || isDraft}
                onClick={() => run('status', () => setVehicleListingStatus(vehicle.dealershipId, vehicle.id, 'DRAFT'))}
                className={`px-3 py-1.5 text-xs font-bold transition-colors disabled:cursor-default ${
                  isDraft ? 'bg-silver-200 text-ink-heading' : 'bg-white text-ink-muted hover:bg-silver-50'
                }`}
              >
                Draft
              </button>
              <button
                type="button"
                disabled={busy !== null || !isDraft}
                onClick={() => run('status', () => setVehicleListingStatus(vehicle.dealershipId, vehicle.id, 'READY'))}
                className={`px-3 py-1.5 text-xs font-bold transition-colors border-l border-silver-200 disabled:cursor-default ${
                  !isDraft ? 'bg-green-600 text-white' : 'bg-white text-ink-muted hover:bg-green-50'
                }`}
              >
                Ready
              </button>
            </div>
            {isDraft && (
              <span className="text-[11px] text-ink-muted">Internal only — not distributed to storefront or platforms.</span>
            )}

            <span className="grow" />

            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run('sold', () => markVehicleSold(vehicle.dealershipId, vehicle.id))}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-navy-700 text-white hover:bg-navy-800 disabled:opacity-50 transition-all shadow-sm"
            >
              {busy === 'sold' ? 'Marking Sold…' : 'Mark Sold'}
            </button>
          </>
        )}
        {(isSold || isRemoved) && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run('relist', () => relistVehicle(vehicle.dealershipId, vehicle.id))}
            className="px-3 py-1.5 text-xs font-bold rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-all shadow-sm"
          >
            {busy === 'relist' ? 'Relisting…' : 'Relist Vehicle'}
          </button>
        )}
        {actionError && (
          <span className="text-[11px] font-medium text-red-600 ml-2">{actionError}</span>
        )}
      </div>
    </div>
  );
}
