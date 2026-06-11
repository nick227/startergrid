import {
  runListingPrimaryAction,
  type PriceSummary,
  type SellerSummary,
} from '../../features/listings/listingActions.ts';
import type { MarketplaceVehicleCtas } from '../../lib/api.ts';
import { formatPrice } from '../../lib/display.ts';
import { ShareListingButton } from './ShareListingButton.tsx';
import { ctasToPrimaryAction } from '../../features/listings/listingCtas.ts';

type Props = {
  priceSummary: PriceSummary;
  sellerSummary: SellerSummary;
  shareTitle: string;
  shareUrl: string;
  ctas?: MarketplaceVehicleCtas;
};

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
