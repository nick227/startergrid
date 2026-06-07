import { useMemo } from 'react';
import { buildListingShareUrl } from '../../features/listings/listingShare.ts';
import {
  recentListingFromDetail,
  type RecentListingSnapshot,
} from '../../features/listings/recentlyViewed.ts';
import type { MarketplaceVehicleDetailResponse } from '../../lib/api.ts';
import { formatLocation } from '../../lib/display.ts';
import { useTrackRecentListing } from '../../hooks/useTrackRecentListing.ts';
import { RecentlyViewedRail } from './RecentlyViewedRail.tsx';
import { ShareListingButton } from './ShareListingButton.tsx';
import { StickyListingActionPanel } from './StickyListingActionPanel.tsx';

type Props = {
  categorySlug: string;
  listingId: string;
  vehicle: MarketplaceVehicleDetailResponse['vehicle'];
};

export function useListingDetailEngagement({
  categorySlug,
  listingId,
  vehicle,
}: Props) {
  const snapshot = useMemo<RecentListingSnapshot>(
    () => recentListingFromDetail(categorySlug, vehicle),
    [categorySlug, vehicle],
  );

  useTrackRecentListing(snapshot);

  const shareUrl = buildListingShareUrl(categorySlug, listingId);
  const sellerLocation = formatLocation(vehicle.location.dealerCity, vehicle.location.dealerState);

  return {
    shareUrl,
    shareTitle: vehicle.core.title,
    priceSummary: {
      priceCents: vehicle.commerce.priceCents,
    },
    sellerSummary: {
      name: vehicle.location.dealerName,
      location: sellerLocation,
    },
  };
}

export function ListingDetailEngagementPanels({
  categorySlug,
  listingId,
  shareTitle,
  shareUrl,
  priceSummary,
  sellerSummary,
}: {
  categorySlug: string;
  listingId: string;
  shareTitle: string;
  shareUrl: string;
  priceSummary: { priceCents: number; label?: string };
  sellerSummary: { name: string; location: string | null };
}) {
  return (
    <>
      <RecentlyViewedRail categorySlug={categorySlug} excludeListingId={listingId} />
      <StickyListingActionPanel
        priceSummary={priceSummary}
        sellerSummary={sellerSummary}
        shareTitle={shareTitle}
        shareUrl={shareUrl}
      />
    </>
  );
}

export function ListingDetailShareAction({
  shareTitle,
  shareUrl,
  className = '',
}: {
  shareTitle: string;
  shareUrl: string;
  className?: string;
}) {
  return (
    <ShareListingButton title={shareTitle} url={shareUrl} className={className} />
  );
}
