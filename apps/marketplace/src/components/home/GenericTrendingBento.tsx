import { useMarketplaceFeed } from '../../hooks/useMarketplaceFeed.ts';
import { useCategorySlug, useCategorySchema } from '../../contexts/CategoryContext.tsx';
import { listHref, listingHref } from '../../lib/routes.ts';
import { vehicleHeading, formatPrice } from '../../lib/display.ts';
import { ThumbnailCard } from './ThumbnailCard.tsx';
import { usePersonalization } from '../../contexts/PersonalizationContext.tsx';

export function GenericTrendingBento() {
  const slug = useCategorySlug();
  const schema = useCategorySchema();
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
    <div className="mp-rail py-10 sm:py-12">
      <div className="mb-6 flex items-center justify-between gap-4">
        <h2 className="mp-home-heading">{title}</h2>
        <a href={listHref(slug, { sortBy: 'relevance' })} className="mp-home-link">See all</a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Large Feature Card */}
        {featured && (() => {
          const defaultImg = schema.id === 'BOATS' ? '/demo-assets/multi-entity-marine.svg' : schema.id === 'EBOOKS' ? '/demo-assets/multi-entity-books.svg' : '/demo-assets/suv-white.svg';
          const heading = (featured as any).title || vehicleHeading(featured);
          return (
            <a href={listingHref(slug, featured.listingId, heading)} className="group relative min-h-[320px] overflow-hidden rounded-xl border border-silver-200 bg-[#e8eef3] shadow-elevation-1 transition hover:shadow-elevation-2 lg:col-span-2">
              <div className="absolute inset-0">
                <img
                  src={featured.mediaUrls[0] || defaultImg}
                  alt=""
                  className="h-full w-full object-contain p-8"
                />
                <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-navy-950/88 to-transparent" />
              </div>
              <div className="absolute left-5 top-5">
                <span className="mp-thumb-badge bg-navy-800">
                  Top pick
                </span>
              </div>
              <div className="absolute bottom-6 left-6 right-6 flex justify-between items-end">
                <div>
                  <h3 className="text-2xl sm:text-4xl font-extrabold text-white mb-1 tracking-tight">{heading}</h3>
                  <p className="text-xl font-bold text-silver-200">{formatPrice(featured.priceCents)}</p>
                </div>
              </div>
            </a>
          );
        })()}

        {/* Smaller Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-6">
          {others.map(item => {
            const defaultImg = schema.id === 'BOATS' ? '/demo-assets/multi-entity-marine.svg' : schema.id === 'EBOOKS' ? '/demo-assets/multi-entity-books.svg' : '/demo-assets/suv-white.svg';
            const heading = (item as any).title || vehicleHeading(item);
            return (
              <ThumbnailCard
                key={item.listingId}
                link={listingHref(slug, item.listingId, heading)}
                imageUrl={item.mediaUrls[0] || defaultImg}
                title={heading}
                subtitle={formatPrice(item.priceCents)}
                badge="Trending"
                fit="contain"
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
