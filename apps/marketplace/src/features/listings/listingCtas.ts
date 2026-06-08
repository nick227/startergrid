import type { MarketplaceVehicleCtas } from '../../lib/api.ts';
import { LISTING_INQUIRY_TARGET_ID, type ListingPrimaryAction } from './listingActions.ts';

/**
 * Shared mapping from API CTAs → a concrete primary action.
 *
 * On the full VDP we scroll to inquiry. In lightweight surfaces (drawer),
 * we can optionally override inquiryHref to route to the full VDP inquiry anchor.
 */
export function ctasToPrimaryAction(
  ctas: MarketplaceVehicleCtas | undefined,
  options: { inquiryHref?: string } = {},
): ListingPrimaryAction {
  if (!ctas) {
    return { label: 'Contact seller', kind: 'scroll', targetId: LISTING_INQUIRY_TARGET_ID };
  }
  const { action, label } = ctas.primary;
  if (action === 'INQUIRY') {
    if (options.inquiryHref) return { label, kind: 'link', href: options.inquiryHref };
    return { label, kind: 'scroll', targetId: LISTING_INQUIRY_TARGET_ID };
  }
  if (action === 'EXTERNAL_URL') {
    const secondary = ctas.secondary.find(s => s.action === 'EXTERNAL_URL' && s.href);
    return { label, kind: 'link', href: secondary?.href ?? '#' };
  }
  return { label, kind: 'scroll', targetId: LISTING_INQUIRY_TARGET_ID };
}

