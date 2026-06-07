import {
  buildDefaultListingActions,
  runListingPrimaryAction,
  type PriceSummary,
  type SellerSummary,
} from '../../features/listings/listingActions.ts';
import { formatPrice } from '../../lib/display.ts';
import { ShareListingButton } from './ShareListingButton.tsx';

type Props = {
  priceSummary: PriceSummary;
  sellerSummary: SellerSummary;
  shareTitle: string;
  shareUrl: string;
};

export function StickyListingActionPanel({
  priceSummary,
  sellerSummary,
  shareTitle,
  shareUrl,
}: Props) {
  const { primary } = buildDefaultListingActions();

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
}: Props) {
  const { primary } = buildDefaultListingActions();

  return (
    <div className="hidden rounded-xl border border-silver-200 bg-white p-5 shadow-elevation-1 lg:block">
      <p className="mp-label text-ink-faint">{priceSummary.label ?? 'Price'}</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-ink">
        {formatPrice(priceSummary.priceCents)}
      </p>
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
        <ShareListingButton title={shareTitle} url={shareUrl} className="w-full" />
      </div>
    </div>
  );
}
