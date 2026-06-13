// Per-platform setup guides for two audiences:
//   admin — the developer creating OAuth apps and setting env vars on our server
//   operator — the dealer or our staff getting a dealer's platform account connected

export type AdminSetupGuide = {
  shortBlurb: string;
  portalUrl: string;
  steps: string[];
  envVarDescriptions: Partial<Record<string, string>>;
};

export type OperatorSetupGuide = {
  shortBlurb: string;
  connectionLabel: string;
  steps: string[];
  dealerPortalUrl?: string | null;
  validationNote: string;
};

export type ExternalLink = { label: string; url: string };

export type PlatformSetupGuide = {
  description: string;
  externalLinks: ExternalLink[];
  admin: AdminSetupGuide | null;
  operator: OperatorSetupGuide | null;
};

// ── Shared admin guides (one OAuth app covers multiple platform slugs) ─────────

const META_ADMIN: AdminSetupGuide = {
  shortBlurb: 'Create a Meta Business-type app at developers.facebook.com to get META_APP_ID + META_APP_SECRET.',
  portalUrl: 'https://developers.facebook.com/apps',
  steps: [
    'Go to developers.facebook.com/apps and click Create App.',
    'Select "Business" as the app type and complete basic setup.',
    'Add the Marketing API and Catalog API products to the app.',
    'Under App Settings → Basic, copy App ID → META_APP_ID and App Secret → META_APP_SECRET.',
    'Submit for Meta App Review to unlock catalog_management, ads_management, and business_management permissions in production.',
  ],
  envVarDescriptions: {
    META_APP_ID: 'App ID from Settings → Basic in your Meta Business app.',
    META_APP_SECRET: 'App Secret from Settings → Basic. Treat as a password — never expose client-side.',
  },
};

const META_PAGE_ADMIN: AdminSetupGuide = {
  ...META_ADMIN,
  shortBlurb: 'Same Meta Business app as catalog/ads — also requires Pages API permissions for page posting.',
  steps: [
    ...META_ADMIN.steps.slice(0, 4),
    'Also add the Pages API product and request pages_manage_posts and pages_read_engagement permissions.',
    'Submit for Meta App Review — Page posting requires separate permission approval.',
  ],
};

const GOOGLE_ADMIN: AdminSetupGuide = {
  shortBlurb: 'Create an OAuth 2.0 client in Google Cloud Console and enable the Content API for Shopping to get GOOGLE_CLIENT_ID + GOOGLE_CLIENT_SECRET.',
  portalUrl: 'https://console.cloud.google.com/apis/credentials',
  steps: [
    'Create a new project at console.cloud.google.com (or use an existing one).',
    'Enable the Content API for Shopping under APIs & Services → Library.',
    'Go to APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID.',
    'Set application type to Web Application; add your server redirect URI.',
    'Copy Client ID → GOOGLE_CLIENT_ID and Client Secret → GOOGLE_CLIENT_SECRET.',
    'Under OAuth consent screen, add the scope https://www.googleapis.com/auth/content.',
  ],
  envVarDescriptions: {
    GOOGLE_CLIENT_ID: 'Client ID from Google Cloud Console → Credentials → your OAuth 2.0 Client.',
    GOOGLE_CLIENT_SECRET: 'Client Secret from the same OAuth 2.0 Client entry.',
  },
};

const GOOGLE_PROFILE_ADMIN: AdminSetupGuide = {
  ...GOOGLE_ADMIN,
  shortBlurb: 'Same Google Cloud OAuth app — enable Business Profile API and add business.manage scope.',
  steps: [
    ...GOOGLE_ADMIN.steps.slice(0, 2),
    'Also enable the Business Profile API (My Business API) under APIs & Services → Library.',
    ...GOOGLE_ADMIN.steps.slice(2, 5),
    'Add scope https://www.googleapis.com/auth/business.manage to the OAuth consent screen.',
  ],
};

const MICROSOFT_ADMIN: AdminSetupGuide = {
  shortBlurb: 'Register an app in Azure Active Directory and add Microsoft Ads API permissions to get MICROSOFT_CLIENT_ID + MICROSOFT_CLIENT_SECRET.',
  portalUrl: 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade',
  steps: [
    'Go to portal.azure.com → Azure Active Directory → App registrations → New registration.',
    'Set supported account types; add your OAuth redirect URI under Authentication → Web.',
    'Under API Permissions, add the Microsoft Advertising (Bing Ads) permission: msads.manage.',
    'Also add offline_access from Microsoft Graph for refresh token support.',
    'Under Certificates & Secrets → New client secret; copy the value immediately.',
    'Copy Application (client) ID → MICROSOFT_CLIENT_ID and the new secret → MICROSOFT_CLIENT_SECRET.',
  ],
  envVarDescriptions: {
    MICROSOFT_CLIENT_ID: 'Application (client) ID shown on the Overview page of your Azure app registration.',
    MICROSOFT_CLIENT_SECRET: 'Secret value shown immediately after creation under Certificates & Secrets (cannot be retrieved later).',
  },
};

