import { useMarketplaceFeed } from '../../hooks/useMarketplaceFeed.ts';
import { useCategorySlug, useCategorySchema } from '../../contexts/CategoryContext.tsx';
import { listingHref, listHref } from '../../lib/routes.ts';
import { formatPrice } from '../../lib/display.ts';

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
    <div className="border-y border-silver-200 bg-[#f4f7fa] py-8">
      <div className="mp-rail">
        <div className="flex items-center justify-between mb-4">
          <h2 className="mp-home-heading">Featured {schema.label}</h2>
          <a href={listHref(slug)} className="mp-home-link">View all</a>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {items.map(item => {
            const title = (item as any).title || [item.year, item.make, item.model].filter(Boolean).join(' ') || 'Featured Item';
            const defaultImg = schema.id === 'BOATS' ? '/demo-assets/multi-entity-marine.svg' : schema.id === 'EBOOKS' ? '/demo-assets/multi-entity-books.svg' : '/demo-assets/suv-white.svg';
            const imgUrl = item.mediaUrls?.[0] || defaultImg;

            return (
              <a key={item.listingId} href={listingHref(slug, item.listingId, title)} className="group flex min-h-[6.5rem] overflow-hidden rounded-xl border border-silver-200 bg-white transition hover:shadow-elevation-2">
                <div className="flex w-36 shrink-0 items-center justify-center bg-[#e8eef3] p-3 sm:w-40">
                  <img src={imgUrl} alt="" className="h-20 w-full object-contain" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col justify-center px-3.5 py-3">
                  {item.condition && (
                    <span className="mb-1 text-[11px] font-semibold text-ink-muted">
                      {item.condition === 'NEW' ? 'New' : item.condition === 'CPO' ? 'Certified' : 'Used'}
                    </span>
                  )}
                  <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-ink-heading group-hover:text-cta">
                    {title}
                  </h3>
                  {item.priceCents !== undefined && (
                    <p className="mt-1 text-base font-bold tabular-nums text-ink">{formatPrice(item.priceCents)}</p>
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
