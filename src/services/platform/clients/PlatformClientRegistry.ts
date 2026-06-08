import type { OAuthClient } from './OAuthClient.js';
import { MetaOAuthClient } from './providers/MetaOAuthClient.js';
import { GoogleOAuthClient } from './providers/GoogleOAuthClient.js';
import { MicrosoftOAuthClient } from './providers/MicrosoftOAuthClient.js';
import { LinkedInOAuthClient } from './providers/LinkedInOAuthClient.js';
import { EbayOAuthClient } from './providers/EbayOAuthClient.js';
import { TikTokOAuthClient } from './providers/TikTokOAuthClient.js';
import { AppleOAuthClient } from './providers/AppleOAuthClient.js';
import { PinterestOAuthClient } from './providers/PinterestOAuthClient.js';
import { RedditOAuthClient } from './providers/RedditOAuthClient.js';
import { SnapchatOAuthClient } from './providers/SnapchatOAuthClient.js';
import { XOAuthClient } from './providers/XOAuthClient.js';
import { NextdoorOAuthClient } from './providers/NextdoorOAuthClient.js';

// Singleton instances — safe because each client reads env vars at construction time
// and holds no mutable state between requests.
const meta = new MetaOAuthClient();
const google = new GoogleOAuthClient();
const microsoft = new MicrosoftOAuthClient();
const linkedin = new LinkedInOAuthClient();
const ebay = new EbayOAuthClient();
const tiktok = new TikTokOAuthClient();
const apple = new AppleOAuthClient();
const pinterest = new PinterestOAuthClient();
const reddit = new RedditOAuthClient();
const snapchat = new SnapchatOAuthClient();
const x = new XOAuthClient();
const nextdoor = new NextdoorOAuthClient();

// Maps every platform slug that has an oauthProvider to its OAuthClient instance.
const SLUG_TO_CLIENT: Record<string, OAuthClient> = {
  'google-vehicle-ads':           google,
  'meta-automotive-ads':          meta,
  'facebook-marketplace-general': meta,
  'tiktok-automotive-ads':        tiktok,
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
};

export { XOAuthClient };
