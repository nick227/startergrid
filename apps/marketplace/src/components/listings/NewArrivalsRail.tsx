import type { MarketplaceVehicleCard } from '../../lib/api.ts';
import { formatPrice, formatUsage, vehicleHeading } from '../../lib/display.ts';
import { listingHref } from '../../lib/routes.ts';
import { NEW_ARRIVAL_LABEL } from '../../features/listings/listingBadges.ts';
import { VehicleImage } from '../ui/VehicleImage.tsx';

type Props = {
  slug: string;
  cards: MarketplaceVehicleCard[];
};

export function NewArrivalsRail({ slug, cards }: Props) {
  if (cards.length === 0) return null;

  return (
    <section className="mb-6 sm:mb-8" aria-labelledby="new-arrivals-heading">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 id="new-arrivals-heading" className="mp-section-title">
          {NEW_ARRIVAL_LABEL}s
        </h2>
        <p className="text-sm text-ink-muted">Recently listed</p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-1">
        {cards.map(card => {
          const title = vehicleHeading(card);
          return (
            <a
              key={card.listingId}
              href={listingHref(slug, card.listingId)}
              className="mp-card mp-focus w-56 shrink-0 overflow-hidden transition hover:border-navy-500/40 hover:shadow-elevation-2"
            >
              <div className="aspect-[4/3] bg-surface-inset">
                <VehicleImage src={card.mediaUrls[0]} alt={title} imgClassName="h-full w-full object-cover" />
              </div>
              <div className="space-y-1 p-3">
                <p className="truncate text-sm font-semibold text-ink-heading">{title}</p>
                <p className="text-sm font-bold tabular-nums text-ink">{formatPrice(card.priceCents)}</p>
                {card.mileage > 0 && (
                  <p className="text-xs text-ink-muted">
                    {formatUsage(card.mileage, card.usageUnit === 'hours' ? 'hours' : 'miles')}
                  </p>
                )}
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}
