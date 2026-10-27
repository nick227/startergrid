import type { PlatformProfileSeed } from '../../lib/types.js';

/**
 * Every channel has exactly one primary purpose, used to group and count it once.
 * What else it can do is a capability, never a second count.
 */
export type ChannelPurpose = 'MARKETPLACE' | 'SOCIAL_ADVERTISING' | 'INVENTORY_FEED' | 'LEAD_DELIVERY';
export type ChannelCapability = 'LISTINGS' | 'SOCIAL_POSTS' | 'CATALOG' | 'PARTNER_FEED' | 'LEADS';

export const CHANNEL_PURPOSES: ReadonlyArray<{ purpose: ChannelPurpose; label: string; description: string }> = [
  { purpose: 'MARKETPLACE', label: 'Marketplaces', description: 'Sites where buyers browse your vehicles and contact you.' },
  { purpose: 'SOCIAL_ADVERTISING', label: 'Social & Advertising', description: 'Ads, social catalogs and your business profiles.' },
  { purpose: 'INVENTORY_FEED', label: 'Inventory Feeds', description: 'Your inventory sent to a website or system you run.' },
  { purpose: 'LEAD_DELIVERY', label: 'Lead Delivery', description: 'Where your inquiries are sent, like your CRM.' },
];

// Channels whose job differs from their profile kind.
const OVERRIDES: Record<string, ChannelPurpose> = {
  'facebook-marketplace-general': 'MARKETPLACE', // buyers browse listings, despite the social-catalog kind
  'dealer-storefront': 'INVENTORY_FEED',          // feed for the dealer's own website
  'shopify-catalog': 'INVENTORY_FEED',            // feed into the dealer's own store
  'apple-business-connect': 'SOCIAL_ADVERTISING', // business profile, like Google Business Profile
};

const BY_KIND: Record<string, ChannelPurpose> = {
  MARKETPLACE: 'MARKETPLACE',
  AD_NETWORK: 'SOCIAL_ADVERTISING',
  SOCIAL_CATALOG: 'SOCIAL_ADVERTISING',
  LEAD_ROUTER: 'LEAD_DELIVERY',
  DEALER_STOREFRONT: 'INVENTORY_FEED',
};

type ProfileFlags = Pick<PlatformProfileSeed, 'slug' | 'kind' | 'marketplaceListing' | 'socialPosting' | 'catalogSync' | 'partnerFeed' | 'leadSync'>;

export function primaryPurpose(profile: ProfileFlags): ChannelPurpose {
  return OVERRIDES[profile.slug] ?? BY_KIND[profile.kind] ?? 'MARKETPLACE';
}

export function channelCapabilities(profile: ProfileFlags): ChannelCapability[] {
  const caps: ChannelCapability[] = [];
  if (profile.marketplaceListing) caps.push('LISTINGS');
  if (profile.socialPosting) caps.push('SOCIAL_POSTS');
  if (profile.catalogSync) caps.push('CATALOG');
  if (profile.partnerFeed) caps.push('PARTNER_FEED');
  if (profile.leadSync || profile.kind === 'LEAD_ROUTER') caps.push('LEADS');
  return caps;
}
