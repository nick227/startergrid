import { useState } from 'react';
import type { VdpMediaSlotMap } from '../../../lib/vdpMediaSlotMap.ts';
import { kindBadge } from '../../../lib/vdpMediaLabels.ts';
import { ListingImage } from '../../ui/ListingImage.tsx';

type Props = {
  map: VdpMediaSlotMap;
  alt: string;
  onOpenItem: (itemId: string) => void;
};

export function VdpGalleryMosaic({ map, alt, onOpenItem }: Props) {
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  // Filter out slots that have no item to avoid showing empty boxes on the front page
  const validItems = map.mosaic.filter(m => m.item !== null);
  const totalItems = validItems.length + map.overflow.length;

  if (validItems.length === 0) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-silver-100 text-ink-muted">
        No media available
      </div>
    );
  }

  const heroSlot = validItems[0]!;
  const activeSlot = validItems.find(m => m.item!.id === activeItemId) ?? heroSlot;
  const activeItem = activeSlot.item!;
  const activeBadge = kindBadge(activeItem.kind);

  // We show up to 6 thumbnails on the right
  const thumbnails = validItems.slice(1, 7);
  const remainingCount = totalItems - 1 - thumbnails.length;

  return (
    <section aria-label="Vehicle gallery" className="flex flex-col gap-2 md:flex-row h-[50vh] min-h-[300px] md:min-h-[450px] lg:h-[65vh] lg:max-h-[750px]">
      {/* Main Active Viewer */}
      <button 
        type="button"
        className="mp-focus relative flex-1 overflow-hidden rounded-2xl bg-black group" 
        aria-label={`View ${activeSlot.label}`}
        onClick={() => onOpenItem(activeItem.id)}
      >
        <img 
          src={activeItem.url} 
          alt={`${alt} — ${activeSlot.label}`} 
          className="h-full w-full object-cover transition-opacity duration-300"
          loading="eager"
          decoding="async"
        />
        {activeBadge && (
          <span className="absolute left-4 top-4 rounded-pill bg-black/70 px-3 py-1 text-xs font-semibold text-white">
            {activeBadge}
          </span>
        )}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-sm font-semibold text-white">
            {activeSlot.label}
          </span>
        </div>
      </button>

      {/* Thumbnails Grid */}
      {thumbnails.length > 0 && (
        <div className="grid grid-cols-3 gap-2 md:w-[320px] md:grid-cols-2 md:grid-rows-3 lg:w-[400px]">
          {thumbnails.map((thumb, index) => {
            const isLast = index === thumbnails.length - 1;
            const item = thumb.item!;
            const isActive = item.id === activeItem.id;
            const showOverlay = isLast && remainingCount > 0;

            return (
              <button 
                key={item.id} 
                type="button"
                className={`mp-focus relative overflow-hidden rounded-xl bg-silver-100 transition-all ${isActive ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white' : 'hover:opacity-90'}`}
                aria-label={showOverlay ? 'View all photos' : `View ${thumb.label}`}
                onMouseEnter={() => setActiveItemId(item.id)}
                onClick={() => {
                  if (showOverlay) {
                    onOpenItem(heroSlot.item!.id);
                  } else {
                    onOpenItem(item.id);
                  }
                }}
              >
                <ListingImage 
                  src={item.posterUrl ?? item.url} 
                  alt={thumb.label} 
                  variant="thumb" 
                  className="h-full w-full" 
                  imgClassName="h-full w-full object-cover" 
                />
                
                {/* Kind Badge for thumbnails */}
                {kindBadge(item.kind) && !showOverlay && (
                  <span className="absolute left-2 top-2 rounded-pill bg-black/70 px-2 py-0.5 text-[10px] font-semibold text-white">
                    {kindBadge(item.kind)}
                  </span>
                )}

                {/* 'View All' Overlay on the last thumbnail if there are more items */}
                {showOverlay && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white transition-colors hover:bg-black/70">
                    <div className="text-center">
                      <span className="block text-xl font-bold">+{remainingCount}</span>
                      <span className="text-xs font-medium uppercase tracking-wider">Photos</span>
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