const EBAY_ADMIN: AdminSetupGuide = {
  shortBlurb: 'Create a production application at the eBay Developers Program to get EBAY_CLIENT_ID (App ID) + EBAY_CLIENT_SECRET (Cert ID).',
  portalUrl: 'https://developer.ebay.com/my/keys',
  steps: [
    'Sign in at developer.ebay.com and navigate to My Account → Application Keys.',
    'Click Create a Keyset and select Production environment.',
    'Under the production keyset, copy App ID → EBAY_CLIENT_ID and Cert ID → EBAY_CLIENT_SECRET.',
    'Under Auth Accepted Grant Types, ensure Authorization Code is enabled for dealer OAuth.',
    'Add your OAuth redirect URI under User Tokens → Get a Token via Your User Credentials.',
    'Enable the sell.inventory, sell.inventory.readonly, and base api_scope scopes for your app.',
  ],
  envVarDescriptions: {
    EBAY_CLIENT_ID: 'App ID from eBay Developers Program → My Account → Application Keys → Production keyset.',
    EBAY_CLIENT_SECRET: 'Cert ID from the same production keyset (not the Dev ID).',
  },
};

const TIKTOK_ADMIN: AdminSetupGuide = {
  shortBlurb: 'Apply for TikTok Marketing API access and create an advertiser app to get TIKTOK_CLIENT_ID + TIKTOK_CLIENT_SECRET.',
  portalUrl: 'https://ads.tiktok.com/marketing_api/docs',
  steps: [
    'Apply for Marketing API access at ads.tiktok.com/marketing_api/docs → Get Started.',
    'After approval, create an app in the TikTok for Business developer portal.',
    'Under App Info, select Advertiser as the app type for automotive catalog ads.',
    'Copy Client ID → TIKTOK_CLIENT_ID and Client Secret → TIKTOK_CLIENT_SECRET.',
    'Add your OAuth redirect URI under the app\'s OAuth settings.',
    'Note: TikTok does not expose a standard app-level token probe; system validates env var presence only.',
  ],
  envVarDescriptions: {
    TIKTOK_CLIENT_ID: 'Client ID (App ID) from your TikTok for Business developer app.',
    TIKTOK_CLIENT_SECRET: 'Client Secret from the same TikTok for Business developer app.',
  },
};

const TIKTOK_SHOP_ADMIN: AdminSetupGuide = {
  shortBlurb: 'Apply as a TikTok Shop Partner and create an app in Seller Center to get TIKTOK_SHOP_APP_KEY + TIKTOK_SHOP_APP_SECRET.',
  portalUrl: 'https://partner.tiktokshop.com',
  steps: [
    'Apply as a partner at partner.tiktokshop.com.',
    'After approval, create an app in the TikTok Shop developer portal.',
    'Under App Credentials, copy App Key → TIKTOK_SHOP_APP_KEY and App Secret → TIKTOK_SHOP_APP_SECRET.',
    'Note: This is separate from the TikTok Ads app — Shop uses Seller Center keys.',
    'Note: TikTok Shop does not expose a standard token probe; system validates env var presence only.',
  ],
  envVarDescriptions: {
    TIKTOK_SHOP_APP_KEY: 'App Key from TikTok Shop Seller Center → Developer → App Credentials.',
    TIKTOK_SHOP_APP_SECRET: 'App Secret from the same Seller Center developer app.',
  },
};

const PINTEREST_ADMIN: AdminSetupGuide = {
  shortBlurb: 'Create a Pinterest app at developers.pinterest.com and request ads + catalogs scopes to get PINTEREST_CLIENT_ID + PINTEREST_CLIENT_SECRET.',
  portalUrl: 'https://developers.pinterest.com/apps/',
  steps: [
    'Sign in at developers.pinterest.com and create a new app.',
    'Under Permissions, request ads:read, ads:write, catalogs:read, catalogs:write.',
    'Add your OAuth redirect URI under App Settings.',
    'Copy App ID → PINTEREST_CLIENT_ID and App Secret Key → PINTEREST_CLIENT_SECRET.',
    'Pinterest validates system credentials by checking client authentication at the token endpoint.',
  ],
  envVarDescriptions: {
    PINTEREST_CLIENT_ID: 'App ID shown in your app\'s Basic Settings at developers.pinterest.com.',
    PINTEREST_CLIENT_SECRET: 'App Secret Key shown in the same settings (shown once; rotate if lost).',
  },
};

