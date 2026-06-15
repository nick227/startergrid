import { useMarketplaceFeed } from '../../hooks/useMarketplaceFeed.ts';
import { useCategorySlug } from '../../contexts/CategoryContext.tsx';
import { listHref, listingHref } from '../../lib/routes.ts';
import { vehicleHeading } from '../../lib/display.ts';
import { ThumbnailCard } from './ThumbnailCard.tsx';
import { usePersonalization } from '../../contexts/PersonalizationContext.tsx';

export function GenericTrendingBento() {
  const slug = useCategorySlug();
  const { vehicles, loading, error } = useMarketplaceFeed({ limit: 5, sortBy: 'relevance' });
  const { recentListings } = usePersonalization();

  if (loading) {
    return <div className="py-12 text-center text-silver-500">Loading trending inventory...</div>;
  }
  if (error || vehicles.length < 1) {
    return null; // hide section if empty
  }

  const featured = vehicles[0];
  const others = vehicles.slice(1, 5);
  const title = recentListings.length > 0 ? "Recommended for You" : "Trending Near You";

  return (
    <div className="py-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-heading tracking-tight">{title}</h2>
        <a href={listHref(slug, { sortBy: 'relevance' })} className="text-sm font-bold text-orange-600 hover:text-orange-700">See all →</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Feature Card */}
        {featured && (
          <a href={listingHref(slug, featured.listingId, vehicleHeading(featured))} className="group relative lg:col-span-2 overflow-hidden shadow-elevation-1 hover:shadow-elevation-2 transition rounded-2xl">
            <div className="absolute inset-0">
              {featured.mediaUrls[0] ? (
                <img src={featured.mediaUrls[0]} alt={vehicleHeading(featured)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
              ) : (
                <div className="w-full h-full bg-navy-800" />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-navy-950/90 via-navy-950/20 to-transparent" />
            </div>
            <div className="absolute top-6 left-6">
              <span className="bg-white/95 backdrop-blur text-navy-900 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest shadow-sm">
                Top Pick
              </span>
            </div>
            <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
              <div>
                <h3 className="text-3xl sm:text-4xl font-extrabold text-white mb-1 tracking-tight">{vehicleHeading(featured)}</h3>
                <p className="text-xl font-bold text-silver-200">${(featured.priceCents / 100).toLocaleString()}</p>
              </div>
              <button className="bg-white/20 hover:bg-white/40 backdrop-blur p-3 rounded-full text-white transition shadow-sm" aria-label="Save">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
                </svg>
              </button>
            </div>
          </a>
        )}

        {/* Smaller Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {others.map(item => (
            <ThumbnailCard
              key={item.listingId}
              link={listingHref(slug, item.listingId, vehicleHeading(item))}
              imageUrl={item.mediaUrls[0] || ''}
              title={vehicleHeading(item)}
              subtitle={`$${(item.priceCents / 100).toLocaleString()}`}
              badge="Trending"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
