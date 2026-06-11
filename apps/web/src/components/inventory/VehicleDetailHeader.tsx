import { useState } from 'react';
import type { VehicleDetailDto } from '@/lib/api/sdk.ts';
import { markVehicleSold, markVehicleRemoved, relistVehicle } from '@/lib/api/sdk.ts';

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

  return (
    <div className="sticky top-0 z-10 bg-surface-card border-b border-silver-200 px-4 pt-3 pb-2 shrink-0">
      {/* Row 1: identity + status + close */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-ink-heading leading-snug truncate">{title || 'Vehicle'}</h2>
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
          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${readinessBg[readiness]}`}>
            {readiness}
          </span>
          {isSold && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-navy-50 text-navy-600 border-navy-200">SOLD</span>}
          {isRemoved && !isSold && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-silver-100 text-ink-muted border-silver-200">REMOVED</span>}
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
      <div className="flex flex-wrap items-center gap-1.5 mt-2">
        {isActive && (
          <>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run('sold', () => markVehicleSold(vehicle.dealershipId, vehicle.id))}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-navy-900 text-white hover:bg-navy-800 disabled:opacity-50 transition-colors"
            >
              {busy === 'sold' ? 'Marking…' : 'Mark Sold'}
            </button>
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => run('removed', () => markVehicleRemoved(vehicle.dealershipId, vehicle.id))}
              className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white border border-silver-200 text-ink-body hover:bg-silver-50 disabled:opacity-50 transition-colors"
            >
              {busy === 'removed' ? 'Removing…' : 'Remove'}
            </button>
          </>
        )}
        {(isSold || isRemoved) && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => run('relist', () => relistVehicle(vehicle.dealershipId, vehicle.id))}
            className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
          >
            {busy === 'relist' ? 'Relisting…' : 'Relist'}
          </button>
        )}
        <button
          type="button"
          disabled
          className="px-2.5 py-1 text-[11px] font-semibold rounded-md bg-white border border-silver-200 text-ink-muted cursor-not-allowed"
          title="Queue for publishing (coming soon)"
        >
          Queue Publish
        </button>
        {actionError && (
          <span className="text-[11px] text-red-600 ml-1">{actionError}</span>
        )}
      </div>
    </div>
  );
}
