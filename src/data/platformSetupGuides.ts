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
    description: 'Facebook Business Page posting publishes inventory highlights, new arrivals, and promotional content directly to a dealer\'s Facebook Page feed and followers. Posts are generated automatically from live inventory and can include photos, pricing, and VDP links. This channel builds organic reach and follower engagement without paid ad spend, complementing paid catalog campaigns on the same platform.',
    externalLinks: [
      { label: 'Pages API docs', url: 'https://developers.facebook.com/docs/pages-api/' },
      { label: 'Meta Business Suite', url: 'https://business.facebook.com' },
    ],
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
    description: 'Microsoft Advertising (formerly Bing Ads) runs vehicle catalog ads across Bing, Yahoo, and the Microsoft Audience Network, reaching buyers who tend to be older, higher-income, and less reached by Google-only campaigns. Inventory is delivered as a vehicle feed and processed into catalog-driven dynamic search ads. Microsoft\'s automotive ad format closely mirrors Google Vehicle Ads and supports the same feed schema with minor differences.',
    externalLinks: [
      { label: 'Microsoft Advertising API', url: 'https://learn.microsoft.com/en-us/advertising/guides/' },
      { label: 'Automotive Ads', url: 'https://about.ads.microsoft.com/en-us/solutions/industry/automotive' },
      { label: 'Ads Manager', url: 'https://ui.ads.microsoft.com' },
    ],
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
    description: 'LinkedIn Lead Gen Forms capture buyer and fleet-purchase leads from sponsored posts and InMail campaigns on LinkedIn, targeting professionals by job title, industry, company size, and seniority. When a prospect clicks a sponsored ad, a pre-filled form appears inside LinkedIn — no landing page required — dramatically lowering drop-off rates. Submitted leads are routed in real time into the dealer\'s CRM via the platform\'s lead sync pipeline. The system shares the same Azure OAuth app as Microsoft Advertising.',
    externalLinks: [
      { label: 'LinkedIn Marketing Developer Platform', url: 'https://learn.microsoft.com/en-us/linkedin/marketing/' },
      { label: 'Lead Gen Forms', url: 'https://business.linkedin.com/marketing-solutions/linkedin-lead-gen-forms' },
      { label: 'Campaign Manager', url: 'https://www.linkedin.com/campaignmanager' },
    ],
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
    description: 'TikTok Automotive Ads run video and catalog-driven ad units through TikTok for Business, reaching an engaged mobile audience that skews younger and increasingly in-market for vehicles. Dynamic catalog ads surface individual vehicle listings based on user interest signals, while video creatives run in-feed alongside organic content. TikTok\'s automotive advertising is expanding rapidly and represents a fast-growing channel for dealers targeting millennial and Gen Z buyers.',
    externalLinks: [
      { label: 'TikTok Marketing API', url: 'https://ads.tiktok.com/marketing_api/docs' },
      { label: 'TikTok Ads Manager', url: 'https://ads.tiktok.com' },
    ],
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
    description: 'TikTok Shop brings e-commerce directly into the TikTok app, letting buyers discover and purchase products without leaving the platform. For dealers, TikTok Shop enables listing vehicles, accessories, and merchandise directly in their TikTok Shop storefront, powered by TikTok\'s Seller Center API. This channel is separate from TikTok Ads and uses different credentials — the Seller Center App Key and Secret rather than the Marketing API.',
    externalLinks: [
      { label: 'TikTok Shop API', url: 'https://partner.tiktokshop.com/docv2/' },
      { label: 'Seller Center', url: 'https://seller.tiktokglobalshop.com' },
    ],
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
    description: 'eBay Motors is one of the largest online vehicle marketplaces in the United States, with tens of millions of active buyers browsing cars, trucks, SUVs, motorcycles, and parts. Unlike most advertising-driven platforms, eBay Motors allows dealers to list vehicles for direct sale — buyers can make offers, use Buy It Now pricing, or bid in auction format. Each dealer authenticates with their own eBay seller account via OAuth; the system\'s developer credentials (App ID + Cert ID) handle app-level auth while per-dealer OAuth tokens authorize listing and inventory management.',
    externalLinks: [
      { label: 'Sell Inventory API', url: 'https://developer.ebay.com/api-docs/sell/inventory/static/overview.html' },
      { label: 'eBay Developer Program', url: 'https://developer.ebay.com' },
      { label: 'eBay Motors', url: 'https://www.ebay.com/motors' },
    ],
    admin: EBAY_ADMIN,
    operator: DEALER_OAUTH_OPERATOR,
  },
  'pinterest-shopping-ads': {
    description: 'Pinterest Shopping Ads use Dynamic Product Ads to surface vehicle listings to Pinterest users who are actively researching purchases, planning home moves, or browsing automotive content. Because Pinterest is a high-intent discovery platform — users save and return to ideas over weeks or months — automotive ads here reach buyers earlier in the purchase funnel than search-based formats. Inventory syncs to a Pinterest catalog; ads are auto-generated per-listing based on catalog data.',
    externalLinks: [
      { label: 'Pinterest Catalogs API', url: 'https://developers.pinterest.com/docs/api/v5/catalogs-introduction/' },
      { label: 'Pinterest Ads Manager', url: 'https://ads.pinterest.com' },
      { label: 'Shopping Ads', url: 'https://business.pinterest.com/en/shopping-ads/' },
    ],
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
    description: 'Reddit Dynamic Product Ads target automotive subreddits — r/askcarsales, r/cars, r/whatcarshouldIbuy, and others — as well as in-market audience segments defined by Reddit\'s interest graph. Ads appear in-feed alongside organic posts and are generated dynamically from the dealer\'s product catalog. Reddit\'s community-based targeting is uniquely effective for reaching buyers who actively seek peer advice before purchasing.',
    externalLinks: [
      { label: 'Reddit Ads API', url: 'https://ads-api.reddit.com/docs/' },
      { label: 'Reddit Ads', url: 'https://ads.reddit.com' },
      { label: 'Dynamic Product Ads', url: 'https://www.redditforbusiness.com/product/dynamic-product-ads' },
    ],
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
    description: 'Snapchat Dynamic Product Ads deliver vehicle catalog ads to Snapchat\'s highly engaged mobile audience using full-screen vertical creative formats. Snap DPA retargets users based on web browsing signals and Snap\'s own interest graph, surfacing relevant vehicle listings in Stories, Discover, and the between-content ad breaks. Snapchat\'s audience skews younger than traditional automotive media, making it effective for reaching first-time buyers and younger upgrade shoppers.',
    externalLinks: [
      { label: 'Marketing API docs', url: 'https://developers.snap.com/api/marketing-api/' },
      { label: 'Snap Ads Manager', url: 'https://ads.snapchat.com' },
      { label: 'Dynamic Ads guide', url: 'https://businesshelp.snapchat.com/s/article/dynamic-ads' },
    ],
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
    description: 'X (formerly Twitter) Dynamic Product Ads serve vehicle listings to automotive buyers on X using catalog-driven creative generated from the dealer\'s inventory feed. Ads appear in the home timeline and search results, targeting users who follow automotive accounts, have recently searched for vehicles, or match the dealer\'s uploaded customer list. X\'s Ads API provides programmatic catalog management and campaign optimization.',
    externalLinks: [
      { label: 'X Ads API', url: 'https://developer.x.com/en/docs/x-ads-api' },
      { label: 'X Ads Manager', url: 'https://ads.x.com' },
    ],
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
    description: 'Nextdoor Ads reach buyers within a defined neighborhood radius, making this platform uniquely effective for local dealerships trying to reach in-market shoppers who live close to their lot. Ads appear in the Nextdoor feed alongside neighborhood posts and local business recommendations — an environment where community trust is high and local businesses are actively sought. Nextdoor\'s audience targeting is based on verified residential address, not demographic proxies.',
    externalLinks: [
      { label: 'Nextdoor Business', url: 'https://business.nextdoor.com' },
    ],
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
    description: 'Apple Business Connect controls how a dealer\'s business appears across the Apple ecosystem — Apple Maps, Siri, Spotlight Search, Safari, and Wallet. Claiming and managing a Business Connect listing improves visibility when iPhone and Mac users search for nearby dealers or specific vehicle brands. The platform also supports showcasing hours, photos, and special offers. Integration is managed manually through Apple\'s partner portal; the Apple Business Connect API is available but requires Apple Developer Program enrollment and a signed JWT for authentication, which is pending in our integration.',
    externalLinks: [
      { label: 'Business Connect API', url: 'https://developer.apple.com/documentation/applebusinessconnectapi' },
      { label: 'Register on Maps', url: 'https://register.apple.com/placesonmaps' },
      { label: 'Apple Developer', url: 'https://developer.apple.com/account' },
    ],
    admin: APPLE_ADMIN,
    operator: MANUAL_PORTAL_OPERATOR,
  },
  'cargurus-dealer': {
    description: 'CarGurus is one of the most-visited automotive marketplaces in the US, known for its "Deal Rating" system that scores every listing as Great, Good, Fair, or Overpriced based on real-time price analysis relative to comparable vehicles in the market. Buyers search CarGurus specifically to find value, so competitive pricing and complete vehicle data (photos, history, features) directly impact listing performance. Inventory is delivered as a structured XML feed on a scheduled basis.',
    externalLinks: [
      { label: 'CarGurus for Dealers', url: 'https://www.cargurus.com/Cars/dealers/' },
      { label: 'CarGurus', url: 'https://www.cargurus.com' },
    ],
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
    description: 'AutoTrader is one of the oldest and most recognized vehicle marketplace brands in the US, operating under Cox Automotive alongside Kelley Blue Book, Dealertrack, and vAuto. Buyers on AutoTrader tend to be highly qualified — the platform\'s research tools, price-check features, and saved search functionality attract shoppers who are close to making a purchase decision. As a Cox Automotive integration, the feed and credentials flow through the broader Cox dealer network.',
    externalLinks: [
      { label: 'AutoTrader for Dealers', url: 'https://www.autotrader.com/dealers/' },
      { label: 'Cox Automotive', url: 'https://www.coxautoinc.com' },
      { label: 'AutoTrader', url: 'https://www.autotrader.com' },
    ],
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
    description: 'Cars.com is a major automotive marketplace featuring consumer vehicle listings alongside dealer reviews, price history, expert editorial content, and financing tools. It ranks well in organic search for vehicle-specific queries, drawing buyers who arrive from Google with high purchase intent. The platform places significant weight on dealer reputation — reviews and ratings factor into listing visibility — making it a channel where dealer customer satisfaction directly impacts lead volume.',
    externalLinks: [
      { label: 'Cars.com for Dealers', url: 'https://dealer.cars.com/' },
      { label: 'Cars.com', url: 'https://www.cars.com' },
    ],
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
    description: 'TrueCar connects in-market buyers with dealers by showing upfront, market-calibrated pricing before the buyer contacts the dealer. Because buyers arrive having already seen what the car should cost, TrueCar leads tend to convert at higher rates with less negotiation friction — but the model requires dealers to commit to transparent, competitive pricing. TrueCar charges per-sale rather than per-lead, aligning its incentives with actual deal closings rather than just inquiry volume.',
    externalLinks: [
      { label: 'TrueCar for Dealers', url: 'https://dealer.truecar.com/' },
      { label: 'TrueCar', url: 'https://www.truecar.com' },
    ],
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
    description: 'CARFAX for Dealers enables dealers to display the CARFAX vehicle history badge on their listings — a strong consumer trust signal that increases buyer confidence and reduces time to purchase. CARFAX also provides dealers with unlimited vehicle history reports, window sticker data, and market valuation tools. The CARFAX badge on a listing communicates "this dealer stands behind the vehicle\'s history," which measurably improves click-through and lead conversion rates compared to unverified listings.',
    externalLinks: [
      { label: 'CARFAX for Dealers', url: 'https://www.carfax.com/carfax-dealers/' },
      { label: 'CARFAX', url: 'https://www.carfax.com' },
    ],
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
    description: 'RV Trader is the leading online marketplace for recreational vehicles in North America, operated by Trader Interactive. Dealers list their RV inventory — motorhomes, travel trailers, fifth wheels, campers, and toy haulers — to reach millions of active RV shoppers each month. Inventory reaches RV Trader via a structured data feed, meaning the dealer\'s stock stays synchronized automatically without manual re-entry. For dealers who sell recreational vehicles alongside automobiles, RV Trader is the category-specific destination that serious RV buyers check first.',
    externalLinks: [
      { label: 'RV Trader Dealer Services', url: 'https://www.rvtrader.com/dealer-services' },
      { label: 'Trader Interactive', url: 'https://www.traderinteractive.com' },
    ],
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
    description: 'Cycle Trader, also part of the Trader Interactive family, is North America\'s largest powersports marketplace — connecting buyers with motorcycles, scooters, mopeds, and street bikes from dealers and private sellers alike. For dealers with a powersports line, Cycle Trader offers access to a highly targeted audience of enthusiast buyers who search by brand, engine size, and style. Inventory is delivered via a managed feed, keeping listings current without manual intervention.',
    externalLinks: [
      { label: 'Cycle Trader Dealer Services', url: 'https://www.cycletrader.com/dealer-services' },
      { label: 'Trader Interactive', url: 'https://www.traderinteractive.com' },
    ],
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
    description: 'ATV Trader is Trader Interactive\'s vertical marketplace dedicated to all-terrain vehicles — ATVs, UTVs, side-by-sides, and off-road recreational vehicles. Buyers shopping for sport, utility, or youth ATVs come to ATV Trader specifically, making it a high-intent destination for dealers carrying off-road inventory. Like other Trader Interactive properties, listings are delivered via a structured feed so inventory stays accurate and up-to-date across channels automatically.',
    externalLinks: [
      { label: 'ATV Trader Dealer Services', url: 'https://www.atvtrader.com/dealer-services' },
      { label: 'Trader Interactive', url: 'https://www.traderinteractive.com' },
    ],
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
    description: 'Trailer Trader is the Trader Interactive marketplace for commercial and recreational trailers — cargo trailers, flatbeds, horse trailers, livestock trailers, utility trailers, and more. Dealers who stock trailers alongside other vehicle types can extend their reach to buyers who shop specifically for hauling and transport equipment. Inventory is synchronized via the same partner feed infrastructure used across the Trader Interactive network.',
    externalLinks: [
      { label: 'Trader Interactive Dealer Services', url: 'https://www.traderinteractive.com/dealer-services' },
      { label: 'Trader Interactive', url: 'https://www.traderinteractive.com' },
    ],
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
    description: 'ADF/XML Lead Routing is not an external platform — it is a standardized protocol for delivering sales leads directly into a dealer\'s CRM. ADF stands for Automotive Data Format (also called XML Lead Format or ADF/XML). When a buyer submits an inquiry on any connected platform, the system packages that inquiry as an ADF/XML-formatted email and routes it to the CRM inbound email address the dealer\'s CRM vendor provides. Most major dealer CRMs — including VinSolutions, DealerSocket, elead, and CDK — accept ADF/XML leads this way. No external platform account is required; the "credential" is simply the dealer\'s CRM email endpoint. This integration ensures that every lead generated across all connected channels lands inside the dealer\'s CRM automatically, with structured data the CRM can parse and route to the right salesperson.',
    externalLinks: [
      { label: 'NADA ADF Standard Reference', url: 'https://www.nada.org/nadafront/pdf/NADA_ADF_Standard.pdf' },
      { label: 'ADF/XML Overview (Automotive Standards)', url: 'https://www.autosoft-inc.com/lead-management/adf-xml/' },
    ],
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
    description: 'Google Business Profile (formerly Google My Business) is the free listing that appears when someone searches for a dealership by name on Google Search or Google Maps. It shows the dealer\'s address, hours, phone number, photos, and customer reviews — and it is often the first impression a buyer gets before visiting. Beyond the static profile, Business Profile supports Posts: short updates, offers, and event announcements that appear directly in the listing. This integration uses Google\'s Business Profile API to publish inventory highlights and promotional content as posts, keeping the dealer\'s Google presence current without manual effort. Dealers connect their own Business Profile account via OAuth, granting the platform permission to post on their behalf.',
    externalLinks: [
      { label: 'Google Business Profile', url: 'https://business.google.com' },
      { label: 'Business Profile API Docs', url: 'https://developers.google.com/my-business/content/basic-setup' },
      { label: 'Google Cloud Console', url: 'https://console.cloud.google.com/apis/credentials' },
    ],
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

  // ── Marine ────────────────────────────────────────────────────────────────────

  'boat-trader': {
    description: 'Boat Trader is the leading US marketplace for new and used recreational boats — powerboats, sailboats, pontoon boats, PWC, fishing boats, and more — operated by Trader Interactive. With millions of monthly shoppers browsing by hull type, length, engine configuration, and price, it is the first destination for serious marine buyers. Inventory is submitted via a structured partner feed, keeping dealer stock synchronized automatically.',
    externalLinks: [
      { label: 'Boat Trader Dealer Services', url: 'https://www.boattrader.com/' },
      { label: 'Trader Interactive', url: 'https://www.traderinteractive.com' },
    ],
    admin: null,
    operator: null,
  },
  'yachtworld': {
    description: 'YachtWorld is the global standard marketplace for yacht and superyacht listings, operated by Boats Group. It serves professional brokers and dealers listing sailing yachts, motor yachts, catamarans, and commercial vessels at the higher end of the marine market. Buyers on YachtWorld tend to be serious international purchasers — many transactions involve brokerage, surveying, and cross-border documentation. Listing activation requires brokerage onboarding and account approval.',
    externalLinks: [
      { label: 'YachtWorld', url: 'https://www.yachtworld.com' },
      { label: 'Boats Group', url: 'https://boatsgroup.com' },
    ],
    admin: null,
    operator: null,
  },
  'boats-com': {
    description: 'Boats.com is the broader consumer-facing companion to YachtWorld — also operated by Boats Group — covering recreational powerboats, fishing boats, and watercraft alongside premium brokerage inventory. It reaches buyers across a wider price range and boat type than YachtWorld alone. Both platforms share a unified listing infrastructure, so inventory submitted to Boats Group\'s network typically appears across both.',
    externalLinks: [
      { label: 'Boats.com', url: 'https://www.boats.com' },
      { label: 'Boats Group', url: 'https://boatsgroup.com' },
    ],
    admin: null,
    operator: null,
  },

  // ── Music / Songs ─────────────────────────────────────────────────────────────

  'distrokid': {
    description: 'DistroKid is the most widely used independent music distribution service, delivering releases from artists and labels to Spotify, Apple Music, Amazon Music, Tidal, and 100+ streaming and download platforms worldwide for a flat annual fee. For music catalog operators, DistroKid is the fastest and most cost-effective path to global distribution without per-release or per-store fees. UPC barcodes and ISRC codes are managed through the release packet.',
    externalLinks: [
      { label: 'DistroKid', url: 'https://distrokid.com' },
      { label: 'DistroKid Help', url: 'https://distrokid.com/help/' },
    ],
    admin: null,
    operator: null,
  },
  'spotify-for-artists': {
    description: 'Spotify for Artists is the official management portal for artists and their teams on the world\'s largest music streaming platform. Beyond streaming, it enables editorial playlist pitching, Canvas video loop uploads, fundraiser links, and real-time listener analytics. For operators managing artist catalogs, this integration surfaces Spotify-specific metadata management and release coordination through the central portal.',
    externalLinks: [
      { label: 'Spotify for Artists', url: 'https://artists.spotify.com' },
      { label: 'Artists Help', url: 'https://artists.spotify.com/help' },
    ],
    admin: null,
    operator: null,
  },
  'tunecore': {
    description: 'TuneCore is an independent music distribution and publishing administration service that charges per release rather than a flat annual fee. Its detailed per-platform royalty reporting and publishing rights administration tools make it popular with professional artists and small labels who want granular financial breakdowns across stores and streaming platforms.',
    externalLinks: [
      { label: 'TuneCore', url: 'https://www.tunecore.com' },
      { label: 'Distribution Guides', url: 'https://www.tunecore.com/guides' },
    ],
    admin: null,
    operator: null,
  },
  'bandcamp': {
    description: 'Bandcamp is a direct-to-fan music marketplace where artists sell downloads, vinyl, merchandise, and CDs — and where fans can stream, follow, and financially support artists they care about. Unlike subscription streaming platforms, Bandcamp pays artists the majority of each sale immediately. It is the dominant channel for independent artists who prioritize owning their fan relationship and monetizing directly rather than through algorithmic streams.',
    externalLinks: [
      { label: 'Bandcamp for Artists', url: 'https://bandcamp.com/artists' },
      { label: 'Bandcamp Help', url: 'https://get.bandcamp.help/hc/en-us' },
    ],
    admin: null,
    operator: null,
  },

  // ── E-books ───────────────────────────────────────────────────────────────────

  'amazon-kdp': {
    description: 'Amazon Kindle Direct Publishing (KDP) is the dominant self-publishing platform for e-books, reaching Kindle device owners and the Kindle app across every platform. KDP Select enrollment unlocks Kindle Unlimited — the subscription reading program with tens of millions of subscribers — in exchange for exclusivity. For any e-book publisher or catalog operator, KDP is the highest-volume, highest-reach channel and is effectively non-optional.',
    externalLinks: [
      { label: 'Kindle Direct Publishing', url: 'https://kdp.amazon.com' },
      { label: 'KDP Help', url: 'https://kdp.amazon.com/en_US/help/topic/G200635650' },
    ],
    admin: null,
    operator: null,
  },
  'apple-books': {
    description: 'Apple Books distributes e-books and audiobooks to the native Books app on iPhone, iPad, and Mac — reaching hundreds of millions of Apple device users without requiring a separate app. It is the second-largest e-book storefront globally after Amazon. Publishers and authors upload through Apple Books Connect; pricing and metadata are managed per-title.',
    externalLinks: [
      { label: 'Apple Books for Authors', url: 'https://authors.apple.com' },
      { label: 'Books Connect Support', url: 'https://authors.apple.com/support' },
    ],
    admin: null,
    operator: null,
  },
  'google-play-books': {
    description: 'Google Play Books is Google\'s e-book and audiobook store, available on Android, iOS, and any web browser via a Google account. It is the primary e-book destination for Android-first markets and reaches a different segment from Kindle and Apple Books — particularly valuable in emerging markets where Android dominates. Distribution is managed through the Google Play Books Partner Center.',
    externalLinks: [
      { label: 'Play Books Partner Center', url: 'https://play.google.com/books/publish/' },
      { label: 'Partner Center Help', url: 'https://support.google.com/books/partner/answer/3324396' },
    ],
    admin: null,
    operator: null,
  },
  'barnes-noble-press': {
    description: 'Barnes & Noble Press is the self-publishing imprint of Barnes & Noble, distributing e-books to Nook device owners and the Nook app. While the Nook platform is smaller than Kindle or Apple, B&N Press readers tend to be loyal to the platform and B&N\'s physical retail presence gives publishers access to in-store print-on-demand options alongside digital distribution.',
    externalLinks: [
      { label: 'Barnes & Noble Press', url: 'https://press.barnesandnoble.com' },
      { label: 'Press Help', url: 'https://press.barnesandnoble.com/help' },
    ],
    admin: null,
    operator: null,
  },

  // ── Apparel ───────────────────────────────────────────────────────────────────

  'shopify-catalog': {
    description: 'Shopify Catalog integration connects the central inventory platform directly to an operator\'s or dealer\'s Shopify storefront, keeping product listings, pricing, and availability synchronized automatically. Unlike a consumer marketplace, Shopify powers the operator\'s own branded store — this channel manages product data, variant options, and inventory counts within the Shopify admin via the Storefront and Admin APIs.',
    externalLinks: [
      { label: 'Shopify Admin API', url: 'https://shopify.dev/docs/api/admin-rest/latest/resources/product' },
      { label: 'Shopify Partner Portal', url: 'https://www.shopify.com' },
    ],
    admin: null,
    operator: null,
  },
  'etsy': {
    description: 'Etsy is the leading marketplace for handmade, vintage, and craft goods, with tens of millions of active buyers who specifically seek unique, non-mass-market products. For dealers in art, handmade apparel, vintage clothing, and craft supplies, Etsy provides a pre-qualified audience that is actively looking for distinctive items. Shop setup and listing approval are required before inventory goes live.',
    externalLinks: [
      { label: 'Etsy Seller Hub', url: 'https://www.etsy.com/sell' },
      { label: 'Etsy Developer API', url: 'https://developers.etsy.com/documentation/' },
    ],
    admin: null,
    operator: null,
  },
  'poshmark': {
    description: 'Poshmark is the largest social commerce platform for fashion resale in the US, where buyers browse by brand, size, and style from individual seller closets and professional resellers. Its social features — following, sharing, offers — create a shopping experience more like Instagram than a traditional marketplace. For apparel dealers, Poshmark provides access to a large, engaged fashion audience that actively shops secondhand.',
    externalLinks: [
      { label: 'Sell on Poshmark', url: 'https://poshmark.com/sell_on_poshmark' },
    ],
    admin: null,
    operator: null,
  },
  'depop': {
    description: 'Depop is a fashion resale marketplace with a heavily Gen Z and millennial user base, known for vintage, streetwear, and Y2K fashion. Owned by Etsy, it combines social media aesthetics with peer-to-peer resale — sellers build a following, buyers discover through feeds and search. For apparel dealers targeting younger shoppers with curated vintage or contemporary fashion, Depop is the primary channel.',
    externalLinks: [
      { label: 'Depop Sell', url: 'https://www.depop.com/sell/' },
      { label: 'Depop Help', url: 'https://help.depop.com/hc/en-us' },
    ],
    admin: null,
    operator: null,
  },

  // ── Digital Art ───────────────────────────────────────────────────────────────

  'opensea': {
    description: 'OpenSea is the largest NFT marketplace, where digital art, collectibles, game items, virtual real estate, and domain names are bought, sold, and auctioned as blockchain-backed tokens on Ethereum, Polygon, and other chains. For digital art operators, OpenSea is the primary distribution and discovery channel for NFT-based creative work, with the deepest liquidity and the largest collector base.',
    externalLinks: [
      { label: 'OpenSea', url: 'https://opensea.io' },
      { label: 'OpenSea Docs', url: 'https://docs.opensea.io' },
    ],
    admin: null,
    operator: null,
  },
  'artstation-marketplace': {
    description: 'ArtStation Marketplace (owned by Epic Games) is the dominant platform for professional digital artists selling high-quality assets — production brushes, 3D models, concept art tutorials, texture packs, and environment assets — to game developers, VFX artists, and other professionals. The audience is composed of working artists and studios who pay a premium for production-ready work.',
    externalLinks: [
      { label: 'ArtStation Marketplace', url: 'https://www.artstation.com/marketplace' },
    ],
    admin: null,
    operator: null,
  },
  'saatchi-art': {
    description: 'Saatchi Art is the world\'s largest online art gallery, connecting collectors with original paintings, drawings, sculpture, photography, and prints from artists worldwide. Unlike peer-to-peer resale platforms, Saatchi Art functions as a curated gallery — editorial discovery, white-glove packaging, and a collector audience willing to spend on original and limited-edition work.',
    externalLinks: [
      { label: 'Sell on Saatchi Art', url: 'https://www.saatchiart.com/sell' },
      { label: 'Saatchi Art Artist Help', url: 'https://www.saatchiart.com/artisthelp' },
    ],
    admin: null,
    operator: null,
  },
  'redbubble': {
    description: 'Redbubble is a print-on-demand marketplace where artists upload original designs that are printed on demand across a wide range of products — t-shirts, phone cases, stickers, wall art, mugs, and more — whenever a customer places an order. Artists set their own margin on top of Redbubble\'s base price; Redbubble handles all production, fulfillment, and customer service.',
    externalLinks: [
      { label: 'Redbubble Artist Shop', url: 'https://www.redbubble.com/shop/dashboard' },
      { label: 'Redbubble Help', url: 'https://help.redbubble.com/hc/en-us' },
    ],
    admin: null,
    operator: null,
  },

  // ── Video Distribution ────────────────────────────────────────────────────────

  'youtube-creator': {
    description: 'YouTube Creator Studio integration manages video content publishing, metadata, and channel configuration for YouTube channels via the YouTube Data API. For operators managing large video catalogs or multi-channel networks, this integration automates title, description, thumbnail, and chapter metadata at publish time — keeping channel content consistent and searchable without manual video-by-video editing.',
    externalLinks: [
      { label: 'YouTube Creator Studio', url: 'https://studio.youtube.com' },
      { label: 'YouTube Data API', url: 'https://support.google.com/youtube/topic/9257498' },
    ],
    admin: null,
    operator: null,
  },
  'vimeo-ott': {
    description: 'Vimeo OTT (Over The Top) is a white-label subscription and rental video platform for creators and businesses who want a branded streaming channel without building on YouTube. It supports paywalled content, live streaming, subscriber management, and built-in payment processing — giving operators a direct revenue relationship with their audience rather than sharing it with a platform\'s ad model.',
    externalLinks: [
      { label: 'Vimeo OTT', url: 'https://vimeo.com/ott' },
      { label: 'Vimeo OTT Help', url: 'https://help.vimeo.com/hc/en-us/categories/200950527-Vimeo-OTT' },
    ],
    admin: null,
    operator: null,
  },
  'tiktok-creator': {
    description: 'TikTok Creator Portal integration manages organic content publishing and analytics for TikTok creator accounts — distinct from TikTok Ads (paid media) and TikTok Shop (e-commerce). For operators producing short-form video content at scale, this channel enables scheduled publishing, metadata management, and cross-account consistency through the central platform.',
    externalLinks: [
      { label: 'TikTok Creator Portal', url: 'https://www.tiktok.com/creators/creator-portal/' },
    ],
    admin: null,
    operator: null,
  },
  'rumble-creator': {
    description: 'Rumble is a video hosting and monetization platform that has emerged as a significant alternative to YouTube, with strong creator economics and a politically diverse audience. For content operators distributing video across multiple platforms, Rumble provides a growing distribution point with its own ad network, subscription program, and live streaming infrastructure — and its audience is meaningfully different from YouTube\'s.',
    externalLinks: [
      { label: 'Rumble Upload', url: 'https://rumble.com/upload.php' },
      { label: 'Rumble Help', url: 'https://rumble.com/help' },
    ],
    admin: null,
    operator: null,
  },

  // ── Pawn / Resale ─────────────────────────────────────────────────────────────

  'ebay-resale': {
    description: 'eBay Seller Hub is eBay\'s general resale marketplace — covering electronics, clothing, collectibles, art, tools, and nearly every consumer category — powered by the same Sell Inventory API used for eBay Motors. Unlike eBay Motors (which is a separate automotive integration), this channel handles non-vehicle categories through the standard eBay listing and inventory management pipeline. eBay\'s global reach makes it the largest general resale marketplace in the world by transaction volume.',
    externalLinks: [
      { label: 'eBay Sell', url: 'https://www.ebay.com/sl/sell' },
      { label: 'Sell Inventory API', url: 'https://developer.ebay.com/api-docs/sell/inventory/overview.html' },
    ],
    admin: null,
    operator: null,
  },
  'mercari': {
    description: 'Mercari is a peer-to-peer resale app with tens of millions of active users in the US and Japan, known for its frictionless listing experience and broad category coverage — electronics, clothing, collectibles, toys, and accessories. It is a mobile-first platform with strong buyer protections and a growing base of professional resellers. For dealers in pre-owned goods across categories, Mercari provides a fast-moving, high-traffic secondhand marketplace.',
    externalLinks: [
      { label: 'Sell on Mercari', url: 'https://www.mercari.com/sell/' },
    ],
    admin: null,
    operator: null,
  },
  'offerup': {
    description: 'OfferUp is a local-first marketplace that merged with Letgo to become one of the largest buy-sell-trade apps in North America. It combines local pickup listings with shipping-enabled national sales, covering furniture, electronics, clothing, tools, and general goods. For dealers in pre-owned and refurbished goods, OfferUp\'s local buyer pool provides low-friction transactions without the shipping overhead of national platforms.',
    externalLinks: [
      { label: 'OfferUp Sell', url: 'https://offerup.com/sell/' },
    ],
    admin: null,
    operator: null,
  },
  'facebook-marketplace-resale': {
    description: 'Facebook Marketplace Resale uses the Meta Catalog API to push general-category inventory — furniture, electronics, clothing, appliances, and household goods — into Facebook\'s Marketplace browse experience for local and national buyers. This is a distinct integration from the automotive-focused Facebook Marketplace General channel; it targets non-vehicle resale categories through a separate catalog feed pipeline.',
    externalLinks: [
      { label: 'Facebook Marketplace', url: 'https://www.facebook.com/marketplace/' },
      { label: 'Catalog API Reference', url: 'https://developers.facebook.com/docs/marketing-api/catalog/reference' },
    ],
    admin: null,
    operator: null,
  },

  // ── Watches ───────────────────────────────────────────────────────────────────

  'chrono24-dealer': {
    description: 'Chrono24 is the world\'s leading marketplace for luxury and pre-owned watches, with listings from authorized dealers, grey-market sellers, and private collectors across more than 100 countries. Serious watch buyers research, compare, and transact on Chrono24 more than any other platform — making it the essential listing destination for watch dealers at any price point. Watch serial numbers map to the VIN field; reference numbers use the stock number.',
    externalLinks: [
      { label: 'Chrono24 Dealer Info', url: 'https://www.chrono24.com/dealerinfo.htm' },
      { label: 'Chrono24', url: 'https://www.chrono24.com' },
    ],
    admin: null,
    operator: null,
  },
  'watchbox': {
    description: 'WatchBox is a curated pre-owned luxury watch dealer and marketplace specializing in authenticated, serviced timepieces. It operates as both a wholesale buyer (purchasing watches from dealers and individuals) and a retail platform (selling to collectors). For high-end watch dealers, WatchBox provides access to a vetted collector audience that prioritizes authenticity and provenance over price alone.',
    externalLinks: [
      { label: 'WatchBox', url: 'https://www.thewatchbox.com' },
      { label: 'Sell Your Watch', url: 'https://www.thewatchbox.com/sell-your-watch' },
    ],
    admin: null,
    operator: null,
  },

  // ── Sneakers ──────────────────────────────────────────────────────────────────

  'stockx': {
    description: 'StockX is a live bid-ask marketplace for sneakers, streetwear, electronics, trading cards, and collectibles — operating like a stock exchange with real-time bid and ask prices for every product. Every item is authenticated by StockX before delivery to the buyer. For dealers in high-demand sneakers and limited-release goods, StockX provides transparent market price discovery and access to a large pool of verified buyers who trust the authentication process.',
    externalLinks: [
      { label: 'Sell on StockX', url: 'https://stockx.com/sell' },
      { label: 'StockX Selling Guide', url: 'https://stockx.com/help/selling' },
    ],
    admin: null,
    operator: null,
  },
  'goat-sneakers': {
    description: 'GOAT is the world\'s largest authenticated marketplace for sneakers and luxury goods — operating globally with millions of buyers in over 170 countries. Alongside StockX, it is the primary secondhand channel for limited-release sneakers, luxury fashion, and streetwear. GOAT\'s authentication service and "buy now or best offer" mechanics make it attractive to buyers who want guaranteed legitimate product at market prices.',
    externalLinks: [
      { label: 'Sell on GOAT', url: 'https://www.goat.com/sell' },
    ],
    admin: null,
    operator: null,
  },

  // ── Collectibles ──────────────────────────────────────────────────────────────

  'tcgplayer': {
    description: 'TCGplayer is the dominant US marketplace for trading card game singles and sealed product — Magic: The Gathering, Pokémon, Yu-Gi-Oh!, and dozens of other TCG titles. Buyers search for specific cards by name, set, and condition and compare prices across hundreds of individual sellers. For card dealers, TCGplayer is effectively the industry\'s price index as well as its primary B2C sales channel.',
    externalLinks: [
      { label: 'TCGplayer Seller', url: 'https://seller.tcgplayer.com' },
      { label: 'Seller Help', url: 'https://help.tcgplayer.com/hc/en-us' },
    ],
    admin: null,
    operator: null,
  },
  'pwcc-marketplace': {
    description: 'PWCC Marketplace is the largest sports card and memorabilia auction platform, handling weekly and premier auction consignments of graded and raw cards from Pokémon, basketball, baseball, football, and other categories. PWCC functions like a major auction house — items are consigned, graded by PSA/BGS/SGC if not already, and offered to a global collector base that bids competitively on authenticated material.',
    externalLinks: [
      { label: 'PWCC Marketplace', url: 'https://www.pwccmarketplace.com' },
      { label: 'PWCC FAQ', url: 'https://www.pwccmarketplace.com/faq' },
    ],
    admin: null,
    operator: null,
  },

  // ── Furniture / Home Goods ────────────────────────────────────────────────────

  'chairish': {
    description: 'Chairish is a curated marketplace for vintage and antique furniture, art, rugs, and home décor, serving interior designers, collectors, and discerning home buyers. Unlike general resale platforms, Chairish vets listings for quality and design integrity — sellers apply, and items are reviewed before going live. This makes it the destination for estate dealers, antique shops, and design-focused resellers targeting the interior design trade and luxury home market.',
    externalLinks: [
      { label: 'Sell on Chairish', url: 'https://www.chairish.com/sell' },
      { label: 'Seller FAQ', url: 'https://www.chairish.com/page/seller-faq' },
    ],
    admin: null,
    operator: null,
  },
  'wayfair-seller': {
    description: 'Wayfair Supplier integration connects manufacturers and wholesale distributors of home goods, furniture, lighting, and housewares directly to Wayfair\'s storefront and its sister sites — AllModern, Joss & Main, Birch Lane, and Perigold. Wayfair operates on a drop-ship model; inventory is synced via catalog feed and orders are fulfilled by the supplier. For home goods operators, Wayfair\'s traffic scale makes it one of the highest-volume retail channels available.',
    externalLinks: [
      { label: 'Wayfair Seller Portal', url: 'https://sell.wayfair.com' },
      { label: 'Seller Resources', url: 'https://sell.wayfair.com/resources' },
    ],
    admin: null,
    operator: null,
  },

  // ── Vacation Rentals ──────────────────────────────────────────────────────────

  'airbnb-host': {
    description: 'Airbnb is the world\'s largest short-term rental platform, connecting property hosts with travelers for stays ranging from a single night to several months. For property operators managing short-term rental portfolios, Airbnb integration syncs listing availability, pricing, and property details through the Airbnb API — reducing manual calendar management and keeping rates consistent with other channels.',
    externalLinks: [
      { label: 'Airbnb Host', url: 'https://www.airbnb.com/host/homes' },
    ],
    admin: null,
    operator: null,
  },
  'vrbo-owner': {
    description: 'Vrbo (Vacation Rentals by Owner), owned by Expedia Group, is the leading vacation rental platform for whole-home stays — cabins, beach houses, mountain retreats, and family-sized properties. Vrbo\'s audience skews toward families and groups booking longer stays, making it a complementary channel to Airbnb for property operators who want maximum reach across the short-term rental market.',
    externalLinks: [
      { label: 'Vrbo Owner', url: 'https://www.vrbo.com/owner/' },
      { label: 'Vrbo Help', url: 'https://help.vrbo.com' },
    ],
    admin: null,
    operator: null,
  },

  // ── Apartments / Residential Rentals ──────────────────────────────────────────

  'zillow-rental-manager': {
    description: 'Zillow Rental Manager is the primary portal for independent landlords and property managers to list rental properties — apartments, condos, townhomes, and single-family homes — on Zillow, Trulia, and HotPads simultaneously. It also provides tools for online rental applications, tenant screening, lease signing, and rent collection, making it a full rental management platform rather than just a listing syndication channel.',
    externalLinks: [
      { label: 'Zillow Rental Manager', url: 'https://www.zillow.com/rental-manager/' },
    ],
    admin: null,
    operator: null,
  },
  'apartments-com': {
    description: 'Apartments.com, owned by CoStar Group, is the largest professionally managed rental listing network in the US, covering apartments, condos, townhomes, and single-family rentals. It holds the dominant share of rental search traffic among property management companies and multi-family operators. Listings on Apartments.com also syndicate to sister sites including ApartmentFinder.com and ForRent.com.',
    externalLinks: [
      { label: 'Apartments.com Rental Tools', url: 'https://www.apartments.com/rental-tools/' },
    ],
    admin: null,
    operator: null,
  },

  // ── Residential For-Sale ──────────────────────────────────────────────────────

  'zillow-homes': {
    description: 'Zillow Premier Agent connects real estate agents and brokers to buyers browsing for-sale listings on Zillow and Trulia — the most visited real estate sites in the US. For brokerages and property operators managing active sale listings, Zillow integration keeps listing data, photos, price changes, and status synchronized across the Zillow network, reaching the largest residential buyer audience online.',
    externalLinks: [
      { label: 'Zillow Agent Resources', url: 'https://www.zillow.com/agent-resources/' },
    ],
    admin: null,
    operator: null,
  },
  'realtor-com': {
    description: 'Realtor.com is the official listing site of the National Association of Realtors, sourcing listings directly from MLS feeds to provide the most accurate and complete for-sale inventory data. Buyers who use Realtor.com tend to be further along in the purchase process and highly motivated — they trust the data accuracy because it comes from the same MLS systems brokers use. For brokerage operators, Realtor.com integration ensures accurate syndication of MLS-originated listings.',
    externalLinks: [
      { label: 'Realtor.com Marketing', url: 'https://www.realtor.com/marketing/' },
    ],
    admin: null,
    operator: null,
  },

  // ── Commercial Real Estate ────────────────────────────────────────────────────

  'loopnet': {
    description: 'LoopNet is the largest commercial real estate marketplace in the US, serving investors, tenants, and brokers looking for office, retail, industrial, multifamily, and land listings. Operated by CoStar Group, LoopNet is the standard destination for commercial brokers listing properties for lease or sale, and for investors searching deal flow. Premium listings gain exposure to CoStar\'s professional research subscriber base in addition to LoopNet\'s public audience.',
    externalLinks: [
      { label: 'LoopNet Solutions', url: 'https://www.loopnet.com/solutions/' },
      { label: 'LoopNet', url: 'https://www.loopnet.com' },
    ],
    admin: null,
    operator: null,
  },
  'crexi': {
    description: 'Crexi (Commercial Real Estate Exchange) is the fastest-growing commercial real estate platform, offering listings, transaction management tools, auction capabilities, and market data analytics. It has gained significant traction among smaller commercial brokers and regional investors as a modern alternative to LoopNet, with a more intuitive interface and lower listing costs. Crexi supports sale and lease listings across office, retail, industrial, land, and multifamily.',
    externalLinks: [
      { label: 'Crexi', url: 'https://www.crexi.com/sell' },
      { label: 'Crexi Help', url: 'https://www.crexi.com/help' },
    ],
    admin: null,
    operator: null,
  },

  // ── Heavy Equipment ───────────────────────────────────────────────────────────

  'machinery-trader': {
    description: 'MachineryTrader is the leading US marketplace for new and used heavy construction and agriculture equipment — excavators, cranes, bulldozers, backhoes, farm tractors, combines, and attachments. It serves equipment dealers, rental companies, and fleet operators listing to a professional buyer audience that shops by machine type, hours, condition, and location. Serial numbers map to the VIN field; equipment hours map to mileage.',
    externalLinks: [
      { label: 'MachineryTrader', url: 'https://www.machinerytrader.com' },
    ],
    admin: null,
    operator: null,
  },
  'ironplanet': {
    description: 'IronPlanet, owned by Ritchie Bros. Auctioneers, is the leading online auction platform for used heavy equipment. Every item listed on IronPlanet is independently inspected and graded with a detailed condition report before going to auction — giving buyers confidence to bid remotely on equipment they haven\'t physically inspected. For dealers and fleet operators liquidating large equipment inventories, IronPlanet provides access to a global pool of qualified buyers and transparent market pricing.',
    externalLinks: [
      { label: 'IronPlanet Sell', url: 'https://www.ironplanet.com/sell' },
      { label: 'IronPlanet', url: 'https://www.ironplanet.com' },
    ],
    admin: null,
    operator: null,
  },
};
