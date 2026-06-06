import { useCallback, useEffect, useRef, useState } from 'react';
import type { MarketplaceMediaItem } from '@dealer-marketplace/client';
import { MarketplaceMediaItem as MediaEnums } from '@dealer-marketplace/client';
import { kindBadge } from '../../../lib/vdpMediaLabels.ts';

type Props = {
  item: MarketplaceMediaItem;
  alt: string;
};

function ZoomableImage({ item, alt }: Props) {
  const [scale, setScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const clampScale = useCallback((value: number) => Math.min(4, Math.max(1, value)), []);

  useEffect(() => {
    setScale(1);
  }, [item.id]);

  return (
    <div
      ref={containerRef}
      className="flex h-full w-full items-center justify-center overflow-hidden bg-black"
      onWheel={event => {
        event.preventDefault();
        setScale(current => clampScale(current + (event.deltaY < 0 ? 0.15 : -0.15)));
      }}
      onDoubleClick={() => setScale(current => (current === 1 ? 2 : 1))}
    >
      <img
        src={item.url}
        alt={item.caption ?? alt}
        className="max-h-full max-w-full object-contain transition-transform duration-150"
        style={{ transform: `scale(${scale})` }}
        draggable={false}
      />
    </div>
  );
}

function VideoPane({ item, alt }: Props) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <video
        key={item.id}
        className="max-h-full max-w-full"
        controls
        playsInline
        preload="metadata"
        poster={item.posterUrl ?? undefined}
        aria-label={item.caption ?? alt}
      >
        <source src={item.url} type={item.mimeType ?? undefined} />
      </video>
    </div>
  );
}

function SpinPane({ item, alt }: Props) {
  const src = item.embedUrl ?? item.url;
  return (
    <div className="flex h-full w-full flex-col bg-black">
      <iframe
        key={item.id}
        src={src}
        title={item.caption ?? `${alt} 360 view`}
        className="h-full w-full border-0"
        allow="fullscreen; accelerometer; gyroscope"
      />
    </div>
  );
}

export function VdpMediaLightboxContent({ item, alt }: Props) {
  switch (item.kind) {
    case MediaEnums.kind.VIDEO:
      return <VideoPane item={item} alt={alt} />;
    case MediaEnums.kind.SPIN_360:
      return <SpinPane item={item} alt={alt} />;
    case MediaEnums.kind.DOORS_OPEN:
    case MediaEnums.kind.IMAGE:
    default:
      return <ZoomableImage item={item} alt={alt} />;
  }
}

export function VdpMediaKindBadge({ kind }: { kind: MarketplaceMediaItem['kind'] }) {
  const label = kindBadge(kind);
  if (!label) return null;
  return (
    <span className="absolute left-2 top-2 rounded-pill bg-black/70 px-2 py-0.5 text-xs font-semibold text-white">
      {label}
    </span>
  );
}
