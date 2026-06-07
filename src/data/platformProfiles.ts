import type { PlatformProfileSeed } from '../lib/types.js';

export const platformProfiles: PlatformProfileSeed[] = [
  // ── Owned channel ────────────────────────────────────────────────────────
  {
    slug: 'dealer-storefront',
    name: 'Dealer Storefront (Owned Channel)',
    kind: 'DEALER_STOREFRONT',
    integrationClass: 'OWNED',
    schemaVersion: 'v4.0.0-owned-channel',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'HIGH',
    needsReview: false,
    sourceNote: 'White-label web feed channel. Sync publishes listing artifacts like any other destination — powers dealer-branded sites via feed, not a hosted per-dealer browse product. Consumer discovery is the internal marketplace (separate channel).',
    mockEndpoint: 'mock://platform/dealer-storefront',
    integrationUrls: {
      partnerPortalUrl: 'https://app.example.com/dashboard',
      developerDocsUrl: 'https://app.example.com/docs/api',
      apiBaseUrl: 'https://api.example.com/v1/',
      supportUrl: 'https://app.example.com/support',
      notes: 'Owned channel — no partner agreements required. Direct API access, built-in lead capture and analytics.'
    },
    outputFormat: 'OWNED_STOREFRONT_LISTING_JSON',
    submissionMethods: ['MOCK_API'],
    sourceUrls: [],
    requiredDealershipFields: [
      'legalName', 'rooftopAddress.street', 'rooftopAddress.city', 'rooftopAddress.state',
      'rooftopAddress.postalCode', 'websiteUrl', 'primaryContact.email', 'primaryContact.phone'
    ],
    supportedCategories: ['AUTOMOTIVE', 'TRAILERS_POWERSPORTS_RV', 'BOATS'],
    requiredVehicleFields: [
      'vin', 'stockNumber', 'year', 'make', 'model', 'priceCents', 'condition', 'exteriorColor', 'media[0].url'
    ],
    requiredMediaRules: { minImages: 1 },
    testFixtures: { validatesOwnedChannel: true, supportsLeadCapture: true, requiresDealerAccount: false }
  },
  // ── First-party owned marketplace ───────────────────────────────────────
  {
    slug: 'consumer-marketplace',
    name: 'Consumer Marketplace (First-Party Channel)',
    kind: 'MARKETPLACE',
    integrationClass: 'OWNED',
    schemaVersion: 'v4.3.0-owned-marketplace',
    lastVerifiedAt: '2026-06-06T00:00:00.000Z',
    profileConfidence: 'HIGH',
    needsReview: false,
    sourceNote: 'First-party owned marketplace index (apps/marketplace). Eligibility is enforced at query time: soldAt null, removedAt null, priceCents > 0. No VIN or operator-internal fields are ever included in the listing artifact or public API. Dispatch refreshes the public-safe listing index; no external partner approval required. SyncEvents record marketplace inventory updates in the operator history.',
    mockEndpoint: 'mock://platform/consumer-marketplace',
    integrationUrls: {
      partnerPortalUrl: '/api/marketplace/dealers',
      developerDocsUrl: '/openapi/openapi-marketplace.yaml',
      apiBaseUrl: '/api/marketplace/',
      notes: 'First-party channel — no partner agreements, no external account setup. Public browse at /marketplace/. Inventory is live from the DB query layer; the listing artifact is a public-safe snapshot for audit and sync history.'
    },
    outputFormat: 'MARKETPLACE_LISTING_JSON',
    submissionMethods: ['MOCK_API'],
    sourceUrls: [],
    requiredDealershipFields: [
      'legalName', 'rooftopAddress.city', 'rooftopAddress.state', 'primaryContact.email'
    ],
    // VIN is intentionally excluded — marketplace APIs never expose VIN.
    // Eligibility check (priceCents > 0) is enforced at query time, not in the feed artifact.
    supportedCategories: ['AUTOMOTIVE', 'TRAILERS_POWERSPORTS_RV', 'BOATS'],
    requiredVehicleFields: [
      'stockNumber', 'year', 'make', 'model', 'priceCents', 'condition', 'media[0].url'
    ],
    requiredMediaRules: { minImages: 1, notes: 'At least one image required for marketplace listing visibility.' },
    testFixtures: {
      validatesOwnedMarketplace: true,
      supportsLeadCapture: true,
      requiresDealerAccount: false,
      vinNeverIncluded: true
    }
  },
  // ── Feedable — self-serve API/feed submission ─────────────────────────────
  {
    slug: 'google-vehicle-ads',
    integrationClass: 'FEEDABLE',
    name: 'Google Vehicle Ads',
    kind: 'AD_NETWORK',
    schemaVersion: 'docs-2026.06-google-vehicle-listings',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'HIGH',
    needsReview: false,
    sourceNote: 'Based on Google vehicle listings feed docs and Merchant Center vehicle ads support. Google notes organic vehicle listings feed processing is being stopped; paid Vehicle Ads/Merchant Center should be treated as the live path.',
    mockEndpoint: 'mock://platform/google-vehicle-ads',
    integrationUrls: {
      partnerPortalUrl: 'https://merchants.google.com/',
      developerDocsUrl: 'https://developers.google.com/vehicle-listings/reference/feed-specification',
      feedSpecUrl: 'https://developers.google.com/vehicle-listings/reference/feed-specification',
      feedSetupUrl: 'https://support.google.com/merchants/answer/11189169',
      apiBaseUrl: 'https://shoppingcontent.googleapis.com/content/v2.1/',
      supportUrl: 'https://support.google.com/merchants/',
      notes: 'Host a vehicle inventory feed or use Merchant Center/Content API where supported by the dealer account; live approval remains external to this POC.'
    },
    outputFormat: 'GOOGLE_VEHICLE_FEED_JSON_OR_XML',
    submissionMethods: ['FEED_URL', 'SFTP', 'OAUTH'],
    sourceUrls: [
      'https://developers.google.com/vehicle-listings/reference/feed-specification',
      'https://support.google.com/merchants/answer/11189169'
    ],
    requiredDealershipFields: [
      'legalName', 'rooftopAddress.street', 'rooftopAddress.city', 'rooftopAddress.state',
      'rooftopAddress.postalCode', 'primaryContact.email', 'primaryContact.phone', 'websiteUrl'
    ],
    supportedCategories: ['AUTOMOTIVE'],
    requiredVehicleFields: [
      'vin', 'stockNumber', 'year', 'make', 'model', 'mileage', 'priceCents', 'condition',
      'exteriorColor', 'media[0].url'
    ],
    requiredMediaRules: {
      minImages: 1,
      preferredAspectRatio: '4:3',
      notes: 'POC only: validates presence and dimensions metadata when available.'
    },
    testFixtures: { validatesFeed: true, supportsReferralCredit: false, requiresDealerAccount: true }
  },
  {
    slug: 'meta-automotive-ads',
    integrationClass: 'FEEDABLE',
    name: 'Meta Automotive Inventory Ads',
    kind: 'SOCIAL_CATALOG',
    schemaVersion: 'docs-2026.06-meta-catalog-auto',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'HIGH',
    needsReview: false,
    sourceNote: 'Based on Meta Catalog reference, feed formats, Feed API, and Automotive Inventory Ads supported field references for Vehicle and Dealership catalog objects.',
    mockEndpoint: 'mock://platform/meta-automotive-ads',
    integrationUrls: {
      partnerPortalUrl: 'https://business.facebook.com/commerce/',
      developerDocsUrl: 'https://developers.facebook.com/docs/marketing-api/catalog/reference',
      feedSpecUrl: 'https://developers.facebook.com/docs/marketing-api/catalog/reference',
      feedSetupUrl: 'https://www.facebook.com/business/help/125074381480892',
      apiBaseUrl: 'https://graph.facebook.com/',
      supportUrl: 'https://www.facebook.com/business/help/',
      notes: 'Use Commerce Manager scheduled feeds or Marketing API catalog/feed endpoints after Business Manager, catalog, ad account, and permissions are approved.'
    },
    outputFormat: 'META_VEHICLE_CATALOG_CSV',
    submissionMethods: ['OAUTH', 'FEED_URL'],
    sourceUrls: [
      'https://developers.facebook.com/docs/marketing-api/catalog/reference',
      'https://www.facebook.com/business/help/1930396467200635'
    ],
    requiredDealershipFields: ['legalName', 'websiteUrl', 'primaryContact.email'],
    supportedCategories: ['AUTOMOTIVE'],
    requiredVehicleFields: [
      'vin', 'stockNumber', 'year', 'make', 'model', 'mileage', 'priceCents', 'condition',
      'exteriorColor', 'media[0].url'
    ],
    requiredMediaRules: { minImages: 1, notes: 'POC validates catalog-ready image URL exists.' },
    testFixtures: { validatesFeed: true, supportsReferralCredit: false, requiresDealerAccount: true }
  },
  {
    slug: 'tiktok-automotive-ads',
    integrationClass: 'FEEDABLE',
    name: 'TikTok Automotive Ads Inventory Catalog',
    kind: 'SOCIAL_CATALOG',
    schemaVersion: 'docs-2026.06-tiktok-auto-catalog-v1.3',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'HIGH',
    needsReview: false,
    sourceNote: 'Based on TikTok Automotive Ads inventory catalog fields and TikTok Business API Catalog Management/Product APIs v1.3.',
    mockEndpoint: 'mock://platform/tiktok-automotive-ads',
    integrationUrls: {
      partnerPortalUrl: 'https://ads.tiktok.com/',
      developerDocsUrl: 'https://business-api.tiktok.com/portal/docs/catalog-products/v1.3',
      feedSpecUrl: 'https://ads.tiktok.com/help/article/available-fields-for-automotive-ads-inventory-catalogs',
      feedSetupUrl: 'https://ads.us.tiktok.com/help/article/catalogs?lang=en',
      apiBaseUrl: 'https://business-api.tiktok.com/open_api/v1.3/',
      supportUrl: 'https://ads.tiktok.com/help/',
      notes: 'Automotive inventory can be managed through Ads Manager catalogs, catalog feeds, or TikTok Business API catalog/product endpoints when app and advertiser permissions are approved.'
    },
    outputFormat: 'TIKTOK_AUTOMOTIVE_CATALOG_CSV',
    submissionMethods: ['FEED_URL', 'MOCK_FORM'],
    sourceUrls: [
      'https://ads.tiktok.com/help/article/available-fields-for-automotive-ads-inventory-catalogs',
      'https://business-api.tiktok.com/portal/docs/catalog-products/v1.3',
      'https://ads.us.tiktok.com/help/article/catalogs?lang=en'
    ],
    requiredDealershipFields: ['legalName', 'websiteUrl', 'primaryContact.email'],
    supportedCategories: ['AUTOMOTIVE'],
    requiredVehicleFields: [
      'vin', 'stockNumber', 'year', 'make', 'model', 'mileage', 'priceCents', 'condition',
      'exteriorColor', 'media[0].url'
    ],
    requiredMediaRules: { minImages: 1, minWidth: 450, minHeight: 450, preferredWidth: 800, preferredHeight: 600 },
    testFixtures: { validatesFeed: true, supportsReferralCredit: false, requiresDealerAccount: true }
  },
  {
    slug: 'microsoft-automotive-ads',
    integrationClass: 'FEEDABLE',
    name: 'Microsoft Advertising Automotive Ads',
    kind: 'AD_NETWORK',
    schemaVersion: 'docs-2026.06-microsoft-auto-inventory-feeds',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'HIGH',
    needsReview: false,
    sourceNote: 'Based on Microsoft Advertising Automotive Ads auto inventory feed documentation. Feed and feed items are managed through the Microsoft Advertising Bulk service.',
    mockEndpoint: 'mock://platform/microsoft-automotive-ads',
    integrationUrls: {
      partnerPortalUrl: 'https://ads.microsoft.com/',
      developerDocsUrl: 'https://learn.microsoft.com/en-us/advertising/guides/auto-inventory-feeds?view=bingads-13',
      feedSpecUrl: 'https://learn.microsoft.com/en-us/advertising/guides/auto-inventory-feeds?view=bingads-13',
      apiBaseUrl: 'https://bulk.api.bingads.microsoft.com/',
      supportUrl: 'https://learn.microsoft.com/en-us/advertising/',
      notes: 'Use Microsoft Advertising Bulk API records for auto inventory feeds and feed items; campaign and audience management can use Bulk or Campaign Management services.'
    },
    outputFormat: 'MICROSOFT_AUTO_INVENTORY_BULK_FEED',
    submissionMethods: ['MOCK_API', 'FEED_URL', 'OAUTH'],
    sourceUrls: [
      'https://learn.microsoft.com/en-us/advertising/guides/auto-inventory-feeds?view=bingads-13',
      'https://learn.microsoft.com/en-us/advertising/bulk-service/bulk-service?view=bingads-13'
    ],
    requiredDealershipFields: ['legalName', 'websiteUrl', 'primaryContact.email'],
    supportedCategories: ['AUTOMOTIVE'],
    requiredVehicleFields: [
      'vin', 'stockNumber', 'year', 'make', 'model', 'trim', 'mileage', 'priceCents', 'condition',
      'exteriorColor', 'media[0].url'
    ],
    requiredMediaRules: { minImages: 1, notes: 'Automotive Ads showcase vehicle photos, prices, and landing URLs through feed attributes.' },
    testFixtures: { validatesFeed: true, supportsReferralCredit: false, requiresDealerAccount: true, publicApi: true }
  },
  {
    slug: 'pinterest-shopping-ads',
    integrationClass: 'FEEDABLE',
    name: 'Pinterest Shopping Ads Catalogs',
    kind: 'SOCIAL_CATALOG',
    schemaVersion: 'docs-2026.06-pinterest-catalogs-api',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'Pinterest has public catalog, product group, shopping ads, and catalog diagnostics APIs. It is a generic shopping catalog rather than an automotive-specific vehicle catalog, so keep strict mode review until product taxonomy and policy mapping are confirmed.',
    mockEndpoint: 'mock://platform/pinterest-shopping-ads',
    integrationUrls: {
      partnerPortalUrl: 'https://ads.pinterest.com/',
      developerDocsUrl: 'https://developers.pinterest.com/docs/api-features/shopping-overview/',
      feedSpecUrl: 'https://developers.pinterest.com/docs/api-features/shopping-overview/',
      apiBaseUrl: 'https://api.pinterest.com/v5/',
      supportUrl: 'https://help.pinterest.com/en/business',
      notes: 'Use Pinterest catalog feeds or near-real-time bulk updates, then create product groups and shopping ads through the Pinterest API after business account, domain claim, and OAuth scopes are approved.'
    },
    outputFormat: 'PINTEREST_PRODUCT_CATALOG_FEED',
    submissionMethods: ['MOCK_API', 'FEED_URL', 'OAUTH'],
    sourceUrls: [
      'https://developers.pinterest.com/docs/api-features/shopping-overview/',
      'https://developers.pinterest.com/docs/work-with-catalogs/manage-product-groups/',
      'https://help.pinterest.com/en/business/article/shopping-ads'
    ],
    requiredDealershipFields: ['legalName', 'websiteUrl', 'primaryContact.email'],
    supportedCategories: ['AUTOMOTIVE'],
    requiredVehicleFields: [
      'vin', 'stockNumber', 'year', 'make', 'model', 'mileage', 'priceCents', 'condition',
      'exteriorColor', 'media[0].url'
    ],
    requiredMediaRules: { minImages: 1, notes: 'Pinterest shopping catalogs need product identity, title, image, price, availability, and landing URL; automotive mapping should be policy-reviewed.' },
    testFixtures: { validatesFeed: true, supportsReferralCredit: false, requiresDealerAccount: true, publicApi: true, genericCatalog: true }
  },
  {
    slug: 'reddit-dynamic-product-ads',
    integrationClass: 'FEEDABLE',
    name: 'Reddit Dynamic Product Ads',
    kind: 'SOCIAL_CATALOG',
    schemaVersion: 'docs-2026.06-reddit-ads-product-catalog-api',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'Reddit Ads API v3 exposes product catalog, product feed, product set, batch product, campaign, creative, and reporting endpoints. Automotive inventory can be modeled as product catalog items, but category/policy mapping should be reviewed.',
    mockEndpoint: 'mock://platform/reddit-dynamic-product-ads',
    integrationUrls: {
      partnerPortalUrl: 'https://ads.reddit.com/',
      developerDocsUrl: 'https://ads-api.reddit.com/docs/v3/',
      feedSpecUrl: 'https://ads-api.reddit.com/docs/v3/',
      apiBaseUrl: 'https://ads-api.reddit.com/api/v3/',
      supportUrl: 'https://business.reddithelp.com/',
      notes: 'Use Reddit Ads API product catalog/feed endpoints plus Pixel or Conversions API for Dynamic Product Ads. Product IDs should match website/CAPI events for catalog relevance.'
    },
    outputFormat: 'REDDIT_PRODUCT_CATALOG_FEED',
    submissionMethods: ['MOCK_API', 'FEED_URL', 'OAUTH'],
    sourceUrls: [
      'https://ads-api.reddit.com/docs/v3/',
      'https://www.business.reddit.com/advertise/ad-types/dynamic-product-ads',
      'https://business.reddithelp.com/articles/Knowledge/dynamic-product-ads'
    ],
    requiredDealershipFields: ['legalName', 'websiteUrl', 'primaryContact.email'],
    supportedCategories: ['AUTOMOTIVE'],
    requiredVehicleFields: [
      'vin', 'stockNumber', 'year', 'make', 'model', 'mileage', 'priceCents', 'condition',
      'exteriorColor', 'media[0].url'
    ],
    requiredMediaRules: { minImages: 1, notes: 'Reddit Dynamic Product Ads require a clean catalog and matching Pixel/CAPI product identifiers.' },
    testFixtures: { validatesFeed: true, supportsReferralCredit: false, requiresDealerAccount: true, publicApi: true, genericCatalog: true }
  },
  {
    // ── Assisted — email/manual handoff required ──────────────────────────────
    slug: 'cargurus-dealer',
    integrationClass: 'ASSISTED',
    name: 'CarGurus Dealer Marketplace',
    kind: 'MARKETPLACE',
    schemaVersion: 'docs-2026.06-cargurus-partner-feed',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'CarGurus publishes developer APIs for dealer stats and related tools; public docs do not expose a self-serve dealer listing CRUD API. Treat inventory listing setup as partner/feed-assisted unless CarGurus grants private access.',
    mockEndpoint: 'mock://platform/cargurus-dealer',
    integrationUrls: {
      partnerPortalUrl: 'https://www.cargurus.com/Cars/enterprisedealer/',
      developerDocsUrl: 'https://www.cargurus.com/Cars/developers/',
      apiRequestUrl: 'https://www.cargurus.com/Cars/api/3.0/dealerStatsRequest.action',
      supportUrl: 'https://cargurus.helpscoutdocs.com/',
      notes: 'Public CarGurus docs include Dealer Stats API access, but inventory publishing should be handled as a partner feed/onboarding workflow until private listing API access is confirmed.'
    },
    outputFormat: 'ASSISTED_DEALER_APPLICATION_PACKET_PLUS_FEED_SAMPLE',
    submissionMethods: ['MOCK_EMAIL', 'MANUAL_REP', 'SFTP'],
    sourceUrls: [
      'https://www.cargurus.com/Cars/developers/',
      'https://www.cargurus.com/Cars/developers/docs/DealerStatsV3Daily.html',
      'https://cargurus.helpscoutdocs.com/article/13-i-am-a-dealer-where-i-can-i-advertise-my-inventory-on-cargurus'
    ],
    requiredDealershipFields: [
      'legalName', 'dealerLicense', 'rooftopAddress.street', 'rooftopAddress.city',
      'rooftopAddress.state', 'rooftopAddress.postalCode', 'primaryContact.email', 'primaryContact.phone', 'inventorySize'
    ],
    supportedCategories: ['AUTOMOTIVE'],
    requiredVehicleFields: ['vin', 'stockNumber', 'year', 'make', 'model', 'mileage', 'priceCents', 'condition', 'media[0].url'],
    requiredMediaRules: { minImages: 3, notes: 'Assisted marketplace packet should include feed sample with image URLs.' },
    testFixtures: { validatesFeed: true, supportsReferralCredit: 'partner-dependent', requiresDealerAccount: false }
  },
  {
    // ── Partner-dependent — commercial agreement required ─────────────────────
    slug: 'autotrader-cox',
    integrationClass: 'PARTNER_DEPENDENT',
    name: 'Autotrader / Cox Automotive Dealer Solutions',
    kind: 'MARKETPLACE',
    schemaVersion: 'docs-2026.06-cox-autotrader-feed',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'Autotrader/Cox marketplace listings are partner-assisted. Dealer.com documents third-party inventory feed requests for vAuto, HomeNet, VinSolutions, and AutoTrader rather than a public listing API.',
    mockEndpoint: 'mock://platform/autotrader-cox',
    integrationUrls: {
      partnerPortalUrl: 'https://b2b.autotrader.com/',
      developerDocsUrl: 'https://www.dealer.com/support/inventory/',
      feedSetupUrl: 'https://www.dealer.com/support/inventory/',
      supportUrl: 'https://www.dealer.com/support/inventory/',
      notes: 'Use Cox/Dealer.com or approved inventory-provider feed setup for Autotrader listings; no public self-serve create/update/delete listing API is modeled here.'
    },
    outputFormat: 'ASSISTED_DEALER_APPLICATION_PACKET_PLUS_PROVIDER_AUTH',
    submissionMethods: ['MOCK_EMAIL', 'MANUAL_REP', 'SFTP'],
    sourceUrls: [
      'https://b2b.autotrader.com/dealer-marketing/vehicle-listings/features/',
      'https://www.dealer.com/support/inventory/',
      'https://www.coxautoinc.com/brands/autotrader'
    ],
    requiredDealershipFields: [
      'legalName', 'dealerLicense', 'rooftopAddress.street', 'rooftopAddress.city',
      'rooftopAddress.state', 'rooftopAddress.postalCode', 'primaryContact.email', 'primaryContact.phone', 'inventorySize'
    ],
    supportedCategories: ['AUTOMOTIVE'],
    requiredVehicleFields: ['vin', 'stockNumber', 'year', 'make', 'model', 'mileage', 'priceCents', 'condition', 'media[0].url'],
    requiredMediaRules: { minImages: 3 },
    testFixtures: { validatesFeed: true, supportsReferralCredit: 'consultant-or-partner-dependent', requiresDealerAccount: false }
  },
  {
    // ── Feedable (continued) ──────────────────────────────────────────────────
    slug: 'ebay-motors',
    integrationClass: 'FEEDABLE',
    name: 'eBay Motors',
    kind: 'MARKETPLACE',
    schemaVersion: 'docs-2026.06-ebay-motors-sell-apis',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'HIGH',
    needsReview: false,
    sourceNote: 'Based on eBay Motors listing guidance plus eBay Sell Inventory, Sell Feed, Trading, and Metadata API documentation. Vehicle listings require Motors-specific marketplace/category handling.',
    mockEndpoint: 'mock://platform/ebay-motors',
    integrationUrls: {
      partnerPortalUrl: 'https://www.ebay.com/sh/ovw',
      developerDocsUrl: 'https://developer.ebay.com/api-docs/sell/inventory/overview.html',
      feedSpecUrl: 'https://developer.ebay.com/api-docs/sell/feed/overview.html',
      apiBaseUrl: 'https://api.ebay.com/',
      supportUrl: 'https://developer.ebay.com/support',
      notes: 'Use Sell Inventory API for SKU/location/offer publishing, Sell Feed API for bulk listing workflows, and Motors metadata/listing policies for category-specific vehicle requirements.'
    },
    outputFormat: 'EBAY_MOTORS_LISTING_API_PAYLOAD',
    submissionMethods: ['MOCK_API', 'OAUTH', 'FEED_URL'],
    sourceUrls: [
      'https://developer.ebay.com/api-docs/user-guides/static/trading-user-guide/ebay-motors-create-listing.html',
      'https://developer.ebay.com/api-docs/sell/inventory/overview.html',
      'https://developer.ebay.com/api-docs/sell/feed/overview.html',
      'https://developer.ebay.com/api-docs/sell/metadata/resources/marketplace/methods/getMotorsListingPolicies'
    ],
    requiredDealershipFields: [
      'legalName', 'dealerLicense', 'rooftopAddress.street', 'rooftopAddress.city',
      'rooftopAddress.state', 'rooftopAddress.postalCode', 'primaryContact.email', 'primaryContact.phone'
    ],
    supportedCategories: ['AUTOMOTIVE'],
    requiredVehicleFields: [
      'vin', 'stockNumber', 'year', 'make', 'model', 'trim', 'mileage', 'priceCents', 'condition',
      'exteriorColor', 'bodyStyle', 'media[0].url'
    ],
    requiredMediaRules: { minImages: 1, notes: 'Vehicle listings should include VIN/year/make/model/mileage and enough images/details for buyer confidence.' },
    testFixtures: { validatesListingApi: true, supportsReferralCredit: false, requiresDealerAccount: true, publicApi: true }
  },
  {
    slug: 'x-dynamic-product-ads',
    integrationClass: 'FEEDABLE',
    name: 'X Dynamic Product Ads',
    kind: 'SOCIAL_CATALOG',
    schemaVersion: 'docs-2026.06-x-ads-dpa',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'X documents Dynamic Product Ads through Shopping Manager scheduled feeds plus X Pixel or Conversions API, and exposes campaign/creative management through the X Ads API. Catalog API details are less explicit than Reddit/Pinterest, so keep strict mode review.',
    mockEndpoint: 'mock://platform/x-dynamic-product-ads',
    integrationUrls: {
      partnerPortalUrl: 'https://ads.x.com/',
      developerDocsUrl: 'https://docs.x.com/x-ads-api',
      feedSpecUrl: 'https://business.x.com/en/help/campaign-setup/create-a-dynamic-product-ads-campaign.html',
      apiBaseUrl: 'https://ads-api.x.com/',
      supportUrl: 'https://business.x.com/en/help',
      notes: 'Use Shopping Manager scheduled feeds for product catalogs, X Pixel or Conversions API for events, and X Ads API for campaign/creative management where account access permits.'
    },
    outputFormat: 'X_PRODUCT_CATALOG_FEED',
    submissionMethods: ['MOCK_API', 'FEED_URL', 'OAUTH'],
    sourceUrls: [
      'https://docs.x.com/x-ads-api',
      'https://business.x.com/en/help/campaign-setup/create-a-dynamic-product-ads-campaign.html',
      'https://business.x.com/en/help/campaign-setup/advertiser-card-specifications.html'
    ],
    requiredDealershipFields: ['legalName', 'websiteUrl', 'primaryContact.email'],
    supportedCategories: ['AUTOMOTIVE'],
    requiredVehicleFields: [
      'vin', 'stockNumber', 'year', 'make', 'model', 'mileage', 'priceCents', 'condition',
      'exteriorColor', 'media[0].url'
    ],
    requiredMediaRules: { minImages: 1, notes: 'X DPA needs a product catalog plus website event parameters that match catalog product IDs.' },
    testFixtures: { validatesFeed: true, supportsReferralCredit: false, requiresDealerAccount: true, publicApi: 'ads-api', genericCatalog: true }
  },
  {
    // ── Assisted (continued) ──────────────────────────────────────────────────
    slug: 'cars-com',
    integrationClass: 'ASSISTED',
    name: 'Cars.com / Cars Commerce',
    kind: 'MARKETPLACE',
    schemaVersion: 'docs-2026.06-cars-commerce-feed',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'Cars Commerce documents marketplace listing obligations and dealer inventory/feed workflows, but public dealer inventory publishing API docs are not exposed. Treat as partner-assisted feed onboarding.',
    mockEndpoint: 'mock://platform/cars-com',
    integrationUrls: {
      partnerPortalUrl: 'https://www.carscommerce.inc/marketplace/',
      developerDocsUrl: 'https://www.carscommerce.inc/marketplace/vehicle-listing-policy/',
      feedSetupUrl: 'https://www.carscommerce.inc/marketplace/',
      supportUrl: 'https://www.carscommerce.inc/contact/',
      notes: 'Prepare a compliant inventory feed and dealer packet for Cars Commerce onboarding; live feed acceptance and API credentials are handled through Cars Commerce partner channels.'
    },
    outputFormat: 'ASSISTED_DEALER_APPLICATION_PACKET_PLUS_FEED_SAMPLE',
    submissionMethods: ['MOCK_EMAIL', 'MANUAL_REP', 'SFTP'],
    sourceUrls: [
      'https://www.carscommerce.inc/marketplace/',
      'https://www.carscommerce.inc/marketplace/vehicle-listing-policy/',
      'https://www.carscommerce.inc/marketplace/merchandising/'
    ],
    requiredDealershipFields: [
      'legalName', 'dealerLicense', 'rooftopAddress.street', 'rooftopAddress.city',
      'rooftopAddress.state', 'rooftopAddress.postalCode', 'primaryContact.email', 'primaryContact.phone', 'inventorySize'
    ],
    supportedCategories: ['AUTOMOTIVE'],
    requiredVehicleFields: ['vin', 'stockNumber', 'year', 'make', 'model', 'mileage', 'priceCents', 'condition', 'media[0].url'],
    requiredMediaRules: { minImages: 3 },
    testFixtures: { validatesFeed: true, supportsReferralCredit: 'partner-dependent', requiresDealerAccount: false }
  },
  {
    // ── Feedable (continued) ──────────────────────────────────────────────────
    slug: 'snapchat-dynamic-product-ads',
    integrationClass: 'FEEDABLE',
    name: 'Snapchat Dynamic Product Ads',
    kind: 'SOCIAL_CATALOG',
    schemaVersion: 'docs-2026.06-snap-dpa-catalog-api',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'Based on Snap Marketing API Dynamic Product Ads catalog/feed documentation. Snap catalogs are generic commerce catalogs rather than automotive-specific vehicle catalog docs, so keep strict mode review until field mapping is confirmed.',
    mockEndpoint: 'mock://platform/snapchat-dynamic-product-ads',
    integrationUrls: {
      partnerPortalUrl: 'https://ads.snapchat.com/',
      developerDocsUrl: 'https://developers.snap.com/api/marketing-api/Ads-API/dynamic-product-ads',
      feedSpecUrl: 'https://developers.snap.com/api/marketing-api/Ads-API/dynamic-product-ads',
      apiBaseUrl: 'https://adsapi.snapchat.com/v1/',
      supportUrl: 'https://businesshelp.snapchat.com/',
      notes: 'Create a product catalog and product feed through the Snap Marketing API, providing a scheduled URL for CSV/XML product data. Automotive mapping should be validated against Snap product attribute rules.'
    },
    outputFormat: 'SNAPCHAT_PRODUCT_CATALOG_FEED',
    submissionMethods: ['MOCK_API', 'FEED_URL', 'OAUTH'],
    sourceUrls: [
      'https://developers.snap.com/api/marketing-api/Ads-API/introduction',
      'https://developers.snap.com/api/marketing-api/Ads-API/dynamic-product-ads'
    ],
    requiredDealershipFields: ['legalName', 'websiteUrl', 'primaryContact.email'],
    supportedCategories: ['AUTOMOTIVE'],
    requiredVehicleFields: [
      'vin', 'stockNumber', 'year', 'make', 'model', 'mileage', 'priceCents', 'condition',
      'exteriorColor', 'media[0].url'
    ],
    requiredMediaRules: { minImages: 1, notes: 'Snap product catalogs require product identity, image, price, and landing URL attributes; vehicle-specific enrichment remains our mapping responsibility.' },
    testFixtures: { validatesFeed: true, supportsReferralCredit: false, requiresDealerAccount: true, publicApi: true, genericCatalog: true }
  },
  {
    // ── Assisted (continued) ──────────────────────────────────────────────────
    slug: 'linkedin-lead-gen-forms',
    integrationClass: 'ASSISTED',
    name: 'LinkedIn Lead Gen Forms',
    kind: 'AD_NETWORK',
    schemaVersion: 'docs-2026.06-linkedin-lead-sync',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'LinkedIn Lead Gen Forms are useful for B2B fleet, commercial, finance, service, recruiting, and dealership partnership campaigns. Lead Sync API access is private/reviewed, so treat as review-needed for production API work.',
    mockEndpoint: 'mock://platform/linkedin-lead-gen-forms',
    integrationUrls: {
      partnerPortalUrl: 'https://www.linkedin.com/campaignmanager/',
      developerDocsUrl: 'https://learn.microsoft.com/en-us/linkedin/marketing/lead-sync/leadsync',
      apiBaseUrl: 'https://api.linkedin.com/rest/',
      supportUrl: 'https://www.linkedin.com/help/lms',
      notes: 'Use Lead Gen Forms in Campaign Manager and Lead Sync API to retrieve forms/responses after LinkedIn Marketing API and lead sync permissions are approved.'
    },
    outputFormat: 'LINKEDIN_LEAD_GEN_FORM_PACKET',
    submissionMethods: ['MOCK_API', 'OAUTH'],
    sourceUrls: [
      'https://learn.microsoft.com/en-us/linkedin/marketing/lead-sync/leadsync',
      'https://business.linkedin.com/marketing-solutions/success/ads-guide/lead-gen-forms',
      'https://business.linkedin.com/content/dam/me/business/en-us/marketing-solutions/cx/2022/pdf/linkedin-lead-sync-api-access-guide.pdf'
    ],
    requiredDealershipFields: ['legalName', 'websiteUrl', 'primaryContact.email', 'primaryContact.phone'],
    supportedCategories: ['AUTOMOTIVE'],
    requiredVehicleFields: ['vin', 'stockNumber', 'year', 'make', 'model', 'priceCents'],
    requiredMediaRules: { minImages: 0, notes: 'Lead Gen Forms do not require inventory images, but vehicle context can be used in hidden fields or creative payloads.' },
    testFixtures: { validatesLeadShape: true, supportsReferralCredit: false, requiresDealerAccount: true, privateApiApproval: true }
  },
  {
    // ── Partner-dependent (continued) ────────────────────────────────────────
    slug: 'truecar-dealer-network',
    integrationClass: 'PARTNER_DEPENDENT',
    name: 'TrueCar Dealer Network',
    kind: 'MARKETPLACE',
    schemaVersion: 'docs-2026.06-truecar-dealer-feed',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'TrueCar dealer FAQ points used-vehicle pricing and inventory errors to dealership inventory feeds and Dealer Support. Treat listing setup as dealer portal/support-assisted unless private API access is granted.',
    mockEndpoint: 'mock://platform/truecar-dealer-network',
    integrationUrls: {
      partnerPortalUrl: 'https://dealerportal.truecar.com/',
      developerDocsUrl: 'https://dealerportal.truecar.com/dealer/faqs',
      feedSetupUrl: 'https://dealerportal.truecar.com/dealer/faqs',
      supportUrl: 'https://dealerportal.truecar.com/dealer/faqs',
      notes: 'TrueCar inventory provider changes require provider/file/inventory-type details through Dealer Support; no public inventory publishing API is modeled here.'
    },
    outputFormat: 'DEALER_NETWORK_APPLICATION_PACKET',
    submissionMethods: ['MOCK_EMAIL', 'MOCK_FORM', 'MANUAL_REP'],
    sourceUrls: [
      'https://dealerportal.truecar.com/dealer/faqs',
      'https://dealerportal.truecar.com/dealer/solutions',
      'https://www.truecar.com/legal/aisrequirements0D.html'
    ],
    requiredDealershipFields: [
      'legalName', 'dealerLicense', 'rooftopAddress.street', 'rooftopAddress.city',
      'rooftopAddress.state', 'rooftopAddress.postalCode', 'primaryContact.email', 'primaryContact.phone', 'inventorySize'
    ],
    supportedCategories: ['AUTOMOTIVE'],
    requiredVehicleFields: ['vin', 'stockNumber', 'year', 'make', 'model', 'mileage', 'priceCents', 'condition', 'media[0].url'],
    requiredMediaRules: { minImages: 3 },
    testFixtures: { validatesFeed: true, supportsReferralCredit: 'partner-dependent', requiresDealerAccount: false }
  },
  {
    // ── Feedable (continued) ──────────────────────────────────────────────────
    slug: 'adf-xml-lead-routing',
    integrationClass: 'FEEDABLE',
    name: 'ADF/XML Lead Routing',
    kind: 'LEAD_ROUTER',
    schemaVersion: 'docs-2026.06-adf-xml',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'HIGH',
    needsReview: false,
    sourceNote: 'Based on ADF/XML lead format specification. ADF is a payload format commonly routed over email/CRM endpoints rather than a single centralized platform API.',
    mockEndpoint: 'mock://platform/adf-xml-lead-routing',
    integrationUrls: {
      developerDocsUrl: 'https://adfxml.info/adf_spec.pdf',
      feedSpecUrl: 'https://adfxml.info/adf_spec.pdf',
      notes: 'Generate ADF/XML lead payloads and deliver through the receiving CRM email/API endpoint configured by the dealer or CRM vendor.'
    },
    outputFormat: 'ADF_XML_EMAIL',
    submissionMethods: ['MOCK_EMAIL'],
    sourceUrls: ['https://adfxml.info/adf_spec.pdf'],
    requiredDealershipFields: ['legalName', 'primaryContact.email', 'primaryContact.phone'],
    supportedCategories: ['AUTOMOTIVE'],
    requiredVehicleFields: ['vin', 'stockNumber', 'year', 'make', 'model', 'priceCents'],
    requiredMediaRules: { minImages: 0 },
    testFixtures: { validatesLeadShape: true, supportsReferralCredit: false, requiresDealerAccount: false }
  },
  {
    slug: 'nextdoor-ads',
    integrationClass: 'FEEDABLE',
    name: 'Nextdoor Ads API',
    kind: 'AD_NETWORK',
    schemaVersion: 'docs-2026.06-nextdoor-ads-api',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'Nextdoor Ads API supports local campaign creation, ad groups, ads, and reporting, with some operations still handled in Nextdoor Ads Manager. Strong fit for dealer service-area, trade-in, event, and local inventory campaigns.',
    mockEndpoint: 'mock://platform/nextdoor-ads',
    integrationUrls: {
      partnerPortalUrl: 'https://ads.nextdoor.com/v2',
      developerDocsUrl: 'https://developer.nextdoor.com/reference/advertising-introduction',
      apiBaseUrl: 'https://api.nextdoor.com/',
      supportUrl: 'https://business.nextdoor.com/',
      notes: 'Use the Ads API for campaign/adgroup/ad/reporting operations after Ads Manager signup. Payment options, some audience operations, and media archiving remain UI-controlled.'
    },
    outputFormat: 'NEXTDOOR_LOCAL_AD_PACKET',
    submissionMethods: ['MOCK_API', 'OAUTH'],
    sourceUrls: [
      'https://developer.nextdoor.com/reference/advertising-introduction',
      'https://about.nextdoor.com/press-releases/nextdoor-launches-ads-api-program-offering-advertisers-an-easier-way-to-extend-their-campaigns-to-nextdoor',
      'https://business.nextdoor.com/en-us/enterprise/creative-specs'
    ],
    requiredDealershipFields: [
      'legalName', 'rooftopAddress.street', 'rooftopAddress.city', 'rooftopAddress.state',
      'rooftopAddress.postalCode', 'websiteUrl', 'primaryContact.email'
    ],
    supportedCategories: ['AUTOMOTIVE'],
    requiredVehicleFields: ['vin', 'stockNumber', 'year', 'make', 'model', 'priceCents', 'media[0].url'],
    requiredMediaRules: { minImages: 1, notes: 'Nextdoor local ads need localized copy and creative; use vehicle images for inventory/trade-in campaigns.' },
    testFixtures: { validatesLocalAdPacket: true, supportsReferralCredit: false, requiresDealerAccount: true, publicApi: 'program-access' }
  },
  {
    // ── Assisted (continued) ──────────────────────────────────────────────────
    slug: 'apple-business-connect',
    integrationClass: 'ASSISTED',
    name: 'Apple Business Location Publishing',
    kind: 'DEALER_STOREFRONT',
    schemaVersion: 'docs-2026.06-apple-business-brand-location-api',
    lastVerifiedAt: '2026-06-03T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'Apple Business supports Business Connect/Brand and Location API access for submitting brand and location data to Apple Maps at scale. This is not an inventory ad channel, but it is valuable for dealer location discovery and Maps readiness.',
    mockEndpoint: 'mock://platform/apple-business-connect',
    integrationUrls: {
      partnerPortalUrl: 'https://businessconnect.apple.com/',
      developerDocsUrl: 'https://support.apple.com/guide/business/abcb4226f877/web',
      apiBaseUrl: 'https://businessconnect.apple.com/api',
      supportUrl: 'https://support.apple.com/business',
      notes: 'Use Apple Business portal/API access for verified brand and rooftop location data. API access may require brand/location authorization and is often handled through listing-management partners.'
    },
    outputFormat: 'APPLE_BUSINESS_LOCATION_PACKET',
    submissionMethods: ['MOCK_API', 'MANUAL_REP', 'OAUTH'],
    sourceUrls: [
      'https://support.apple.com/guide/business/abcb4226f877/web',
      'https://www.apple.com/newsroom/2023/01/introducing-apple-business-connect/',
      'https://businessconnect.apple.com/'
    ],
    requiredDealershipFields: [
      'legalName', 'rooftopAddress.street', 'rooftopAddress.city', 'rooftopAddress.state',
      'rooftopAddress.postalCode', 'primaryContact.email', 'primaryContact.phone', 'websiteUrl'
    ],
    supportedCategories: ['AUTOMOTIVE'],
    requiredVehicleFields: [],
    requiredMediaRules: { minImages: 0, notes: 'Location publishing validates rooftop/business identity rather than vehicle inventory payloads.' },
    testFixtures: { validatesLocationProfile: true, supportsReferralCredit: false, requiresDealerAccount: true, localDiscovery: true }
  },
  // ── Trailers / powersports / RV channel stubs (Phase 3A pilot) ───────────
  {
    slug: 'rv-trader',
    integrationClass: 'ASSISTED',
    name: 'RV Trader',
    kind: 'MARKETPLACE',
    schemaVersion: 'stub-2026.06-trailers-rv-trader',
    lastVerifiedAt: '2026-06-06T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'Stub profile for RV Trader syndication. Field requirements approximate public listing specs; partner onboarding required before live dispatch.',
    mockEndpoint: 'mock://platform/rv-trader',
    integrationUrls: {
      partnerPortalUrl: 'https://www.rvtrader.com/',
      developerDocsUrl: 'https://www.rvtrader.com/',
      notes: 'Assisted channel — dealer rep completes listing setup after inventory packet validation.',
    },
    outputFormat: 'RV_TRADER_LISTING_PACKET',
    submissionMethods: ['MANUAL_REP', 'MOCK_API'],
    sourceUrls: [],
    requiredDealershipFields: ['legalName', 'rooftopAddress.city', 'rooftopAddress.state', 'primaryContact.email', 'primaryContact.phone'],
    supportedCategories: ['TRAILERS_POWERSPORTS_RV'],
    requiredVehicleFields: ['vin', 'stockNumber', 'year', 'make', 'model', 'priceCents', 'condition', 'media[0].url'],
    requiredMediaRules: { minImages: 1 },
    testFixtures: { validatesTrailersChannelStub: true, requiresDealerAccount: true },
  },
  {
    slug: 'cycle-trader',
    integrationClass: 'ASSISTED',
    name: 'Cycle Trader',
    kind: 'MARKETPLACE',
    schemaVersion: 'stub-2026.06-trailers-cycle-trader',
    lastVerifiedAt: '2026-06-06T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'Stub profile for Cycle Trader motorcycle and powersports listings.',
    mockEndpoint: 'mock://platform/cycle-trader',
    integrationUrls: {
      partnerPortalUrl: 'https://www.cycletrader.com/',
      developerDocsUrl: 'https://www.cycletrader.com/',
      notes: 'Assisted channel — manual listing activation after packet validation.',
    },
    outputFormat: 'CYCLE_TRADER_LISTING_PACKET',
    submissionMethods: ['MANUAL_REP', 'MOCK_API'],
    sourceUrls: [],
    requiredDealershipFields: ['legalName', 'rooftopAddress.city', 'rooftopAddress.state', 'primaryContact.email'],
    supportedCategories: ['TRAILERS_POWERSPORTS_RV'],
    requiredVehicleFields: ['vin', 'stockNumber', 'year', 'make', 'model', 'mileage', 'priceCents', 'condition', 'media[0].url'],
    requiredMediaRules: { minImages: 1 },
    testFixtures: { validatesTrailersChannelStub: true, requiresDealerAccount: true },
  },
  {
    slug: 'atv-trader',
    integrationClass: 'ASSISTED',
    name: 'ATV Trader',
    kind: 'MARKETPLACE',
    schemaVersion: 'stub-2026.06-trailers-atv-trader',
    lastVerifiedAt: '2026-06-06T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'Stub profile for ATV and side-by-side listings on ATV Trader.',
    mockEndpoint: 'mock://platform/atv-trader',
    integrationUrls: {
      partnerPortalUrl: 'https://www.atvtrader.com/',
      developerDocsUrl: 'https://www.atvtrader.com/',
      notes: 'Assisted channel — hours-based usage fields validated before handoff.',
    },
    outputFormat: 'ATV_TRADER_LISTING_PACKET',
    submissionMethods: ['MANUAL_REP', 'MOCK_API'],
    sourceUrls: [],
    requiredDealershipFields: ['legalName', 'rooftopAddress.city', 'rooftopAddress.state', 'primaryContact.email'],
    supportedCategories: ['TRAILERS_POWERSPORTS_RV'],
    requiredVehicleFields: ['vin', 'stockNumber', 'year', 'make', 'model', 'mileage', 'priceCents', 'condition', 'media[0].url'],
    requiredMediaRules: { minImages: 1 },
    testFixtures: { validatesTrailersChannelStub: true, requiresDealerAccount: true },
  },
  {
    slug: 'trailer-trader',
    integrationClass: 'ASSISTED',
    name: 'Trailer Trader',
    kind: 'MARKETPLACE',
    schemaVersion: 'stub-2026.06-trailers-trailer-trader',
    lastVerifiedAt: '2026-06-06T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'Stub profile for utility, dump, and equipment trailer listings.',
    mockEndpoint: 'mock://platform/trailer-trader',
    integrationUrls: {
      partnerPortalUrl: 'https://www.trailertrader.com/',
      developerDocsUrl: 'https://www.trailertrader.com/',
      notes: 'Assisted channel — serial # stored in vin column for validation.',
    },
    outputFormat: 'TRAILER_TRADER_LISTING_PACKET',
    submissionMethods: ['MANUAL_REP', 'MOCK_API'],
    sourceUrls: [],
    requiredDealershipFields: ['legalName', 'rooftopAddress.city', 'rooftopAddress.state', 'primaryContact.email'],
    supportedCategories: ['TRAILERS_POWERSPORTS_RV'],
    requiredVehicleFields: ['vin', 'stockNumber', 'year', 'make', 'model', 'priceCents', 'condition', 'media[0].url'],
    requiredMediaRules: { minImages: 1 },
    testFixtures: { validatesTrailersChannelStub: true, requiresDealerAccount: true },
  },
  {
    slug: 'facebook-marketplace-general',
    integrationClass: 'FEEDABLE',
    name: 'Facebook Marketplace (General Listings)',
    kind: 'SOCIAL_CATALOG',
    schemaVersion: 'stub-2026.06-facebook-marketplace-general',
    lastVerifiedAt: '2026-06-06T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'Stub profile for non-automotive Facebook Marketplace catalog feeds (RV, trailer, powersports, and marine inventory).',
    mockEndpoint: 'mock://platform/facebook-marketplace-general',
    integrationUrls: {
      partnerPortalUrl: 'https://www.facebook.com/marketplace/',
      developerDocsUrl: 'https://developers.facebook.com/docs/marketing-api/catalog/reference',
      notes: 'Feedable stub — Commerce Manager setup required; category-specific field mapping TBD.',
    },
    outputFormat: 'META_GENERAL_CATALOG_CSV',
    submissionMethods: ['FEED_URL', 'MOCK_API'],
    sourceUrls: [],
    requiredDealershipFields: ['legalName', 'websiteUrl', 'primaryContact.email'],
    supportedCategories: ['TRAILERS_POWERSPORTS_RV', 'BOATS'],
    requiredVehicleFields: ['stockNumber', 'year', 'make', 'model', 'priceCents', 'condition', 'media[0].url'],
    requiredMediaRules: { minImages: 1 },
    testFixtures: { validatesTrailersChannelStub: true, requiresDealerAccount: true },
  },
  // ── Boats channel stubs (Phase 3B pilot) ───────────────────────────────────
  {
    slug: 'boat-trader',
    integrationClass: 'ASSISTED',
    name: 'Boat Trader',
    kind: 'MARKETPLACE',
    schemaVersion: 'stub-2026.06-boats-boat-trader',
    lastVerifiedAt: '2026-06-07T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'Stub profile for Boat Trader marine listings. HIN stored in vin column for validation.',
    mockEndpoint: 'mock://platform/boat-trader',
    integrationUrls: {
      partnerPortalUrl: 'https://www.boattrader.com/',
      developerDocsUrl: 'https://www.boattrader.com/',
      notes: 'Assisted channel — dealer rep completes listing setup after packet validation.',
    },
    outputFormat: 'BOAT_TRADER_LISTING_PACKET',
    submissionMethods: ['MANUAL_REP', 'MOCK_API'],
    sourceUrls: [],
    requiredDealershipFields: ['legalName', 'rooftopAddress.city', 'rooftopAddress.state', 'primaryContact.email', 'primaryContact.phone'],
    supportedCategories: ['BOATS'],
    requiredVehicleFields: ['vin', 'stockNumber', 'year', 'make', 'model', 'mileage', 'priceCents', 'condition', 'media[0].url'],
    requiredMediaRules: { minImages: 1 },
    testFixtures: { validatesBoatsChannelStub: true, requiresDealerAccount: true },
  },
  {
    slug: 'yachtworld',
    integrationClass: 'ASSISTED',
    name: 'YachtWorld',
    kind: 'MARKETPLACE',
    schemaVersion: 'stub-2026.06-boats-yachtworld',
    lastVerifiedAt: '2026-06-07T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'Stub profile for YachtWorld brokerage and yacht listings.',
    mockEndpoint: 'mock://platform/yachtworld',
    integrationUrls: {
      partnerPortalUrl: 'https://www.yachtworld.com/',
      developerDocsUrl: 'https://www.yachtworld.com/',
      notes: 'Assisted channel — brokerage onboarding required.',
    },
    outputFormat: 'YACHTWORLD_LISTING_PACKET',
    submissionMethods: ['MANUAL_REP', 'MOCK_API'],
    sourceUrls: [],
    requiredDealershipFields: ['legalName', 'rooftopAddress.city', 'rooftopAddress.state', 'primaryContact.email'],
    supportedCategories: ['BOATS'],
    requiredVehicleFields: ['vin', 'stockNumber', 'year', 'make', 'model', 'priceCents', 'condition', 'media[0].url'],
    requiredMediaRules: { minImages: 1 },
    testFixtures: { validatesBoatsChannelStub: true, requiresDealerAccount: true },
  },
  {
    slug: 'boats-com',
    integrationClass: 'ASSISTED',
    name: 'Boats.com',
    kind: 'MARKETPLACE',
    schemaVersion: 'stub-2026.06-boats-com',
    lastVerifiedAt: '2026-06-07T00:00:00.000Z',
    profileConfidence: 'MEDIUM',
    needsReview: false,
    sourceNote: 'Stub profile for Boats.com marine marketplace syndication.',
    mockEndpoint: 'mock://platform/boats-com',
    integrationUrls: {
      partnerPortalUrl: 'https://www.boats.com/',
      developerDocsUrl: 'https://www.boats.com/',
      notes: 'Assisted channel — listing activation after packet validation.',
    },
    outputFormat: 'BOATS_COM_LISTING_PACKET',
    submissionMethods: ['MANUAL_REP', 'MOCK_API'],
    sourceUrls: [],
    requiredDealershipFields: ['legalName', 'rooftopAddress.city', 'rooftopAddress.state', 'primaryContact.email'],
    supportedCategories: ['BOATS'],
    requiredVehicleFields: ['vin', 'stockNumber', 'year', 'make', 'model', 'mileage', 'priceCents', 'condition', 'media[0].url'],
    requiredMediaRules: { minImages: 1 },
    testFixtures: { validatesBoatsChannelStub: true, requiresDealerAccount: true },
  },
];
