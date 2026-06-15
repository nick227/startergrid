import { useMarketplaceFeed } from '../../hooks/useMarketplaceFeed.ts';
import { useCategorySlug } from '../../contexts/CategoryContext.tsx';
import { listingHref } from '../../lib/routes.ts';
import { buildAutomotiveListHref } from './automotiveLinks.ts';

export function HomeDealsCarousel() {
  const slug = useCategorySlug();
  // Fetch up to 10 vehicles sorted by price ascending for deals
  const { vehicles, loading, error } = useMarketplaceFeed({ limit: 10, sortBy: 'price-asc' });

  if (loading) {
    return <div className="py-12 text-center text-silver-500">Loading deals...</div>;
  }
  if (error || vehicles.length === 0) {
    return null; // hide section if empty
  }

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto overflow-hidden">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-heading tracking-tight">The Best Car Deals</h2>
          <p className="text-ink-muted font-medium mt-1">Vehicles priced below market value.</p>
        </div>
        <a href={buildAutomotiveListHref({ sortBy: 'price-asc' })} className="text-sm font-bold text-orange-600 hover:text-orange-700">View all deals →</a>
      </div>

      <div className="flex overflow-x-auto gap-6 pb-8 hide-scrollbar snap-x snap-mandatory">
        {vehicles.map(car => {
          const discount = car.originalPriceCents ? car.originalPriceCents - car.priceCents : 0;

          return (
            <a key={car.listingId} href={listingHref(slug, car.listingId, `${car.year} ${car.make} ${car.model}`)} className="snap-start shrink-0 w-72 sm:w-80 group flex flex-col bg-surface-card rounded-2xl overflow-hidden shadow-elevation-1 border border-silver-200 hover:shadow-elevation-2 transition">
              <div className="relative h-48">
                {car.mediaUrls[0] ? (
                  <img src={car.mediaUrls[0]} alt={`${car.make} ${car.model}`} className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-silver-200" />
                )}
                <div className="absolute top-3 left-3 bg-status-success-bg text-status-success-text px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider shadow-sm">
                  {discount > 0 ? 'Price Drop' : 'Great Deal'}
                </div>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-ink-heading group-hover:text-orange-600 transition-colors">
                    {car.year} {car.make} {car.model}
                  </h3>
                  <div className="mt-2 flex items-baseline gap-2">
                    <p className="text-xl font-extrabold text-ink-heading">${(car.priceCents / 100).toLocaleString()}</p>
                    {discount > 0 && (
                      <p className="text-xs font-bold text-status-success-text">
                        ${(discount / 100).toLocaleString()} drop
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-silver-100 flex justify-between text-xs text-ink-muted font-medium">
                  <span>{car.mileage.toLocaleString()} mi</span>
                  <span>{car.dealerName}</span>
                </div>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
