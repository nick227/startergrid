import type { VehicleCore, VehicleCommerce } from '@dealer-marketplace/client';
import { formatPrice } from '../../lib/display.ts';
import { ConditionBadge } from '../ui/ConditionBadge.tsx';

type Props = { core: VehicleCore; commerce: VehicleCommerce };

export function CoreHeaderSection({ core, commerce }: Props) {
  return (
    <header className="space-y-3">
      <ConditionBadge condition={core.condition} />
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{core.title}</h1>
      {core.trim && <p className="text-base text-slate-600 sm:text-lg">{core.trim}</p>}
      <p className="text-2xl font-bold tabular-nums text-slate-900 sm:text-3xl">
        {formatPrice(commerce.priceCents)}
      </p>
      <dl className="grid grid-cols-2 gap-2 text-sm text-slate-600">
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
