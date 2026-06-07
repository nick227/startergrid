import { useEffect, useRef } from 'react';
import { MarketplaceEventType, trackMarketplaceEvent } from '../lib/events.ts';

type TrackableItem = {
  type: string;
  impressionKey: string;
  listingId?: string;
};

const sent = new Set<string>();

export function useTrackVisibleMarketplaceItem<T extends HTMLElement>(item: TrackableItem) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || sent.has(item.impressionKey)) return;

    if (item.type !== 'vehicle' || !item.listingId) {
      sent.add(item.impressionKey);
      return;
    }

    function send() {
      if (sent.has(item.impressionKey)) return;
      sent.add(item.impressionKey);
      trackMarketplaceEvent({
        eventType: MarketplaceEventType.VEHICLE_IMPRESSION,
        listingId: item.listingId,
      });
    }

    if (!('IntersectionObserver' in window)) {
      send();
      return;
    }

    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.35)) {
        send();
        observer.disconnect();
      }
    }, { threshold: [0.35] });

    observer.observe(node);
    return () => observer.disconnect();
  }, [item.impressionKey, item.listingId, item.type]);

  return ref;
}
