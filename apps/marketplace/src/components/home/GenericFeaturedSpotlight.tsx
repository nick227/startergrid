import { useMarketplaceFeed } from '../../hooks/useMarketplaceFeed.ts';
import { useCategorySlug, useCategorySchema } from '../../contexts/CategoryContext.tsx';
import { listingHref, listHref } from '../../lib/routes.ts';

export function GenericFeaturedSpotlight() {
  const slug = useCategorySlug();
  const schema = useCategorySchema();
  // We just fetch 3 items randomly or newest as a fallback "spotlight"
  const { vehicles: items, loading, error } = useMarketplaceFeed({ limit: 3, sortBy: 'newest' });

  // Loading/Fallback
  if (loading) {
    return <div className="py-6 border-y border-silver-200 bg-silver-50 text-center text-sm text-silver-500">Loading featured items...</div>;
  }
  if (error || items.length === 0) {
    return null; // Gracefully degrade if no featured inventory exists
  }

  return (
    <div className="py-6 border-y border-silver-200 bg-silver-50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-navy-800">Featured {schema.label}</h2>
          <a href={listHref(slug)} className="text-sm font-medium text-blue-600 hover:text-blue-800">View all →</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {items.map(item => {
            // Provide a generic fallback title if year/make/model are missing
            const title = [item.year, item.make, item.model].filter(Boolean).join(' ') || 'Featured Item';
            
            return (
              <a key={item.listingId} href={listingHref(slug, item.listingId, title)} className="group flex bg-white rounded-xl shadow-sm border border-silver-200 overflow-hidden hover:shadow-md transition">
                <div className="w-1/3 relative">
                  {item.mediaUrls?.[0] ? (
                    <img src={item.mediaUrls[0]} alt={title} className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="absolute inset-0 bg-silver-200" />
                  )}
                </div>
                <div className="w-2/3 p-3 flex flex-col justify-center">
                  {item.condition && (
                    <span className="text-[10px] font-bold uppercase text-orange-600 mb-1">
                      {item.condition === 'NEW' ? 'New' : 'Great Deal'}
                    </span>
                  )}
                  <h3 className="font-semibold text-navy-900 leading-tight group-hover:text-blue-600 transition-colors line-clamp-2">
                    {title}
                  </h3>
                  {item.priceCents !== undefined && (
                    <p className="mt-1 font-bold text-navy-800">${(item.priceCents / 100).toLocaleString()}</p>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
