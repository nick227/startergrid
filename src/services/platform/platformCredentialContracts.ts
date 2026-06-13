import type { OAuthProvider, PlatformProfileSeed } from '../../lib/types.js';
import { platformProfiles } from '../../data/platformProfiles.js';
import {
  PLATFORM_SETUP_GUIDES,
  type AdminSetupGuide,
  type OperatorSetupGuide,
} from '../../data/platformSetupGuides.js';

export type CredentialValidationStage = 'config' | 'auth' | 'permissions' | 'capability';

export type CredentialContractProvider = OAuthProvider | 'internal' | 'partner-feed' | 'manual' | 'none';

export type PlatformCredentialContract = {
  platformSlug: string;
  provider: CredentialContractProvider;
  authType: 'oauth' | 'api-key' | 'sftp' | 'internal' | 'manual' | 'none';
  requiredFields: string[];
  requiredSecrets: string[];
  requiredScopes: string[];
  requiredPermissions: string[];
  requiredCapabilities: string[];
  capabilityChecks: string[];
  docsUrl: string | null;
  connectionModel: 'shared-system-oauth' | 'shared-system-api-key' | 'dealer-oauth' | 'partner-feed' | 'manual-portal' | 'internal-route' | 'none';
  validationDepth: 'config' | 'auth' | 'permissions' | 'capability' | 'internal';
  checkedFields: string[];
  stages: CredentialValidationStage[];
  notes: string;
  adminSetup: AdminSetupGuide | null;
  operatorSetup: OperatorSetupGuide | null;
};

type ProviderContract = {
  authType: PlatformCredentialContract['authType'];
  requiredFields: string[];
  requiredScopes?: string[];
  requiredPermissions?: string[];
  requiredCapabilities?: string[];
  docsUrl: string;
  connectionModel?: PlatformCredentialContract['connectionModel'];
  validationDepth?: PlatformCredentialContract['validationDepth'];
  notes: string;
};