const REDDIT_ADMIN: AdminSetupGuide = {
  shortBlurb: 'Create a Reddit script-type app at the Reddit app console to get REDDIT_CLIENT_ID + REDDIT_CLIENT_SECRET.',
  portalUrl: 'https://www.reddit.com/prefs/apps',
  steps: [
    'Go to reddit.com/prefs/apps and click "Create another app".',
    'Select "script" for server-side use (or "web app" for OAuth flows).',
    'Set the redirect URI to your server\'s callback URL.',
    'Copy the Client ID (under the app name) → REDDIT_CLIENT_ID.',
    'Copy the secret → REDDIT_CLIENT_SECRET.',
    'For Ads API access, separately apply at ads-api.reddit.com/docs/#section/Getting-Started.',
  ],
  envVarDescriptions: {
    REDDIT_CLIENT_ID: 'The 14-character identifier shown under the app name at reddit.com/prefs/apps.',
    REDDIT_CLIENT_SECRET: 'The "secret" value shown in the app settings.',
  },
};

const SNAPCHAT_ADMIN: AdminSetupGuide = {
  shortBlurb: 'Apply for Snap Marketing API access and create an OAuth app to get SNAPCHAT_CLIENT_ID + SNAPCHAT_CLIENT_SECRET.',
  portalUrl: 'https://business.snapchat.com/create',
  steps: [
    'Create a Snapchat Business account at business.snapchat.com.',
    'Apply for Marketing API access through the Snap Business Help Center.',
    'After approval, create an OAuth app in the Snap developer portal.',
    'Copy OAuth 2.0 Client ID → SNAPCHAT_CLIENT_ID and Client Secret → SNAPCHAT_CLIENT_SECRET.',
    'Credentials are validated by client authentication inference at the Snapchat token endpoint.',
  ],
  envVarDescriptions: {
    SNAPCHAT_CLIENT_ID: 'OAuth 2.0 Client ID from your Snap Marketing API app.',
    SNAPCHAT_CLIENT_SECRET: 'OAuth 2.0 Client Secret from the same Snap app.',
  },
};

const X_ADMIN: AdminSetupGuide = {
  shortBlurb: 'Apply for X Ads API access and create a project + app at developer.x.com to get X_CLIENT_ID + X_CLIENT_SECRET.',
  portalUrl: 'https://developer.x.com/en/portal/dashboard',
  steps: [
    'Sign in at developer.x.com and create a new project and app.',
    'Apply for Ads API access (Elevated or above is required).',
    'Under App Settings → Keys and Tokens, enable OAuth 2.0.',
    'Add your callback URI under Authentication settings.',
    'Copy Client ID → X_CLIENT_ID and Client Secret → X_CLIENT_SECRET.',
    'Required scopes: tweet.read, users.read, ads:read, ads:write, offline.access.',
  ],
  envVarDescriptions: {
    X_CLIENT_ID: 'OAuth 2.0 Client ID from X Developer Portal → App → Keys and Tokens.',
    X_CLIENT_SECRET: 'OAuth 2.0 Client Secret from the same app settings.',
  },
};

const NEXTDOOR_ADMIN: AdminSetupGuide = {
  shortBlurb: 'Apply for Nextdoor Ads API access and create an OAuth app to get NEXTDOOR_CLIENT_ID + NEXTDOOR_CLIENT_SECRET.',
  portalUrl: 'https://business.nextdoor.com',
  steps: [
    'Contact Nextdoor Business to apply for Ads API access.',
    'After approval, create an OAuth 2.0 application in the Nextdoor developer portal.',
    'Add AdsRead and AdsWrite to the app\'s requested scopes.',
    'Copy Client ID → NEXTDOOR_CLIENT_ID and Client Secret → NEXTDOOR_CLIENT_SECRET.',
    'Credentials are validated by client authentication inference at the Nextdoor token endpoint.',
  ],
  envVarDescriptions: {
    NEXTDOOR_CLIENT_ID: 'OAuth 2.0 Client ID issued by Nextdoor after app approval.',
    NEXTDOOR_CLIENT_SECRET: 'OAuth 2.0 Client Secret issued with the same app.',
  },
};

