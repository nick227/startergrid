import { useEffect, type ReactNode } from 'react';
import type { MarketplaceMediaItem } from '@dealer-marketplace/client';
import { VdpMediaKindBadge, VdpMediaLightboxContent } from './VdpMediaLightboxContent.tsx';

type Props = {
  items: MarketplaceMediaItem[];
  index: number;
  alt: string;
  onIndexChange: (index: number) => void;
  onClose: () => void;
  header?: ReactNode;
  footer?: ReactNode;
};

export function VdpMediaLightbox({ items, index, alt, onIndexChange, onClose, header, footer }: Props) {
  const count = items.length;
  const current = count > 0 ? items[Math.min(index, count - 1)] : null;

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && count > 1) onIndexChange((index - 1 + count) % count);
      if (event.key === 'ArrowRight' && count > 1) onIndexChange((index + 1) % count);
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [count, index, onClose, onIndexChange]);

  if (!current) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" role="dialog" aria-modal="true" aria-label="Media viewer">
      <button type="button" className="mp-focus absolute inset-0" aria-label="Close viewer" onClick={onClose} />

      <div className="relative z-10 flex h-[min(90vh,820px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-slate-950 shadow-elevation-3">
        <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3 text-white">
          <div className="min-w-0 flex-1">{header ?? <p className="truncate text-sm font-medium">{current.caption ?? alt}</p>}</div>
          <button type="button" className="mp-focus rounded-pill px-3 py-1 text-sm font-semibold hover:bg-white/10" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="relative min-h-0 flex-1">
          <VdpMediaLightboxContent item={current} alt={alt} />
          <VdpMediaKindBadge kind={current.kind} />
          {count > 1 && (
            <>
              <button
                type="button"
                className="mp-focus absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-lg text-white hover:bg-black/80"
                aria-label="Previous media"
                onClick={() => onIndexChange((index - 1 + count) % count)}
              >
                ‹
              </button>
              <button
                type="button"
                className="mp-focus absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/60 px-3 py-2 text-lg text-white hover:bg-black/80"
                aria-label="Next media"
                onClick={() => onIndexChange((index + 1) % count)}
              >
                ›
              </button>
              <p className="absolute bottom-3 right-3 rounded-pill bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
                {index + 1} / {count}
              </p>
            </>
          )}
        </div>

        {footer && <div className="border-t border-white/10 px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}
