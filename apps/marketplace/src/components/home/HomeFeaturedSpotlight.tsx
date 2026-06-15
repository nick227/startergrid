import { useMarketplaceFeed } from '../../hooks/useMarketplaceFeed.ts';
import { useCategorySlug } from '../../contexts/CategoryContext.tsx';
import { listingHref } from '../../lib/routes.ts';
import { buildAutomotiveListHref } from './automotiveLinks.ts';

export function HomeFeaturedSpotlight() {
  const slug = useCategorySlug();
  const { vehicles, loading, error } = useMarketplaceFeed({ limit: 3, sortBy: 'newest' });

  // Loading/Fallback
  if (loading) {
    return <div className="py-6 border-y border-silver-200 bg-silver-50 text-center text-sm text-silver-500">Loading featured vehicles...</div>;
  }
  if (error || vehicles.length === 0) {
    return null; // Gracefully degrade if no featured inventory exists
  }

  return (
    <div className="py-6 border-y border-silver-200 bg-silver-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-navy-800">Featured Spotlight</h2>
          <a href={buildAutomotiveListHref({ sortBy: 'newest' })} className="text-sm font-medium text-blue-600 hover:text-blue-800">View all →</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {vehicles.map(car => {
            const title = `${car.year} ${car.make} ${car.model}`;
            return (
              <a key={car.listingId} href={listingHref(slug, car.listingId, title)} className="group flex bg-white rounded-xl shadow-sm border border-silver-200 overflow-hidden hover:shadow-md transition">
                <div className="w-1/3 relative">
                  {car.mediaUrls[0] ? (
                    <img src={car.mediaUrls[0]} alt={title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-silver-200" />
                  )}
                </div>
                <div className="w-2/3 p-3 flex flex-col justify-center">
                  <span className="text-[10px] font-bold uppercase text-orange-600 mb-1">{car.condition === 'NEW' ? 'New' : 'Great Deal'}</span>
                  <h3 className="font-semibold text-navy-900 leading-tight group-hover:text-blue-600 transition-colors">
                    {title}
                  </h3>
                  <p className="mt-1 font-bold text-navy-800">${car.priceCents / 100}</p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
