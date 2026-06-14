import { useEffect, useState, type ReactNode, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { MarketplaceMediaItem, VehicleLocation } from '@dealer-marketplace/client';
import { VdpMediaKindBadge, VdpMediaLightboxContent } from './VdpMediaLightboxContent.tsx';
import { ListingImage } from '../../ui/ListingImage.tsx';

type Props = {
  items: MarketplaceMediaItem[];
  index: number;
  alt: string;
  location?: VehicleLocation;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  header?: ReactNode;
  footer?: ReactNode;
};

import { VDP_MOSAIC_SLOT_ORDER } from '../../../lib/vdpMediaSlotMap.ts';

function getDynamicCategory(item: MarketplaceMediaItem): string {
  let angle = item.angle;

  // If the item is assigned to a specific slot, use the canonical angle for that slot
  // to ensure perfectly synchronized categorizations across the UI.
  if (item.slot && item.slot !== 'OVERFLOW') {
    const slotDef = VDP_MOSAIC_SLOT_ORDER.find(s => s.slot === item.slot);
    if (slotDef) {
      angle = slotDef.angle;
    }
  }

  if (!angle) return 'Miscellaneous';
  const primary = angle.split('_')[0]!;
  if (primary === 'CONDITION') return 'Miscellaneous'; // Optional: group condition with misc or keep it separate
  return primary.charAt(0).toUpperCase() + primary.slice(1).toLowerCase();
}

export function VdpMediaLightbox({ items, index, alt, location, onIndexChange, onClose, header, footer }: Props) {
  const count = items.length;
  const current = count > 0 ? items[Math.min(index, count - 1)]! : null;

  const [fullScreen, setFullScreen] = useState(false);
  const activeThumbnailRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (fullScreen) setFullScreen(false);
        else onClose();
      }
      if (event.key === 'ArrowLeft' && count > 1) onIndexChange((index - 1 + count) % count);
      if (event.key === 'ArrowRight' && count > 1) onIndexChange((index + 1) % count);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [count, index, onClose, onIndexChange, fullScreen]);

  useEffect(() => {
    if (!fullScreen && activeThumbnailRef.current) {
      activeThumbnailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [index, fullScreen]);

  // Trap focus / disable body scroll when mounted
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  if (!current) return null;

  // Group items by category
  const groupedItems = items.reduce((acc, item, idx) => {
    const cat = getDynamicCategory(item);
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ item, globalIndex: idx });
    return acc;
  }, {} as Record<string, Array<{item: MarketplaceMediaItem, globalIndex: number}>>);

  const renderSection = (cat: string) => {
    const group = groupedItems[cat];
    if (!group || group.length === 0) return null;

    return (
      <div key={cat} className="mb-6">
        <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-slate-400">
          {cat}
        </h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {group.map(({ item, globalIndex }) => {
            const isActive = globalIndex === index;
            return (
              <button
                key={item.id}
                ref={isActive ? activeThumbnailRef : null}
                type="button"
                className={`mp-focus relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-xl bg-black transition-all ${
                  isActive ? 'ring-2 ring-blue-500 ring-offset-2 ring-offset-slate-900 opacity-100' : 'opacity-60 hover:opacity-100'
                }`}
                onClick={() => onIndexChange(globalIndex)}
              >
                <ListingImage 
                  src={item.posterUrl ?? item.url} 
                  alt={item.caption ?? alt} 
                  variant="thumb" 
                  className="h-full w-full" 
                  imgClassName="h-full w-full object-cover" 
                />
                {item.kind !== 'IMAGE' && (
                  <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1 py-0.5 text-[9px] font-bold text-white uppercase">
                    {item.kind === 'VIDEO' ? 'VIDEO' : item.kind === 'SPIN_360' ? '360°' : item.kind}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const modalContent = (
    <>
      {/* 
        Level 3: Pure Full Screen Mode 
        Triggered when clicking the main active image.
      */}
      {fullScreen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black">
          <button 
            type="button" 
            onClick={() => setFullScreen(false)}
            className="mp-focus absolute right-6 top-6 z-10 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Exit full screen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          
          <img 
            src={current.url} 
            alt={alt} 
            className="h-screen w-screen object-contain"
          />

          {count > 1 && (
            <>
              <button
                type="button"
                className="mp-focus absolute left-6 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-4 text-white hover:bg-black/80"
                onClick={() => onIndexChange((index - 1 + count) % count)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
                </svg>
              </button>
              <button
                type="button"
                className="mp-focus absolute right-6 top-1/2 -translate-y-1/2 rounded-full bg-black/60 p-4 text-white hover:bg-black/80"
                onClick={() => onIndexChange((index + 1) % count)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="size-8">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </button>
            </>
          )}
        </div>
      )}

      {/* Level 2: Browser Mode */}
      <div className="fixed inset-0 z-[100] flex flex-col bg-slate-900" role="dialog" aria-modal="true" aria-label="Media viewer">
        
        {/* Top Header */}
        <div className="flex h-[72px] shrink-0 items-center justify-between border-b border-white/10 px-6">
          <div className="flex min-w-0 flex-1 flex-col justify-center">
            {location && (
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-3">
                  <path fillRule="evenodd" d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                </svg>
                {location.dealerName}
              </div>
            )}
            {header ?? <h2 className="truncate text-lg font-bold text-white">{alt}</h2>}
          </div>

          <div className="flex shrink-0 items-center justify-end">
            <button type="button" className="mp-focus rounded-pill bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20" onClick={onClose}>
              Close
            </button>
          </div>
        </div>

        {/* Main Layout */}
        <div className="flex flex-1 min-h-0 w-full flex-col md:flex-row p-4 gap-4">
          
          {/* Left Pane: Main Media Viewer */}
          <div className="relative flex min-h-[40vh] md:min-h-0 w-full md:max-w-[800px] xl:max-w-[1200px] flex-col overflow-hidden rounded-2xl bg-black shadow-elevation-3">
            <button 
              type="button"
              className="relative min-h-0 flex-1 group cursor-zoom-in"
              onClick={() => setFullScreen(true)}
              aria-label="View full screen"
            >
              <VdpMediaLightboxContent item={current} alt={alt} />
              <VdpMediaKindBadge kind={current.kind} />
              
              {count > 1 && (
                <>
                  <button
                    type="button"
                    className="mp-focus absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-3 text-xl text-white hover:bg-black/80"
                    aria-label="Previous media"
                    onClick={(e) => { e.stopPropagation(); onIndexChange((index - 1 + count) % count); }}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="mp-focus absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-3 text-xl text-white hover:bg-black/80"
                    aria-label="Next media"
                    onClick={(e) => { e.stopPropagation(); onIndexChange((index + 1) % count); }}
                  >
                    ›
                  </button>
                </>
              )}
            </button>
            
            {footer && <div className="border-t border-white/10 bg-slate-950 p-4">{footer}</div>}
          </div>

          {/* Right Pane: Thumbnail Sidebar */}
          <div className="flex-1 overflow-y-auto pr-2">
            {Object.keys(groupedItems).map(cat => renderSection(cat))}
          </div>

        </div>
      </div>
    </>
  );

  return createPortal(modalContent, document.body);
}
