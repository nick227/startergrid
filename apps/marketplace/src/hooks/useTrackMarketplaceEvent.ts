import { useEffect, useRef } from 'react';
import { trackMarketplaceEvent, type MarketplaceTrackEvent } from '../lib/events.ts';

export function useTrackMarketplaceEvent(event: MarketplaceTrackEvent | null): void {
  const sent = useRef(false);

  useEffect(() => {
    if (!event || sent.current) return;
    sent.current = true;
    trackMarketplaceEvent(event);
  }, [event]);
}
