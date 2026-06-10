import type { OAuthClient } from './OAuthClient.js';
import { FacebookBusinessPageOAuthClient } from './providers/FacebookBusinessPageOAuthClient.js';
import { MetaOAuthClient } from './providers/MetaOAuthClient.js';
import { GoogleOAuthClient } from './providers/GoogleOAuthClient.js';
import { GoogleBusinessProfileOAuthClient } from './providers/GoogleBusinessProfileOAuthClient.js';
import { MicrosoftOAuthClient } from './providers/MicrosoftOAuthClient.js';
import { LinkedInOAuthClient } from './providers/LinkedInOAuthClient.js';
import { EbayOAuthClient } from './providers/EbayOAuthClient.js';
import { TikTokOAuthClient } from './providers/TikTokOAuthClient.js';
import { TikTokShopOAuthClient } from './providers/TikTokShopOAuthClient.js';
import { AppleOAuthClient } from './providers/AppleOAuthClient.js';
import { PinterestOAuthClient } from './providers/PinterestOAuthClient.js';
import { RedditOAuthClient } from './providers/RedditOAuthClient.js';
import { SnapchatOAuthClient } from './providers/SnapchatOAuthClient.js';
import { XOAuthClient } from './providers/XOAuthClient.js';
import { NextdoorOAuthClient } from './providers/NextdoorOAuthClient.js';

// Singleton instances — safe because each client reads env vars at construction time
// and holds no mutable state between requests.
const facebookBusinessPage = new FacebookBusinessPageOAuthClient();
const metaCatalogAds = new MetaOAuthClient();
const google = new GoogleOAuthClient();
const googleBusinessProfile = new GoogleBusinessProfileOAuthClient();
const microsoft = new MicrosoftOAuthClient();
const linkedin = new LinkedInOAuthClient();
const ebay = new EbayOAuthClient();
const tiktok = new TikTokOAuthClient();
const tiktokShop = new TikTokShopOAuthClient();
const apple = new AppleOAuthClient();
const pinterest = new PinterestOAuthClient();
const reddit = new RedditOAuthClient();
const snapchat = new SnapchatOAuthClient();
const x = new XOAuthClient();
const nextdoor = new NextdoorOAuthClient();

// Maps every platform slug that has an oauthProvider to its OAuthClient instance.
const SLUG_TO_CLIENT: Record<string, OAuthClient> = {
  'facebook-business-page':       facebookBusinessPage,
  'google-business-profile':      googleBusinessProfile,
  'google-vehicle-ads':           google,
  'meta-automotive-ads':          metaCatalogAds,
  'facebook-marketplace-general': metaCatalogAds,
  'tiktok-automotive-ads':        tiktok,
  'tiktok-shop':                  tiktokShop,
  'microsoft-automotive-ads':     microsoft,
  'linkedin-lead-gen-forms':      linkedin,
  'pinterest-shopping-ads':       pinterest,
  'reddit-dynamic-product-ads':   reddit,
  'ebay-motors':                  ebay,
  'x-dynamic-product-ads':        x,
  'snapchat-dynamic-product-ads': snapchat,
  'nextdoor-ads':                 nextdoor,
  'apple-business-connect':       apple,
};

export const PlatformClientRegistry = {
  forSlug(platformSlug: string): OAuthClient | null {
    return SLUG_TO_CLIENT[platformSlug] ?? null;
  },

  allClients(): OAuthClient[] {
    return [...new Set(Object.values(SLUG_TO_CLIENT))];
  },

  slugsForClient(client: OAuthClient): string[] {
    return Object.entries(SLUG_TO_CLIENT)
      .filter(([, c]) => c === client)
      .map(([slug]) => slug);
  },
};

export { XOAuthClient };
