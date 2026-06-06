import type { MarketplaceVehicleCard } from '../lib/api.ts';
import { formatPrice, formatMileage } from '../lib/api.ts';
import { listingHref, dealerHref } from '../lib/routes.ts';

type Props = { card: MarketplaceVehicleCard };

const CONDITION_LABEL: Record<string, string> = {
  NEW:  'New',
  USED: 'Used',
  CPO:  'Certified',
};

const CONDITION_STYLE: Record<string, string> = {
  NEW:  'bg-blue-50 text-blue-700',
  USED: 'bg-slate-100 text-slate-600',
  CPO:  'bg-emerald-50 text-emerald-700',
};

export function VehicleCard({ card }: Props) {
  const thumb = card.mediaUrls[0];
  const label = CONDITION_LABEL[card.condition] ?? card.condition;
  const style = CONDITION_STYLE[card.condition] ?? 'bg-slate-100 text-slate-600';

  return (
    <a
      href={listingHref(card.listingId)}
      className="group block bg-white rounded-xl border border-slate-200 overflow-hidden hover:border-blue-300 hover:shadow-md transition-all duration-150"
    >
      {/* Image */}
      <div className="aspect-[4/3] bg-slate-100 overflow-hidden">
        {thumb ? (
          <img
            src={thumb}
            alt={`${card.year} ${card.make} ${card.model}`}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-4xl">
            🚗
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-semibold text-slate-900 leading-snug">
            {card.year} {card.make} {card.model}
            {card.trim && <span className="font-normal text-slate-500"> {card.trim}</span>}
          </h3>
          <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full ${style}`}>
            {label}
          </span>
        </div>

        <p className="text-lg font-bold text-slate-900 tabular-nums">
          {formatPrice(card.priceCents)}
        </p>

        <div className="flex items-center gap-3 text-sm text-slate-500">
          <span>{formatMileage(card.mileage)}</span>
          {card.exteriorColor && (
            <>
              <span className="text-slate-300">·</span>
              <span>{card.exteriorColor}</span>
            </>
          )}
        </div>

        <div className="pt-1 border-t border-slate-100 text-xs text-slate-500">
          <a
            href={dealerHref(card.dealerId)}
            onClick={e => e.stopPropagation()}
            className="hover:text-blue-600 transition-colors"
          >
            {card.dealerName}
          </a>
          {(card.dealerCity || card.dealerState) && (
            <span className="ml-1 text-slate-400">
              · {[card.dealerCity, card.dealerState].filter(Boolean).join(', ')}
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
