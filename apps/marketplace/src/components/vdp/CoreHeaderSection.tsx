import type { VehicleCore, VehicleCommerce, VehicleLocation } from '@dealer-marketplace/client';
import { formatPrice } from '../../lib/display.ts';
import { ConditionBadge } from '../ui/ConditionBadge.tsx';

type Props = { core: VehicleCore; commerce: VehicleCommerce; location: VehicleLocation };

export function CoreHeaderSection({ core, commerce, location }: Props) {
  return (
    <header className="space-y-4">
      {/* Dealership Branding at top */}
      <div className="flex items-center gap-2 text-sm font-semibold text-slate-500 uppercase tracking-wide">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-4">
          <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
        </svg>
        {location.dealerName}
      </div>

      <div className="space-y-2">
        <ConditionBadge condition={core.condition} />
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{core.title}</h1>
        {core.trim && <p className="text-lg text-slate-600 sm:text-xl">{core.trim}</p>}
      </div>

      <p className="text-3xl font-bold tabular-nums text-slate-900 sm:text-4xl">
        {formatPrice(commerce.priceCents)}
      </p>

      <dl className="grid grid-cols-2 gap-2 text-sm text-slate-600 pt-2 border-t border-slate-100">
        <div>
          <dt className="mp-label text-slate-400">Stock #</dt>
          <dd className="font-medium text-slate-800">{core.stockNumber}</dd>
        </div>
        <div>
          <dt className="mp-label text-slate-400">VIN</dt>
          <dd className="font-mono text-xs font-medium text-slate-800 sm:text-sm">{core.vin}</dd>
        </div>
      </dl>
    </header>
  );
}