export const PROVIDER_CREDENTIAL_CONTRACTS: Partial<Record<OAuthProvider, ProviderContract>> = {
  'meta-catalog-ads': {
    authType: 'oauth',
    requiredFields: ['META_APP_ID', 'META_APP_SECRET'],
    requiredScopes: ['catalog_management', 'ads_management', 'business_management'],
    requiredPermissions: ['Meta app approved for catalog and ads access'],
    requiredCapabilities: ['Catalog API', 'Marketing API'],
    docsUrl: 'https://developers.facebook.com/docs/marketing-api/',
    connectionModel: 'shared-system-oauth',
    validationDepth: 'auth',
    notes: 'Used by Meta catalog and marketplace-style feed integrations.',
  },
  'facebook-business-page': {
    authType: 'oauth',
    requiredFields: ['META_APP_ID', 'META_APP_SECRET'],
    requiredScopes: ['pages_manage_posts', 'pages_read_engagement', 'business_management'],
    requiredPermissions: ['Facebook app approved for Page posting'],
    requiredCapabilities: ['Page post publishing'],
    docsUrl: 'https://developers.facebook.com/docs/pages-api/',
    connectionModel: 'shared-system-oauth',
    validationDepth: 'auth',
    notes: 'Shares the Meta app credentials but requires Page publishing permissions.',
  },
  google: {
    authType: 'oauth',
    requiredFields: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    requiredScopes: ['https://www.googleapis.com/auth/content'],
    requiredPermissions: ['Merchant Center or Vehicle Ads account access'],
    requiredCapabilities: ['Vehicle feed or Content API access'],
    docsUrl: 'https://developers.google.com/merchant/api/guides/authorization/access-client-accounts',
    connectionModel: 'shared-system-oauth',
    validationDepth: 'auth',
    notes: 'Validated with the Google token endpoint; dealer account access is checked separately.',
  },
  'google-business-profile': {
    authType: 'oauth',
    requiredFields: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    requiredScopes: ['https://www.googleapis.com/auth/business.manage'],
    requiredPermissions: ['Business Profile account access'],
    requiredCapabilities: ['Business Profile post management'],
    docsUrl: 'https://developers.google.com/my-business/content/basic-setup',
    connectionModel: 'shared-system-oauth',
    validationDepth: 'auth',
    notes: 'Shares Google OAuth app credentials with Google feed integrations.',
  },
  microsoft: {
    authType: 'oauth',
    requiredFields: ['MICROSOFT_CLIENT_ID', 'MICROSOFT_CLIENT_SECRET'],
    requiredScopes: ['https://ads.microsoft.com/msads.manage', 'offline_access'],
    requiredPermissions: ['Microsoft Ads or LinkedIn lead-gen app permissions'],
    requiredCapabilities: ['Ads management', 'Lead form read'],
    docsUrl: 'https://learn.microsoft.com/en-us/advertising/guides/authentication-oauth-consent',
    connectionModel: 'shared-system-oauth',
    validationDepth: 'auth',
    notes: 'One Azure app backs Microsoft Ads and LinkedIn lead-gen integrations.',
  },
  ebay: {
    authType: 'oauth',
    requiredFields: ['EBAY_CLIENT_ID', 'EBAY_CLIENT_SECRET'],
    requiredScopes: [
      'https://api.ebay.com/oauth/api_scope/sell.inventory',
      'https://api.ebay.com/oauth/api_scope/sell.inventory.readonly',
      'https://api.ebay.com/oauth/api_scope',
    ],
    requiredPermissions: ['Sell Inventory API access', 'Seller OAuth consent', 'eBay Motors marketplace/category policy access'],
    requiredCapabilities: ['Inventory item management', 'Offer publish', 'Motors listing policy lookup'],
    docsUrl: 'https://developer.ebay.com/develop/guides-v2/authorization',
    connectionModel: 'dealer-oauth',
    validationDepth: 'auth',
    notes: 'Uses eBay App ID and Cert ID for OAuth client auth; seller publishing also requires a dealer OAuth grant and Sell Inventory scopes.',
  },
  tiktok: {
    authType: 'oauth',
    requiredFields: ['TIKTOK_CLIENT_ID', 'TIKTOK_CLIENT_SECRET'],
    requiredPermissions: ['TikTok Marketing API app approval'],
    requiredCapabilities: ['Automotive ads publishing'],
    docsUrl: 'https://ads.tiktok.com/marketing_api/docs',
    connectionModel: 'shared-system-oauth',
    validationDepth: 'config',
    notes: 'TikTok does not expose a standard app-level probe here; config presence is reported.',
  },
  'tiktok-shop': {
    authType: 'api-key',
    requiredFields: ['TIKTOK_SHOP_APP_KEY', 'TIKTOK_SHOP_APP_SECRET'],
    requiredPermissions: ['TikTok Shop Seller Center app approval'],
    requiredCapabilities: ['Shop product/catalog access'],
    docsUrl: 'https://partner.tiktokshop.com/docv2/',
    connectionModel: 'shared-system-api-key',
    validationDepth: 'config',
    notes: 'TikTok Shop uses Seller Center app keys rather than the ads OAuth app.',
  },
  pinterest: {
    authType: 'oauth',
    requiredFields: ['PINTEREST_CLIENT_ID', 'PINTEREST_CLIENT_SECRET'],
    requiredScopes: ['ads:read', 'ads:write', 'catalogs:read', 'catalogs:write'],
    requiredCapabilities: ['Catalog management', 'Ads management'],
    docsUrl: 'https://developers.pinterest.com/docs/api/v5/',
    connectionModel: 'shared-system-oauth',
    validationDepth: 'auth',
    notes: 'Validated with the Pinterest token endpoint by client-auth inference.',
  },
  reddit: {
    authType: 'oauth',
    requiredFields: ['REDDIT_CLIENT_ID', 'REDDIT_CLIENT_SECRET'],
    requiredScopes: ['identity', 'read', 'adspublisher'],
    requiredCapabilities: ['Dynamic product ads'],
    docsUrl: 'https://ads-api.reddit.com/docs/',
    connectionModel: 'shared-system-oauth',
    validationDepth: 'auth',
    notes: 'Validated with client credentials against Reddit OAuth.',
  },
  snapchat: {
    authType: 'oauth',
    requiredFields: ['SNAPCHAT_CLIENT_ID', 'SNAPCHAT_CLIENT_SECRET'],
    requiredScopes: ['snapchat-marketing-api'],
    requiredCapabilities: ['Dynamic ads catalog access'],
    docsUrl: 'https://developers.snap.com/api/marketing-api/',
    connectionModel: 'shared-system-oauth',
    validationDepth: 'auth',
    notes: 'Validated with the Snapchat token endpoint by client-auth inference.',
  },
  x: {
    authType: 'oauth',
    requiredFields: ['X_CLIENT_ID', 'X_CLIENT_SECRET'],
    requiredScopes: ['tweet.read', 'users.read', 'ads:read', 'ads:write', 'offline.access'],
    requiredCapabilities: ['Ads read/write'],
    docsUrl: 'https://developer.x.com/en/docs/x-ads-api',
    connectionModel: 'shared-system-oauth',
    validationDepth: 'auth',
    notes: 'Validated with X OAuth client authentication.',
  },
  nextdoor: {
    authType: 'oauth',
    requiredFields: ['NEXTDOOR_CLIENT_ID', 'NEXTDOOR_CLIENT_SECRET'],
    requiredScopes: ['AdsRead', 'AdsWrite'],
    requiredCapabilities: ['Ads read/write'],
    docsUrl: 'https://business.nextdoor.com/',
    connectionModel: 'shared-system-oauth',
    validationDepth: 'auth',
    notes: 'Validated with the Nextdoor token endpoint by client-auth inference.',
  },
  apple: {
    authType: 'oauth',
    requiredFields: ['APPLE_CLIENT_ID', 'APPLE_KEY_ID', 'APPLE_TEAM_ID', 'APPLE_PRIVATE_KEY'],
    requiredScopes: ['name', 'email'],
    requiredCapabilities: ['Apple Business Connect auth'],
    docsUrl: 'https://developer.apple.com/documentation/applebusinessconnectapi',
    connectionModel: 'shared-system-oauth',
    validationDepth: 'config',
    notes: 'Apple requires a signed client secret; live probing is not wired until JWT generation ships.',
  },
};

