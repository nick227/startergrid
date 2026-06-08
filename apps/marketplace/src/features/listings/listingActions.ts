export const LISTING_INQUIRY_TARGET_ID = 'inquiry';

export type ListingActionKind = 'scroll' | 'link';

export type ListingPrimaryAction = {
  label: string;
  kind: ListingActionKind;
  targetId?: string;
  href?: string;
};

export type PriceSummary = {
  priceCents: number;
  originalPriceCents?: number | null;
  label?: string;
};

export type SellerSummary = {
  name: string;
  location: string | null;
};

export function buildDefaultListingActions(): { primary: ListingPrimaryAction } {
  return {
    primary: {
      label: 'Contact seller',
      kind: 'scroll',
      targetId: LISTING_INQUIRY_TARGET_ID,
    },
  };
}

export function runListingPrimaryAction(action: ListingPrimaryAction): void {
  if (action.kind === 'link' && action.href) {
    window.location.href = action.href;
    return;
  }
  if (action.kind === 'scroll' && action.targetId) {
    document.getElementById(action.targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}
