import type { OAuthClient } from '../platform/clients/OAuthClient.js';
import type { OAuthProvider } from '../../lib/types.js';
import type { ContentPackage, DistributionResult } from '../distribution/types.js';
import { FacebookGraphClient } from './FacebookGraphClient.js';
import { FacebookPageAdapter } from '../distribution/adapters/FacebookPageAdapter.js';
import { GoogleBusinessProfileClient } from './GoogleBusinessProfileClient.js';
import { GoogleBusinessProfileAdapter } from '../distribution/adapters/GoogleBusinessProfileAdapter.js';
import { FacebookBusinessPageOAuthClient } from '../platform/clients/providers/FacebookBusinessPageOAuthClient.js';
import { GoogleBusinessProfileOAuthClient } from '../platform/clients/providers/GoogleBusinessProfileOAuthClient.js';

export type SocialAccountInfo = {
  id: string;
  name: string;
  accessToken: string;
  category?: string;
  pictureUrl?: string;
};

export type SocialPageRef = {
  pageId: string;
  pageAccessToken: string;
};

export interface SocialPlatformBridge {
  readonly platformSlug: string;
  readonly oauthProvider: OAuthProvider;
  readonly oauthClient: OAuthClient;

  // When true the publish flow uses selectedPage.pageAccessToken (e.g. Facebook).
  // When false the route must supply a freshToken from CredentialStore (e.g. GBP).
  readonly usesStoredPageToken: boolean;

  fetchAccounts(userAccessToken: string): Promise<SocialAccountInfo[]>;

  publish(
    page: SocialPageRef,
    pkg: ContentPackage,
    freshToken: string,
  ): Promise<DistributionResult>;
}

const facebookBridge: SocialPlatformBridge = {
  platformSlug: 'facebook-business-page',
  oauthProvider: 'facebook-business-page',
  oauthClient: new FacebookBusinessPageOAuthClient(),
  usesStoredPageToken: true,

  async fetchAccounts(accessToken) {
    return FacebookGraphClient.getPages(accessToken);
  },

  async publish(page, pkg, _freshToken) {
    return FacebookPageAdapter.publish(
      { pageId: page.pageId, pageAccessToken: page.pageAccessToken },
      pkg,
    );
  },
};

const googleBusinessProfileBridge: SocialPlatformBridge = {
  platformSlug: 'google-business-profile',
  oauthProvider: 'google-business-profile',
  oauthClient: new GoogleBusinessProfileOAuthClient(),
  usesStoredPageToken: false,

  async fetchAccounts(accessToken) {
    return GoogleBusinessProfileClient.listLocations(accessToken);
  },

  async publish(page, pkg, freshToken) {
    return GoogleBusinessProfileAdapter.publish(
      { locationName: page.pageId, accessToken: freshToken },
      pkg,
    );
  },
};

const BRIDGES: Record<string, SocialPlatformBridge> = {
  'facebook-business-page': facebookBridge,
  'google-business-profile': googleBusinessProfileBridge,
};

export function getSocialPlatformBridge(platformSlug: string): SocialPlatformBridge | null {
  return BRIDGES[platformSlug] ?? null;
}

export const SOCIAL_PAGE_PLATFORM_SLUGS = new Set(Object.keys(BRIDGES));