function capabilitiesForProfile(profile: PlatformProfileSeed): string[] {
  const capabilities: string[] = [];
  if (profile.catalogSync) capabilities.push('catalogSync');
  if (profile.socialPosting) capabilities.push('socialPosting');
  if (profile.marketplaceListing) capabilities.push('marketplaceListing');
  if (profile.partnerFeed) capabilities.push('partnerFeed');
  if ((profile as any).testFixtures?.supportsLeadCapture) capabilities.push('leadCapture');
  return capabilities;
}

function contractFromProfile(profile: PlatformProfileSeed): PlatformCredentialContract {
  const guide = PLATFORM_SETUP_GUIDES[profile.slug] ?? null;

  if (profile.slug === 'consumer-marketplace' || profile.integrationClass === 'OWNED') {
    const isMarketplace = profile.slug === 'consumer-marketplace';
    return {
      platformSlug: profile.slug,
      provider: 'internal',
      authType: 'internal',
      requiredFields: [],
      requiredSecrets: [],
      requiredScopes: [],
      requiredPermissions: [],
      requiredCapabilities: isMarketplace
        ? [
            'Marketplace route health',
            'Publish endpoint',
            'Lead capture',
            'Notification loop',
          ]
        : [
            'Owned storefront publish route',
            'Listing artifact generation',
            'Lead capture',
            'Analytics event flow',
          ],
      capabilityChecks: isMarketplace
        ? [
            'Marketplace route health',
            'Publish endpoint',
            'Lead capture',
            'Notification loop',
          ]
        : [
            'Owned storefront publish route',
            'Listing artifact generation',
            'Lead capture',
            'Analytics event flow',
          ],
      docsUrl: profile.integrationUrls?.developerDocsUrl ?? null,
      connectionModel: 'internal-route',
      validationDepth: 'internal',
      checkedFields: isMarketplace
        ? [
            'GET /api/marketplace/vehicles',
            'POST /api/dealers/:dealershipId/platforms/consumer-marketplace/listings',
            'POST /api/marketplace/vehicles/:listingId/leads',
            'GET /api/dealers/:dealershipId/notifications',
          ]
        : [
            'Owned storefront publish pipeline',
            'Dealer listing artifact',
            'Lead capture route',
            'Analytics event ingestion',
          ],
      stages: ['config', 'auth', 'permissions', 'capability'],
      notes: 'Owned channel uses first-party routes and database state, not external developer keys.',
      adminSetup: guide?.admin ?? null,
      operatorSetup: guide?.operator ?? null,
    };
  }

  if (profile.oauthProvider) {
    const provider = PROVIDER_CREDENTIAL_CONTRACTS[profile.oauthProvider];
    if (provider) {
      return {
        platformSlug: profile.slug,
        provider: profile.oauthProvider,
        authType: provider.authType,
        requiredFields: provider.requiredFields,
        requiredSecrets: provider.requiredFields,
        requiredScopes: provider.requiredScopes ?? [],
        requiredPermissions: provider.requiredPermissions ?? [],
        requiredCapabilities: provider.requiredCapabilities ?? capabilitiesForProfile(profile),
        capabilityChecks: provider.requiredCapabilities ?? capabilitiesForProfile(profile),
        docsUrl: profile.integrationUrls?.developerDocsUrl ?? provider.docsUrl,
        connectionModel: provider.connectionModel ?? 'shared-system-oauth',
        validationDepth: provider.validationDepth ?? 'auth',
        checkedFields: provider.requiredFields,
        stages: ['config', 'auth', 'permissions', 'capability'],
        notes: provider.notes,
        adminSetup: guide?.admin ?? null,
        operatorSetup: guide?.operator ?? null,
      };
    }
  }

  if (profile.partnerFeed || profile.connectionType === 'PARTNER_FEED' || profile.connectionType === 'SFTP') {
    return {
      platformSlug: profile.slug,
      provider: 'partner-feed',
      authType: 'sftp',
      requiredFields: [],
      requiredSecrets: [],
      requiredScopes: [],
      requiredPermissions: [],
      requiredCapabilities: capabilitiesForProfile(profile),
      capabilityChecks: capabilitiesForProfile(profile),
      docsUrl: profile.integrationUrls?.developerDocsUrl ?? profile.integrationUrls?.feedSpecUrl ?? null,
      connectionModel: 'partner-feed',
      validationDepth: 'config',
      checkedFields: ['Dealer or partner feed credentials'],
      stages: ['config'],
      notes: 'No shared system developer keys are required; credentials are handled per dealer or partner feed account.',
      adminSetup: guide?.admin ?? null,
      operatorSetup: guide?.operator ?? null,
    };
  }

  if (profile.connectionType === 'MANUAL_PORTAL') {
    return {
      platformSlug: profile.slug,
      provider: 'manual',
      authType: 'manual',
      requiredFields: [],
      requiredSecrets: [],
      requiredScopes: [],
      requiredPermissions: [],
      requiredCapabilities: capabilitiesForProfile(profile),
      capabilityChecks: capabilitiesForProfile(profile),
      docsUrl: profile.integrationUrls?.developerDocsUrl ?? profile.integrationUrls?.partnerPortalUrl ?? null,
      connectionModel: 'manual-portal',
      validationDepth: 'config',
      checkedFields: ['Manual partner portal access'],
      stages: ['config'],
      notes: 'No shared system developer key is configured for this platform; operator workflow depends on partner portal access.',
      adminSetup: guide?.admin ?? null,
      operatorSetup: guide?.operator ?? null,
    };
  }

  return {
    platformSlug: profile.slug,
    provider: 'none',
    authType: 'none',
    requiredFields: [],
    requiredSecrets: [],
    requiredScopes: [],
    requiredPermissions: [],
    requiredCapabilities: capabilitiesForProfile(profile),
    capabilityChecks: capabilitiesForProfile(profile),
    docsUrl: profile.integrationUrls?.developerDocsUrl ?? null,
    connectionModel: 'none',
    validationDepth: 'config',
    checkedFields: [],
    stages: ['config'],
    notes: 'No external system credential is required for this platform.',
    adminSetup: guide?.admin ?? null,
    operatorSetup: guide?.operator ?? null,
  };
}

export const PLATFORM_CREDENTIAL_CONTRACTS: Record<string, PlatformCredentialContract> =
  Object.fromEntries(platformProfiles.map(profile => [profile.slug, contractFromProfile(profile)]));

export function getPlatformCredentialContract(platformSlug: string): PlatformCredentialContract | null {
  return PLATFORM_CREDENTIAL_CONTRACTS[platformSlug] ?? null;
}

export function listPlatformCredentialContracts(): PlatformCredentialContract[] {
  return Object.values(PLATFORM_CREDENTIAL_CONTRACTS);
}
