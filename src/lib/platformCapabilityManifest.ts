import { platformProfiles } from '../data/platformProfiles.js';

export const CATALOG_SYNC_SLUGS = Object.freeze(
  new Set(platformProfiles.filter(p => p.catalogSync).map(p => p.slug)),
);

export const SOCIAL_POSTING_SLUGS = Object.freeze(
  new Set(platformProfiles.filter(p => p.socialPosting).map(p => p.slug)),
);

export const MARKETPLACE_LISTING_SLUGS = Object.freeze(
  new Set(platformProfiles.filter(p => p.marketplaceListing).map(p => p.slug)),
);

export const PARTNER_FEED_SLUGS = Object.freeze(
  new Set(platformProfiles.filter(p => p.partnerFeed).map(p => p.slug)),
);

export const LEAD_SYNC_SLUGS = Object.freeze(
  new Set(platformProfiles.filter(p => p.leadSync).map(p => p.slug)),
);

export const OAUTH_PROFILE_SLUGS = Object.freeze(
  new Set(platformProfiles.filter(p => p.oauthProvider).map(p => p.slug)),
);
