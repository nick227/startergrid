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
    <div className="border-y border-silver-200 bg-[#f4f7fa] py-8">
      <div className="mp-rail">
        <div className="flex items-center justify-between mb-4">
          <h2 className="mp-home-heading">Featured spotlight</h2>
          <a href={buildAutomotiveListHref({ sortBy: 'newest' })} className="mp-home-link">View all</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {vehicles.map(car => {
            const title = `${car.year} ${car.make} ${car.model}`;
            return (
              <a key={car.listingId} href={listingHref(slug, car.listingId, title)} className="group flex min-h-[6.5rem] overflow-hidden rounded-xl border border-silver-200 bg-white transition hover:shadow-elevation-2">
                <div className="flex w-36 shrink-0 items-center justify-center bg-[#e8eef3] p-3 sm:w-40">
                  {car.mediaUrls[0] ? (
                    <img src={car.mediaUrls[0]} alt="" className="h-20 w-full object-contain" />
                  ) : (
                    <div className="h-20 w-full" />
                  )}
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center px-3.5 py-3">
                  <span className="mb-1 text-[11px] font-semibold text-ink-muted">{car.condition === 'NEW' ? 'New' : car.condition === 'CPO' ? 'Certified' : 'Used'}</span>
                  <h3 className="truncate font-semibold leading-tight text-ink-heading group-hover:text-cta">
                    {title}
                  </h3>
                  <p className="mt-1 text-base font-bold tabular-nums text-ink">${(car.priceCents / 100).toLocaleString()}</p>
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
