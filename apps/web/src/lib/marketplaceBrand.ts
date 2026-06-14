export const AUTO_MARKETPLACE_NAME = 'Auto Marketplace';
export const AUTO_MARKETPLACE_SLUG = 'consumer-marketplace';

/** Legacy owned feed channel — hidden from platform pickers; Auto Marketplace is the operator-facing surface. */
export const DEALER_STOREFRONT_FEED_SLUG = 'dealer-storefront';

export function platformDisplayName(slug: string, profileName: string): string {
  if (slug === AUTO_MARKETPLACE_SLUG) return AUTO_MARKETPLACE_NAME;
  return profileName;
}

export function hideFromPlatformsChannelList(slug: string): boolean {
  return slug === DEALER_STOREFRONT_FEED_SLUG || slug === AUTO_MARKETPLACE_SLUG;
}
