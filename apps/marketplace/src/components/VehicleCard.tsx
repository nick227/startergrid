import type { MarketplaceVehicleCard } from '../lib/api.ts';
import { formatPrice, formatMileage } from '../lib/api.ts';
import { dealerLocation, vehicleTitle } from '../lib/vehicleDisplay.ts';
import { listingHref, dealerHref } from '../lib/routes.ts';
import { VehicleImage } from './VehicleImage.tsx';
import { ConditionBadge } from './ConditionBadge.tsx';

type Props = { card: MarketplaceVehicleCard };

export function VehicleCard({ card }: Props) {
  const location = dealerLocation(card.dealerCity, card.dealerState);
  const title = vehicleTitle(card);

  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:border-blue-300 hover:shadow-md">
      <a href={listingHref(card.listingId)} className="block flex-1">
        <VehicleImage
          src={card.mediaUrls[0]}
          alt={title}
          imgClassName="transition-transform duration-200 group-hover:scale-105"
        />

        <div className="space-y-3 p-4">
          <div className="space-y-1">
            <h3 className="text-base font-semibold leading-snug text-slate-900">
              {card.year} {card.make} {card.model}
            </h3>
            {card.trim && (
              <p className="text-sm text-slate-500">{card.trim}</p>
            )}
          </div>

          <p className="text-xl font-bold tabular-nums text-slate-900">
            {formatPrice(card.priceCents)}
          </p>

          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
            <span>{formatMileage(card.mileage)}</span>
            <span className="text-slate-300" aria-hidden="true">·</span>
            <ConditionBadge condition={card.condition} />
          </div>
        </div>
      </a>

      <div className="border-t border-slate-100 px-4 py-3">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Dealer</p>
        <a
          href={dealerHref(card.dealerId)}
          className="mt-0.5 block text-sm font-medium text-slate-700 transition hover:text-blue-600"
        >
          {card.dealerName}
        </a>
        {location && (
          <p className="mt-0.5 text-xs text-slate-500">{location}</p>
        )}
      </div>
    </article>
  );
}
