import type { DistributionAdapter, ContentPackage, DistributionContext, DistributionResult } from '../types.js';
import { GoogleBusinessProfileClient } from '../../social/GoogleBusinessProfileClient.js';

export type GBPLocationAccount = {
  locationName: string;  // full resource name, e.g. "accounts/123/locations/456"
  accessToken: string;   // current OAuth token — always passed fresh from CredentialStore
};

export type GBPDistributionResult = DistributionResult & {
  locationName: string;
};

export const GoogleBusinessProfileAdapter: DistributionAdapter<GBPLocationAccount, GBPDistributionResult> = {
  platformSlug: 'google-business-profile',

  async publish(
    account: GBPLocationAccount,
    pkg: ContentPackage,
    _context?: DistributionContext,
  ): Promise<GBPDistributionResult> {
    const result = await GoogleBusinessProfileClient.createLocalPost(
      account.accessToken,
      account.locationName,
      pkg.body,
      pkg.link,
      pkg.imageUrls[0],
    );

    return {
      externalId: result.name,
      externalUrl: undefined, // GBP local posts don't have a stable public URL
      locationName: account.locationName,
    };
  },
};
