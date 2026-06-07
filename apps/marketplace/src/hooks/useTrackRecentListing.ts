import { useEffect, useRef } from 'react';
import { trackRecentListing, type RecentListingSnapshot } from '../features/listings/recentlyViewed.ts';

export function useTrackRecentListing(snapshot: RecentListingSnapshot | null): void {
  const trackedId = useRef<string | null>(null);

  useEffect(() => {
    if (!snapshot) return;
    if (trackedId.current === snapshot.listingId) return;
    trackedId.current = snapshot.listingId;
    trackRecentListing(snapshot);
  }, [snapshot]);
}