const APPLE_ADMIN: AdminSetupGuide = {
  shortBlurb: 'Enroll in the Apple Developer Program, register an App ID with Sign in with Apple, and create a private key to set APPLE_CLIENT_ID, APPLE_KEY_ID, APPLE_TEAM_ID, and APPLE_PRIVATE_KEY.',
  portalUrl: 'https://developer.apple.com/account',
  steps: [
    'Enroll in the Apple Developer Program at developer.apple.com.',
    'Register an App ID and enable the Sign in with Apple capability.',
    'Under Certificates, Identifiers & Profiles → Keys, create a new key with Sign in with Apple enabled.',
    'Download the private key file (.p8) — it can only be downloaded once.',
    'Copy the Team ID (top-right in developer console) → APPLE_TEAM_ID.',
    'Copy the Key ID shown with your new key → APPLE_KEY_ID.',
    'Set the Service ID (used as client_id for Sign in with Apple) → APPLE_CLIENT_ID.',
    'Paste or reference the .p8 private key content → APPLE_PRIVATE_KEY.',
    'Note: Apple credentials require a signed JWT client_secret; live probing is pending JWT library integration.',
  ],
  envVarDescriptions: {
    APPLE_CLIENT_ID: 'Service ID (not the App ID) registered for Sign in with Apple.',
    APPLE_KEY_ID: '10-character Key ID shown when you create the private key.',
    APPLE_TEAM_ID: '10-character Team ID shown at the top-right of your Apple Developer account.',
    APPLE_PRIVATE_KEY: 'Full contents of the .p8 private key file (PEM-encoded, including header/footer).',
  },
};

// ── Shared operator guides by connection model ─────────────────────────────────

const SHARED_OAUTH_OPERATOR: OperatorSetupGuide = {
  shortBlurb: 'Dealer connects their account via OAuth — no separate keys needed.',
  connectionLabel: 'Shared-system OAuth (dealer authorizes)',
  steps: [
    'Dealer opens their platform page in the portal.',
    'Clicks Connect to start the OAuth flow (uses our system app credentials).',
    'Signs in to their platform account and grants the requested permissions.',
    'Returns to the portal — connection is confirmed and token is stored.',
    'Dealer tokens are refreshed automatically; manual reconnect is only needed if revoked.',
  ],
  validationNote: 'System validates developer keys via live token probe. Dealer connection is validated by checking their stored OAuth token.',
};

const DEALER_OAUTH_OPERATOR: OperatorSetupGuide = {
  shortBlurb: 'Each dealer connects their own seller account via OAuth — per-dealer authorization.',
  connectionLabel: 'Dealer OAuth (per-dealer authorization)',
  steps: [
    'Dealer must have an active seller account on the platform.',
    'Dealer opens their platform page in the portal and clicks Connect.',
    'Authorizes our app with their seller account credentials.',
    'Returns to the portal — dealer-specific token is stored.',
    'Sell Inventory and listing publish requires per-dealer token; system keys only handle app-level auth.',
  ],
  validationNote: 'System validates app-level developer keys. Each dealer\'s authorization is validated separately when they connect.',
};

const PARTNER_FEED_OPERATOR: OperatorSetupGuide = {
  shortBlurb: 'Dealer signs up for a partner dealer account — feed credentials are provided by the platform.',
  connectionLabel: 'Partner feed (per-dealer credentials)',
  steps: [
    'Dealer applies for a dealer account on the platform\'s partner portal.',
    'Platform provides feed credentials (SFTP username/password, API key, or feed URL).',
    'Operator enters the dealer\'s feed credentials in the portal.',
    'System generates and delivers the inventory feed to the platform on schedule.',
    'No shared system developer keys are required — all credentials are per-dealer.',
  ],
  validationNote: 'System cannot validate partner-feed credentials at the app level. Validation is limited to checking that feed credentials are present and the feed URL resolves.',
};

const MANUAL_PORTAL_OPERATOR: OperatorSetupGuide = {
  shortBlurb: 'Dealer applies for a platform account — operator manually submits inventory via the partner portal.',
  connectionLabel: 'Manual portal (operator-managed)',
  steps: [
    'Dealer applies for an account directly on the platform\'s dealer portal.',
    'Platform reviews the application and grants access (may take days).',
    'Operator logs in to the partner portal with the dealer\'s credentials.',
    'Operator manually submits or uploads inventory through the portal UI.',
    'Inventory updates require manual re-submission on each change cycle.',
  ],
  validationNote: 'No automated validation is possible. Operator confirms submission manually.',
};

const INTERNAL_OPERATOR: OperatorSetupGuide = {
  shortBlurb: 'Owned first-party channel — no external account setup needed for dealers.',
  connectionLabel: 'Internal (first-party route)',
  steps: [
    'No dealer account or external credentials required.',
    'Inventory is published directly from the operator platform.',
    'Ensure the dealer\'s account is active and inventory meets listing eligibility.',
  ],
  validationNote: 'System validates first-party routes and event loops. No external keys required.',
};

// ── Dealer-portal URLs for partner-feed platforms ──────────────────────────────

