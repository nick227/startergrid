import { useMarketplaceFeed } from '../../hooks/useMarketplaceFeed.ts';
import { useCategorySlug, useCategorySchema } from '../../contexts/CategoryContext.tsx';
import { listHref, listingHref } from '../../lib/routes.ts';
import { vehicleHeading, formatUsage } from '../../lib/display.ts';

export function GenericDealsCarousel() {
  const slug = useCategorySlug();
  const schema = useCategorySchema();
  const { vehicles, loading, error } = useMarketplaceFeed({ limit: 10, sortBy: 'price-asc' });

  if (loading) {
    return <div className="py-12 text-center text-silver-500">Loading deals...</div>;
  }
  if (error || vehicles.length === 0) {
    return null; // hide section if empty
  }

  return (
    <div className="mp-rail overflow-hidden py-10 sm:py-12">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h2 className="mp-home-heading">The best deals</h2>
          <p className="mt-1 text-sm text-ink-muted">Listings priced below the previous asking price.</p>
        </div>
        <a href={listHref(slug, { sortBy: 'price-asc' })} className="mp-home-link">View all deals</a>
      </div>

      <div className="flex overflow-x-auto gap-6 pb-8 hide-scrollbar snap-x snap-mandatory">
        {vehicles.map(item => {
          const discount = item.originalPriceCents ? item.originalPriceCents - item.priceCents : 0;
          const title = vehicleHeading(item);

          return (
            <a key={item.listingId} href={listingHref(slug, item.listingId, title)} className="group flex w-72 shrink-0 snap-start flex-col overflow-hidden rounded-xl border border-silver-200 bg-white transition hover:shadow-elevation-2 sm:w-80">
              <div className="mp-thumb-well">
                {item.mediaUrls[0] ? (
                  <img src={item.mediaUrls[0]} alt="" className="absolute inset-0 h-full w-full object-contain p-4" />
                ) : (
                  <div className="absolute inset-0" />
                )}
                {discount > 0 && (
                  <div className="absolute left-3 top-3">
                    <span className="mp-thumb-badge bg-emerald-700">New price</span>
                  </div>
                )}
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-semibold text-ink-heading group-hover:text-cta">
                    {title}
                  </h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-lg font-bold tabular-nums text-ink">${(item.priceCents / 100).toLocaleString()}</p>
                    {discount > 0 && (
                      <p className="text-xs font-bold text-status-success-text">
                        ${(discount / 100).toLocaleString()} drop
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-silver-100 flex justify-between text-xs text-ink-muted font-medium">
                  {item.mileage > 0 ? (
                    <span>{formatUsage(item.mileage, item.usageUnit === 'hours' || schema.id === 'BOATS' ? 'hours' : 'miles')}</span>
                  ) : item.trim ? (
                    <span>{item.trim}</span>
                  ) : null}
                  <span>{item.dealerName}</span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
