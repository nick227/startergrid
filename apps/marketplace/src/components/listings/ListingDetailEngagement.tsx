import { useMemo, useState } from 'react';
import { buildListingShareUrl } from '../../features/listings/listingShare.ts';
import {
  recentListingFromDetail,
  type RecentListingSnapshot,
} from '../../features/listings/recentlyViewed.ts';
import type { MarketplaceVehicleCtas, MarketplaceVehicleDetailResponse } from '../../lib/api.ts';
import { formatLocation } from '../../lib/display.ts';
import { useTrackRecentListing } from '../../hooks/useTrackRecentListing.ts';
import { RecentlyViewedRail } from './RecentlyViewedRail.tsx';
import { ShareListingButton } from './ShareListingButton.tsx';
import { StickyListingActionPanel } from './StickyListingActionPanel.tsx';
import { ReportListingModal } from './ReportListingModal.tsx';

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

  const shareUrl = buildListingShareUrl(categorySlug, listingId, vehicle.core.title);
  const sellerLocation = formatLocation(vehicle.location.dealerCity, vehicle.location.dealerState);

  return {
    shareUrl,
    shareTitle: vehicle.core.title,
    priceSummary: {
      priceCents:         vehicle.commerce.priceCents,
      originalPriceCents: vehicle.commerce.originalPriceCents,
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
  ctas,
}: {
  categorySlug: string;
  listingId: string;
  shareTitle: string;
  shareUrl: string;
  priceSummary: { priceCents: number; originalPriceCents?: number | null; label?: string };
  sellerSummary: { name: string; location: string | null };
  ctas?: MarketplaceVehicleCtas;
}) {
  return (
    <>
      <RecentlyViewedRail categorySlug={categorySlug} excludeListingId={listingId} />
      <StickyListingActionPanel
        priceSummary={priceSummary}
        sellerSummary={sellerSummary}
        shareTitle={shareTitle}
        shareUrl={shareUrl}
        ctas={ctas}
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

export function ReportListingButton({ listingId }: { listingId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mp-focus text-xs text-ink-faint underline-offset-2 hover:text-ink-muted hover:underline"
      >
        Report listing
      </button>
      {open && <ReportListingModal listingId={listingId} onClose={() => setOpen(false)} />}
    </>
  );
}
