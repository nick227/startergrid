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
  const validMosaicItems = map.mosaic.filter(m => m.item !== null);
  const overflowCells = map.overflow.map(item => ({
    slot: item.slot ?? 'OVERFLOW',
    angle: item.angle ?? 'MISC',
    label: 'Additional Photo',
    item
  }));
  
  const allAvailableItems = [...validMosaicItems, ...overflowCells];
  const totalItems = allAvailableItems.length;

  if (allAvailableItems.length === 0) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-2xl bg-silver-100 text-ink-muted">
        No media available
      </div>
    );
  }

  const heroSlot = allAvailableItems[0]!;
  const activeSlot = allAvailableItems.find(m => m.item!.id === activeItemId) ?? heroSlot;
  const activeItem = activeSlot.item!;
  const activeBadge = kindBadge(activeItem.kind);

  // We show up to 18 thumbnails on the right (3 columns, 6 rows)
  const thumbnails = allAvailableItems.slice(1, 19);
  const remainingCount = totalItems - 1 - thumbnails.length;

  return (
    <section aria-label="Vehicle gallery" className="flex flex-col gap-2 md:flex-row md:h-[550px] lg:h-[700px] xl:h-[800px]">
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
          className="h-full w-full object-contain transition-opacity duration-300"
          loading="eager"
          decoding="async"
        />
        {activeBadge && (
          <span className="absolute left-4 top-4 rounded-pill bg-black/70 px-3 py-1 text-xs font-semibold text-white">
            {activeBadge}
          </span>
        )}

        {/* Mobile Photo Count Badge */}
        {totalItems > 1 && (
          <div className="absolute bottom-4 right-4 md:hidden rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white flex items-center gap-1.5 z-10">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 013.25 3h13.5A2.25 2.25 0 0119 5.25v9.5A2.25 2.25 0 0116.75 17H3.25A2.25 2.25 0 011 14.75v-9.5zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 00.75-.75v-2.69l-2.22-2.219a.75.75 0 00-1.06 0l-1.91 1.909.47.47a.75.75 0 11-1.06 1.06L6.53 8.091a.75.75 0 00-1.06 0l-2.97 2.97zM12 7a1 1 0 11-2 0 1 1 0 012 0z" clipRule="evenodd" />
            </svg>
            1 / {totalItems}
          </div>
        )}

        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4 opacity-0 transition-opacity group-hover:opacity-100">
          <span className="text-sm font-semibold text-white">
            {activeSlot.label}
          </span>
        </div>
      </button>

      {/* Thumbnails Grid */}
      {thumbnails.length > 0 && (
        <div className="hidden md:grid grid-cols-3 grid-rows-6 gap-2 h-full md:w-[400px] lg:w-[500px] xl:w-[600px]">
          {thumbnails.map((thumb, index) => {
            const isLast = index === thumbnails.length - 1;
            const item = thumb.item!;
            const isActive = item.id === activeItem.id;
            const showOverlay = isLast && remainingCount > 0;

            return (
              <button 
                key={item.id} 
                type="button"
                className={`mp-focus relative h-full w-full overflow-hidden bg-black transition-all ${isActive ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-white' : 'hover:opacity-90'}`}
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