const CARGURUS_DEALER_URL = 'https://www.cargurus.com/Cars/dealers/';
const AUTOTRADER_DEALER_URL = 'https://www.autotrader.com/dealers/';
const CARS_COM_DEALER_URL = 'https://dealer.cars.com/';
const TRUECAR_DEALER_URL = 'https://dealer.truecar.com/';
const CARFAX_DEALER_URL = 'https://www.carfax.com/carfax-dealers/';
const RV_TRADER_DEALER_URL = 'https://www.rvtrader.com/dealer-services/';
const CYCLE_TRADER_DEALER_URL = 'https://www.cycletrader.com/dealer-services/';
const ATV_TRADER_DEALER_URL = 'https://www.atvtrader.com/dealer-services/';
const TRAILER_TRADER_DEALER_URL = 'https://www.traderinteractive.com/';

// ── Per-platform guide map ─────────────────────────────────────────────────────

export const PLATFORM_SETUP_GUIDES: Record<string, PlatformSetupGuide> = {
  'consumer-marketplace': {
    description: 'The Consumer Marketplace is our own first-party buyer-facing browse experience, surfacing active inventory from all connected dealers in a single searchable index. Listings are filtered in real time — only priced, unsold, unpublished items appear — and no internal fields such as VIN are ever exposed to the public. Lead capture, saved searches, and recently-viewed history are all first-party, with no dependency on external platforms.',
    externalLinks: [
      { label: 'Marketplace browse', url: '/marketplace/' },
      { label: 'OpenAPI spec', url: '/openapi/openapi-marketplace.yaml' },
    ],
    admin: null,
    operator: INTERNAL_OPERATOR,
  },
  'dealer-storefront': {
    description: 'Dealer Storefront is a white-label inventory feed channel that powers dealer-branded websites. Rather than a hosted per-dealer browse product, it publishes listing artifacts to any storefront that consumes the feed — giving dealers a branded web presence while keeping inventory in sync with the central platform.',
    externalLinks: [],
    admin: null,
    operator: INTERNAL_OPERATOR,
  },
  'google-vehicle-ads': {
    description: 'Google Vehicle Ads surface individual vehicle listings directly in Google Search and Google Shopping results when buyers search for specific makes, models, or trims. Inventory is delivered via the Google Content API for Shopping into a Merchant Center account with Vehicle Ads enabled. Ads show the vehicle photo, price, mileage, and dealership name, and link directly to the VDP — making it one of the highest-intent ad formats available.',
    externalLinks: [
      { label: 'Content API for Shopping', url: 'https://developers.google.com/shopping-content/guides/quickstart' },
      { label: 'Vehicle Ads guide', url: 'https://support.google.com/merchants/answer/9374217' },
      { label: 'Merchant Center', url: 'https://merchants.google.com' },
    ],
    admin: GOOGLE_ADMIN,
    operator: {
      ...SHARED_OAUTH_OPERATOR,
      shortBlurb: 'Dealer connects their Google Merchant Center account via OAuth to push vehicle feed.',
      steps: [
        'Dealer must have a Google Merchant Center account with a Vehicle Ads sub-account.',
        'Dealer opens the platform page and clicks Connect with Google.',
        'Authorizes access using their Google account that has Merchant Center admin rights.',
        'System delivers the vehicle inventory feed to their Merchant Center via the Content API.',
        'Google reviews the vehicle feed before ads go live (typically 24–72 hours).',
      ],
    },
  },
  'meta-automotive-ads': {
    description: 'Meta Automotive Ads use the Meta Marketing API to run dynamic vehicle catalog ads across Facebook and Instagram, automatically retargeting shoppers who have viewed specific makes and models. Vehicle inventory syncs to a Meta product catalog; ads are generated dynamically per-user based on their browsing behavior and purchase signals. This is Meta\'s primary format for automotive dealers running performance advertising at scale.',
    externalLinks: [
      { label: 'Marketing API docs', url: 'https://developers.facebook.com/docs/marketing-api/' },
      { label: 'Automotive Ads', url: 'https://www.facebook.com/business/ads/automotive-ads' },
      { label: 'Meta Business Suite', url: 'https://business.facebook.com' },
    ],
    admin: META_ADMIN,
    operator: {
      ...SHARED_OAUTH_OPERATOR,
      shortBlurb: 'Dealer connects their Meta Business account to push vehicle catalog for dynamic ads.',
      steps: [
        'Dealer must have a Meta Business Manager account with a catalog and ad account.',
        'Dealer opens the platform page and clicks Connect with Facebook.',
        'Authorizes catalog_management and ads_management access.',
        'System creates or updates the vehicle catalog in their Meta Business account.',
        'Dynamic vehicle ads are linked to the catalog from within Ads Manager.',
      ],
    },
  },
  'facebook-marketplace-general': {
    description: 'Facebook Marketplace is one of the largest free-to-list consumer platforms in the US, with hundreds of millions of active buyers browsing vehicles, furniture, and goods. Dealer inventory is pushed via the Meta Catalog API into Commerce Manager, where listings surface in the Marketplace tab and local search results. Unlike paid ads, Marketplace listings carry no media spend — the channel generates organic leads from shoppers already browsing in the dealer\'s area.',
    externalLinks: [
      { label: 'Catalog API guide', url: 'https://developers.facebook.com/docs/marketing-api/catalog/guides' },
      { label: 'Facebook Marketplace', url: 'https://www.facebook.com/marketplace/' },
      { label: 'Commerce Manager', url: 'https://business.facebook.com/commerce' },
    ],
    admin: META_ADMIN,
    operator: {
      ...SHARED_OAUTH_OPERATOR,
      shortBlurb: 'Dealer connects their Meta Business account to list inventory on Facebook Marketplace.',
      steps: [
        'Dealer must have a Facebook Business Page and Commerce Manager account.',
        'Dealer opens the platform page and clicks Connect with Facebook.',
        'Authorizes catalog_management and business_management access.',
        'System pushes vehicle listings to their Facebook Marketplace through the Catalog API.',
        'Listings appear on Facebook Marketplace once the catalog feed is approved.',
      ],
    },
  },
  'facebook-business-page': {
    admin: META_PAGE_ADMIN,
    operator: {
      ...SHARED_OAUTH_OPERATOR,
      shortBlurb: 'Dealer connects their Facebook Business Page to enable automated social posting.',
      steps: [
        'Dealer must be an admin of their Facebook Business Page.',
        'Dealer opens the platform page and clicks Connect with Facebook.',
        'Authorizes pages_manage_posts and pages_read_engagement access for the target page.',
        'System will post inventory updates and marketing content to the page on schedule.',
      ],
    },
  },
  'microsoft-automotive-ads': {
    admin: MICROSOFT_ADMIN,
    operator: {
      ...SHARED_OAUTH_OPERATOR,
      shortBlurb: 'Dealer connects their Microsoft Advertising account to run automotive catalog ads.',
      steps: [
        'Dealer must have a Microsoft Advertising account with an active ad account.',
        'Dealer opens the platform page and clicks Connect with Microsoft.',
        'Authorizes msads.manage and offline_access.',
        'System delivers the vehicle feed and creates catalog ads in their Microsoft Ads account.',
      ],
    },
  },
  'linkedin-lead-gen-forms': {
    admin: MICROSOFT_ADMIN,
    operator: {
      ...SHARED_OAUTH_OPERATOR,
      shortBlurb: 'Dealer connects their LinkedIn Campaign Manager to capture leads from sponsored content.',
      steps: [
        'Dealer must have a LinkedIn Campaign Manager account with an active page.',
        'Dealer opens the platform page and clicks Connect with Microsoft (shared Azure app).',
        'Authorizes access to their LinkedIn ad account.',
        'System routes lead form submissions from LinkedIn into the dealer\'s lead queue.',
      ],
    },
  },
  'tiktok-automotive-ads': {
    admin: TIKTOK_ADMIN,
    operator: {
      ...SHARED_OAUTH_OPERATOR,
      shortBlurb: 'Dealer connects their TikTok Ads account to run automotive catalog ads.',
      steps: [
        'Dealer must have a TikTok for Business account with an active ad account.',
        'Dealer opens the platform page and clicks Connect with TikTok.',
        'Authorizes the ad account through the TikTok OAuth flow.',
        'System delivers the vehicle catalog and creates dynamic product ads.',
      ],
    },
  },
  'tiktok-shop': {
    admin: TIKTOK_SHOP_ADMIN,
    operator: {
      shortBlurb: 'Dealer connects their TikTok Shop seller account using Seller Center API keys.',
      connectionLabel: 'Seller Center API key (per-dealer)',
      steps: [
        'Dealer must have an approved TikTok Shop seller account.',
        'Dealer obtains their Seller Authorization Token from TikTok Shop Seller Center.',
        'Operator enters the dealer\'s authorization token in the portal.',
        'System manages product listings in the dealer\'s TikTok Shop using the Seller Center API.',
      ],
      validationNote: 'System validates app-level keys (env vars). Dealer shop token is validated per-dealer when entered.',
    },
  },
  'ebay-motors': {
    admin: EBAY_ADMIN,
    operator: DEALER_OAUTH_OPERATOR,
  },
  'pinterest-shopping-ads': {
    admin: PINTEREST_ADMIN,
    operator: {
      ...SHARED_OAUTH_OPERATOR,
      shortBlurb: 'Dealer connects their Pinterest Business account to run dynamic shopping ads.',
      steps: [
        'Dealer must have a Pinterest Business account with an ad account.',
        'Dealer opens the platform page and clicks Connect with Pinterest.',
        'Authorizes catalogs:read, catalogs:write, ads:read, and ads:write scopes.',
        'System creates or updates the vehicle catalog and runs dynamic product ads.',
      ],
    },
  },
  'reddit-dynamic-product-ads': {
    admin: REDDIT_ADMIN,
    operator: {
      ...SHARED_OAUTH_OPERATOR,
      shortBlurb: 'Dealer connects their Reddit Ads account to run dynamic product ads.',
      steps: [
        'Dealer must have a Reddit Ads account with the Dynamic Product Ads feature enabled.',
        'Dealer opens the platform page and clicks Connect with Reddit.',
        'Authorizes adspublisher and read access.',
        'System delivers the product catalog and manages dynamic ads in their Reddit Ads account.',
      ],
    },
  },
  'snapchat-dynamic-product-ads': {
    admin: SNAPCHAT_ADMIN,
    operator: {
      ...SHARED_OAUTH_OPERATOR,
      shortBlurb: 'Dealer connects their Snapchat Business account to run dynamic catalog ads.',
      steps: [
        'Dealer must have a Snapchat Ads Manager account.',
        'Dealer opens the platform page and clicks Connect with Snapchat.',
        'Authorizes snapchat-marketing-api scope.',
        'System creates the product catalog and runs dynamic ads in their Snapchat account.',
      ],
    },
  },
  'x-dynamic-product-ads': {
    admin: X_ADMIN,
    operator: {
      ...SHARED_OAUTH_OPERATOR,
      shortBlurb: 'Dealer connects their X Ads account to run dynamic product ads.',
      steps: [
        'Dealer must have an X Ads account with Dynamic Product Ads enabled.',
        'Dealer opens the platform page and clicks Connect with X.',
        'Authorizes tweet.read, users.read, ads:read, ads:write, and offline.access.',
        'System delivers the product catalog and manages dynamic ads in their X account.',
      ],
    },
  },
  'nextdoor-ads': {
    admin: NEXTDOOR_ADMIN,
    operator: {
      ...SHARED_OAUTH_OPERATOR,
      shortBlurb: 'Dealer connects their Nextdoor Ads account to run neighborhood-targeted ads.',
      steps: [
        'Dealer must have a Nextdoor Business account with an active ad account.',
        'Dealer opens the platform page and clicks Connect with Nextdoor.',
        'Authorizes AdsRead and AdsWrite scopes.',
        'System manages ad campaigns in their Nextdoor Ads account.',
      ],
    },
  },
  'apple-business-connect': {
    admin: APPLE_ADMIN,
    operator: MANUAL_PORTAL_OPERATOR,
  },
  'cargurus-dealer': {
    admin: null,
    operator: {
      ...PARTNER_FEED_OPERATOR,
      shortBlurb: 'Dealer signs up for a CarGurus dealer account — feed credentials are provided by CarGurus.',
      dealerPortalUrl: CARGURUS_DEALER_URL,
      steps: [
        'Dealer applies for a CarGurus dealer account at cargurus.com/Cars/dealers.',
        'CarGurus provides feed endpoint URL and credentials after approval.',
        'Operator enters the CarGurus feed credentials in the portal.',
        'System generates SFTP/XML feed on schedule and delivers to CarGurus.',
      ],
    },
  },
  'autotrader-cox': {
    admin: null,
    operator: {
      ...PARTNER_FEED_OPERATOR,
      shortBlurb: 'Dealer signs up via Cox Automotive — AutoTrader feed credentials are issued through the Cox dealer portal.',
      dealerPortalUrl: AUTOTRADER_DEALER_URL,
      steps: [
        'Dealer applies for an AutoTrader listing account through Cox Automotive.',
        'Cox Automotive provisions the dealer and provides feed access credentials.',
        'Operator enters feed endpoint and dealer credentials in the portal.',
        'System generates the inventory feed on schedule and pushes to AutoTrader.',
      ],
    },
  },
  'cars-com': {
    admin: null,
    operator: {
      ...PARTNER_FEED_OPERATOR,
      shortBlurb: 'Dealer signs up for a Cars.com dealer account — feed credentials come from the Cars.com dealer portal.',
      dealerPortalUrl: CARS_COM_DEALER_URL,
      steps: [
        'Dealer applies for a Cars.com dealer account at dealer.cars.com.',
        'Cars.com provides feed endpoint credentials after account setup.',
        'Operator enters the Cars.com feed credentials in the portal.',
        'System delivers the inventory feed on schedule.',
      ],
    },
  },
  'truecar-dealer-network': {
    admin: null,
    operator: {
      ...PARTNER_FEED_OPERATOR,
      shortBlurb: 'Dealer signs up for TrueCar — feed credentials are issued via the TrueCar dealer portal.',
      dealerPortalUrl: TRUECAR_DEALER_URL,
      steps: [
        'Dealer applies for a TrueCar dealer network listing account at dealer.truecar.com.',
        'TrueCar provides feed credentials after onboarding.',
        'Operator enters the TrueCar feed credentials in the portal.',
        'System delivers the inventory feed on schedule.',
      ],
    },
  },
  'carfax-for-dealers': {
    admin: null,
    operator: {
      ...PARTNER_FEED_OPERATOR,
      shortBlurb: 'Dealer signs up for CARFAX for Dealers — feed credentials come from the CARFAX partner portal.',
      dealerPortalUrl: CARFAX_DEALER_URL,
      steps: [
        'Dealer applies for a CARFAX for Dealers account at carfax.com/carfax-dealers.',
        'CARFAX provides API or SFTP feed credentials after account setup.',
        'Operator enters the CARFAX feed credentials in the portal.',
        'System delivers the inventory feed on schedule.',
      ],
    },
  },
  'rv-trader': {
    admin: null,
    operator: {
      ...PARTNER_FEED_OPERATOR,
      shortBlurb: 'Dealer signs up for an RV Trader dealer listing account — feed credentials provided by Trader Interactive.',
      dealerPortalUrl: RV_TRADER_DEALER_URL,
      steps: [
        'Dealer applies for an RV Trader dealer account at rvtrader.com/dealer-services.',
        'Trader Interactive provides feed credentials after account setup.',
        'Operator enters the RV Trader feed credentials in the portal.',
        'System delivers the RV/trailer inventory feed on schedule.',
      ],
    },
  },
  'cycle-trader': {
    admin: null,
    operator: {
      ...PARTNER_FEED_OPERATOR,
      shortBlurb: 'Dealer signs up for a Cycle Trader dealer account — feed credentials provided by Trader Interactive.',
      dealerPortalUrl: CYCLE_TRADER_DEALER_URL,
      steps: [
        'Dealer applies for a Cycle Trader dealer account at cycletrader.com/dealer-services.',
        'Trader Interactive provides feed credentials after account setup.',
        'Operator enters the Cycle Trader feed credentials in the portal.',
        'System delivers the powersports inventory feed on schedule.',
      ],
    },
  },
  'atv-trader': {
    admin: null,
    operator: {
      ...PARTNER_FEED_OPERATOR,
      shortBlurb: 'Dealer signs up for an ATV Trader dealer account — feed credentials provided by Trader Interactive.',
      dealerPortalUrl: ATV_TRADER_DEALER_URL,
      steps: [
        'Dealer applies for an ATV Trader dealer account at atvtrader.com/dealer-services.',
        'Trader Interactive provides feed credentials after account setup.',
        'Operator enters the ATV Trader feed credentials in the portal.',
        'System delivers the ATV inventory feed on schedule.',
      ],
    },
  },
  'trailer-trader': {
    admin: null,
    operator: {
      ...PARTNER_FEED_OPERATOR,
      shortBlurb: 'Dealer signs up for a Trailer Trader account — feed credentials provided by Trader Interactive.',
      dealerPortalUrl: TRAILER_TRADER_DEALER_URL,
      steps: [
        'Dealer applies for a Trailer Trader account at traderinteractive.com.',
        'Trader Interactive provides feed credentials after account setup.',
        'Operator enters the Trailer Trader feed credentials in the portal.',
        'System delivers the trailer inventory feed on schedule.',
      ],
    },
  },
  'adf-xml-lead-routing': {
    admin: null,
    operator: {
      shortBlurb: 'ADF/XML lead routing — no external platform account. Configure the dealer\'s CRM email endpoint.',
      connectionLabel: 'Internal lead routing (CRM email endpoint)',
      steps: [
        'Obtain the dealer\'s CRM ADF/XML inbound email address from their CRM vendor.',
        'Enter the CRM email address in the dealer\'s platform settings.',
        'System routes incoming leads as ADF/XML-formatted emails to the CRM.',
        'Verify delivery by submitting a test lead from the portal.',
      ],
      validationNote: 'System validates that an ADF email endpoint is configured. Delivery confirmation requires a test lead submission.',
    },
  },
  'google-business-profile': {
    admin: GOOGLE_PROFILE_ADMIN,
    operator: {
      ...SHARED_OAUTH_OPERATOR,
      shortBlurb: 'Dealer connects their Google Business Profile account to enable posting and updates.',
      steps: [
        'Dealer must be a verified owner or manager of their Google Business Profile.',
        'Dealer opens the platform page and clicks Connect with Google.',
        'Authorizes business.manage scope for Business Profile access.',
        'System posts inventory highlights and business updates to their Business Profile.',
      ],
    },
  },
};
