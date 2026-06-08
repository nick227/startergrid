import {
  LISTING_INQUIRY_TARGET_ID,
  runListingPrimaryAction,
  type ListingPrimaryAction,
  type PriceSummary,
  type SellerSummary,
} from '../../features/listings/listingActions.ts';
import type { MarketplaceVehicleCtas } from '../../lib/api.ts';
import { formatPrice } from '../../lib/display.ts';
import { ShareListingButton } from './ShareListingButton.tsx';
import { PriceDropBadge } from './PriceDropBadge.tsx';

type Props = {
  priceSummary: PriceSummary;
  sellerSummary: SellerSummary;
  shareTitle: string;
  shareUrl: string;
  ctas?: MarketplaceVehicleCtas;
};

function ctasToPrimaryAction(ctas: MarketplaceVehicleCtas | undefined): ListingPrimaryAction {
  if (!ctas) {
    return { label: 'Contact seller', kind: 'scroll', targetId: LISTING_INQUIRY_TARGET_ID };
  }
  const { action, label } = ctas.primary;
  if (action === 'INQUIRY') {
    return { label, kind: 'scroll', targetId: LISTING_INQUIRY_TARGET_ID };
  }
  if (action === 'EXTERNAL_URL') {
    const secondary = ctas.secondary.find(s => s.action === 'EXTERNAL_URL' && s.href);
    return { label, kind: 'link', href: secondary?.href ?? '#' };
  }
  return { label, kind: 'scroll', targetId: LISTING_INQUIRY_TARGET_ID };
}

export function StickyListingActionPanel({
  priceSummary,
  sellerSummary,
  shareTitle,
  shareUrl,
  ctas,
}: Props) {
  const primary = ctasToPrimaryAction(ctas);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-30 border-t border-silver-200 bg-surface-card/95 px-4 py-3 shadow-elevation-3 backdrop-blur lg:hidden"
      aria-label="Listing actions"
    >
      <div className="mx-auto flex max-w-6xl items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-lg font-bold tabular-nums text-ink">
            {formatPrice(priceSummary.priceCents)}
          </p>
          <p className="truncate text-xs text-ink-muted">{sellerSummary.name}</p>
        </div>
        <ShareListingButton title={shareTitle} url={shareUrl} compact />
        <button
          type="button"
          className="mp-btn-primary shrink-0 px-4 py-2.5"
          onClick={() => runListingPrimaryAction(primary)}
        >
          {primary.label}
        </button>
      </div>
    </div>
  );
}

export function ListingActionSidebar({
  priceSummary,
  sellerSummary,
  shareTitle,
  shareUrl,
  ctas,
}: Props) {
  const primary = ctasToPrimaryAction(ctas);
  const secondaryLinks = (ctas?.secondary ?? []).filter(
    s => s.action === 'DEALER_PAGE' || s.action === 'DEALER_INVENTORY',
  );

  return (
    <div className="hidden rounded-xl border border-silver-200 bg-white p-5 shadow-elevation-1 lg:block">
      <p className="mp-label text-ink-faint">{priceSummary.label ?? 'Price'}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-ink">
        {formatPrice(priceSummary.priceCents)}
      </p>
      {priceSummary.originalPriceCents != null && priceSummary.originalPriceCents > priceSummary.priceCents && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-sm text-ink-muted line-through">{formatPrice(priceSummary.originalPriceCents)}</span>
          <PriceDropBadge originalPriceCents={priceSummary.originalPriceCents} priceCents={priceSummary.priceCents} />
        </div>
      )}
      <p className="mt-3 mp-label text-ink-faint">Seller</p>
      <p className="mt-0.5 text-sm font-semibold text-ink-heading">{sellerSummary.name}</p>
      {sellerSummary.location && (
        <p className="mt-0.5 text-sm text-ink-muted">{sellerSummary.location}</p>
      )}
      <div className="mt-5 flex flex-col gap-2">
        <button
          type="button"
          className="mp-btn-primary w-full"
          onClick={() => runListingPrimaryAction(primary)}
        >
          {primary.label}
        </button>
        {secondaryLinks.map(s => (
          <a key={s.action} href={s.href ?? '#'} className="mp-btn-secondary w-full text-center">
            {s.label}
          </a>
        ))}
        <ShareListingButton title={shareTitle} url={shareUrl} className="w-full" />
      </div>
    </div>
  );
}
