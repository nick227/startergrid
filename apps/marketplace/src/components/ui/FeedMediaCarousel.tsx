import { useMemo, useState } from 'react';
import type { MarketplaceCardMediaItem } from '../../lib/api.ts';
import { VEHICLE_FALLBACK_ICON } from './ListingImage.tsx';

type Props = {
  mediaItems?: MarketplaceCardMediaItem[];
  fallbackImageUrls?: string[];
  alt: string;
  eager?: boolean;
  href?: string;
};

function fromFallback(url: string): MarketplaceCardMediaItem {
  return { kind: 'IMAGE' as MarketplaceCardMediaItem['kind'], url, width: null, height: null, mimeType: null, posterUrl: null };
}

export function FeedMediaCarousel({ mediaItems = [], fallbackImageUrls = [], alt, eager = false, href }: Props) {
  const media = useMemo(
    () => mediaItems.length > 0 ? mediaItems : fallbackImageUrls.map(fromFallback),
    [fallbackImageUrls, mediaItems],
  );
  const [active, setActive] = useState(0);
  const count = media.length;
  const current = count > 0 ? media[Math.min(active, count - 1)] : null;

  function move(next: number) {
    if (count <= 1) return;
    setActive((next + count) % count);
  }

  const frame = current?.kind === 'VIDEO' ? (
    <video
      key={current.url}
      className="h-full w-full object-contain p-3"
      controls
      muted
      playsInline
      preload="metadata"
      poster={current.posterUrl ?? undefined}
      aria-label={alt}
    >
      <source src={current.url} type={current.mimeType ?? undefined} />
    </video>
  ) : current ? (
    <img
      src={current.url}
      alt={alt}
      className="h-full w-full object-contain p-4"
      loading={eager ? 'eager' : 'lazy'}
      {...{ fetchpriority: eager ? 'high' : 'auto' }}
      decoding="async"
    />
  ) : (
    <div className="flex h-full w-full flex-col items-center justify-center gap-2" role="img" aria-label={alt}>
      {VEHICLE_FALLBACK_ICON}
      <span className="text-xs font-medium text-ink-faint">Media unavailable</span>
    </div>
  );

  return (
    <div className="mp-thumb-well">
      {href && current?.kind !== 'VIDEO' ? (
        <a href={href} className="mp-focus absolute inset-0 z-0 block">
          {frame}
        </a>
      ) : (
        <div className="absolute inset-0">{frame}</div>
      )}

      {count > 1 && (
        <>
          <button
            type="button"
            onClick={event => { event.preventDefault(); event.stopPropagation(); move(active - 1); }}
            className="mp-focus absolute left-2 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-black/5 bg-white text-ink-heading opacity-0 shadow-sm transition hover:bg-white focus-visible:opacity-100 group-hover:opacity-100"
            aria-label="Previous photo"
          >
            <Chevron direction="left" />
          </button>
          <button
            type="button"
            onClick={event => { event.preventDefault(); event.stopPropagation(); move(active + 1); }}
            className="mp-focus absolute right-2 top-1/2 z-10 flex size-7 -translate-y-1/2 items-center justify-center rounded-full border border-black/5 bg-white text-ink-heading opacity-0 shadow-sm transition hover:bg-white focus-visible:opacity-100 group-hover:opacity-100"
            aria-label="Next photo"
          >
            <Chevron direction="right" />
          </button>
          <div className="absolute bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1.5">
            {media.map((item, index) => (
              <button
                key={`${item.url}-${index}`}
                type="button"
                onClick={event => { event.preventDefault(); event.stopPropagation(); setActive(index); }}
                className={`mp-focus size-1.5 rounded-full transition ${index === active ? 'bg-navy-900' : 'bg-navy-900/30 hover:bg-navy-900/50'}`}
                aria-label={`Photo ${index + 1} of ${count}`}
                aria-current={index === active ? 'true' : undefined}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function Chevron({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="size-4" aria-hidden="true">
      <path fillRule="evenodd" d={direction === 'left'
        ? 'M12.79 5.23a.75.75 0 0 1-.02 1.06L8.832 10l3.938 3.71a.75.75 0 1 1-1.04 1.08l-4.5-4.25a.75.75 0 0 1 0-1.08l4.5-4.25a.75.75 0 0 1 1.06.02Z'
        : 'M7.21 14.77a.75.75 0 0 1 .02-1.06L11.168 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z'} clipRule="evenodd" />
    </svg>
  );
}
