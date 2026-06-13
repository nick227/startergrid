import { useEffect, useMemo, useState, type ReactNode, useRef } from 'react';
import type { MarketplaceMediaItem } from '@dealer-marketplace/client';
import { VdpMediaKindBadge, VdpMediaLightboxContent } from './VdpMediaLightboxContent.tsx';
import { ListingImage } from '../../ui/ListingImage.tsx';

type Props = {
  items: MarketplaceMediaItem[];
  index: number;
  alt: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  header?: ReactNode;
  footer?: ReactNode;
};

type TabKey = 'ALL' | 'EXTERIOR' | 'INTERIOR' | 'IMPERFECTIONS';

const TAB_LABELS: Record<TabKey, string> = {
  ALL: 'View all',
  EXTERIOR: 'Exterior',
  INTERIOR: 'Interior',
  IMPERFECTIONS: 'Imperfections',
};

function getCategory(item: MarketplaceMediaItem): TabKey | null {
  if (item.angle?.startsWith('EXTERIOR')) return 'EXTERIOR';
  if (item.angle?.startsWith('INTERIOR')) return 'INTERIOR';
  if (item.angle === 'CONDITION' || item.angle === 'DETAIL') return 'IMPERFECTIONS';
  return null;
}

export function VdpMediaLightbox({ items, index, alt, onIndexChange, onClose, header, footer }: Props) {
  const count = items.length;
  const current = count > 0 ? items[Math.min(index, count - 1)]! : null;

  const [activeTab, setActiveTab] = useState<TabKey>('ALL');

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && count > 1) onIndexChange((index - 1 + count) % count);
      if (event.key === 'ArrowRight' && count > 1) onIndexChange((index + 1) % count);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [count, index, onClose, onIndexChange]);

  useEffect(() => {
    if (!current) return;
    if (activeTab === 'ALL') return;
    const category = getCategory(current);
    if (category && category !== activeTab) {
      setActiveTab(category);
    }
  }, [current, activeTab]);

  const filteredItems = useMemo(() => {
    if (activeTab === 'ALL') return items;
    return items.filter(i => getCategory(i) === activeTab);
  }, [items, activeTab]);

  const activeThumbnailRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (activeThumbnailRef.current) {
      activeThumbnailRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [index, activeTab]);

  if (!current) return null;

  const tabs: TabKey[] = ['ALL', 'EXTERIOR', 'INTERIOR', 'IMPERFECTIONS'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900" role="dialog" aria-modal="true" aria-label="Media viewer">
      
      {/* Top Header */}
      <div className="absolute inset-x-0 top-0 z-10 flex h-[72px] items-center justify-between border-b border-white/10 px-6">
        <div className="min-w-0 flex-1">
          {header ?? <h2 className="truncate text-lg font-bold text-white">{alt}</h2>}
        </div>

        {/* Tabs */}
        <div className="hidden flex-1 items-center justify-center gap-6 md:flex">
          {tabs.map(tab => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`mp-focus border-b-2 px-1 py-5 text-sm font-semibold transition-colors ${
                activeTab === tab ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:text-white'
              }`}
            >
              {TAB_LABELS[tab]}
            </button>
          ))}
        </div>

        <div className="flex flex-1 items-center justify-end">
          <button type="button" className="mp-focus rounded-pill bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      {/* Main Layout */}
      <div className="relative z-10 mt-[72px] flex h-[calc(100vh-72px)] w-full max-w-[1600px] overflow-hidden p-4">
        
        {/* Left Pane: Main Media Viewer */}
        <div className="relative flex flex-1 flex-col overflow-hidden rounded-2xl bg-black shadow-elevation-3">
          <div className="relative min-h-0 flex-1">
            <VdpMediaLightboxContent item={current} alt={alt} />
            <VdpMediaKindBadge kind={current.kind} />
            
            {count > 1 && (
              <>
                <button
                  type="button"
                  className="mp-focus absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-3 text-xl text-white hover:bg-black/80"
                  aria-label="Previous media"
                  onClick={() => onIndexChange((index - 1 + count) % count)}
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="mp-focus absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-4 py-3 text-xl text-white hover:bg-black/80"
                  aria-label="Next media"
                  onClick={() => onIndexChange((index + 1) % count)}
                >
                  ›
                </button>
              </>
            )}
          </div>
          
          {footer && <div className="border-t border-white/10 bg-slate-950 p-4">{footer}</div>}
        </div>

        {/* Right Pane: Thumbnail Sidebar */}
        <div className="hidden w-[360px] flex-col gap-3 overflow-y-auto pl-4 md:flex">
          <div className="grid grid-cols-2 gap-3">
            {filteredItems.map(item => {
              const globalIndex = items.indexOf(item);
              const isActive = globalIndex === index;
              return (
                <button
                  key={item.id}
                  ref={isActive ? activeThumbnailRef : null}
                  type="button"
                  className={`mp-focus relative h-28 shrink-0 overflow-hidden rounded-xl bg-slate-800 transition-all ${
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

      </div>
    </div>
  );
}
