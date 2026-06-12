import { useMemo, useState } from 'react';
import type { MarketplaceCardMediaItem } from '../../lib/api.ts';
import { VEHICLE_FALLBACK_ICON } from './ListingImage.tsx';

type Props = {
  mediaItems: MarketplaceCardMediaItem[];
  fallbackImageUrls?: string[];
  alt: string;
  eager?: boolean;
};

function fromFallback(url: string): MarketplaceCardMediaItem {
  return { kind: 'IMAGE' as MarketplaceCardMediaItem['kind'], url, width: null, height: null, mimeType: null, posterUrl: null };
}

export function FeedMediaCarousel({ mediaItems, fallbackImageUrls = [], alt, eager = false }: Props) {
  const media = useMemo(
    () => mediaItems.length > 0 ? mediaItems : fallbackImageUrls.map(fromFallback),
    [fallbackImageUrls, mediaItems],
  );
  const [active, setActive] = useState(0);
  const count = media.length;
  const current = count > 0 ? media[Math.min(active, count - 1)] : null;

  function move(delta: number) {
    if (count <= 1) return;
    setActive(index => (index + delta + count) % count);
  }

  return (
    <div className="relative mp-aspect-vehicle overflow-hidden rounded-lg bg-surface-inset">
      {current ? (
        current.kind === 'VIDEO' ? (
          <video
            key={current.url}
            className="h-full w-full object-cover"
            controls
            muted
            playsInline
            preload="metadata"
            poster={current.posterUrl ?? undefined}
            aria-label={alt}
          >
            <source src={current.url} type={current.mimeType ?? undefined} />
          </video>
        ) : (
          <img
            src={current.url}
            alt={alt}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            loading={eager ? 'eager' : 'lazy'}
            {...{ fetchpriority: eager ? 'high' : 'auto' }}
            decoding="async"
          />
        )
      ) : (
        <div className="flex h-full w-full flex-col items-center justify-center gap-2" role="img" aria-label={alt}>
          {VEHICLE_FALLBACK_ICON}
          <span className="text-xs font-medium text-ink-faint">Media unavailable</span>
        </div>
      )}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={event => { event.preventDefault(); move(-1); }}
            className="mp-focus absolute left-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-semibold text-ink-heading shadow-elevation-2 hover:bg-white"
            aria-label="Previous media"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={event => { event.preventDefault(); move(1); }}
            className="mp-focus absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-lg font-semibold text-ink-heading shadow-elevation-2 hover:bg-white"
            aria-label="Next media"
          >
            ›
          </button>
          <div className="absolute bottom-2 right-2 rounded-pill bg-black/70 px-2.5 py-1 text-xs font-semibold text-white">
            {active + 1}/{count}
          </div>
        </>
      )}
    </div>
  );
}
