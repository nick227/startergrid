import type { OAuthClient } from '../platform/clients/OAuthClient.js';
import type { OAuthProvider } from '../../lib/types.js';
import type { ContentPackage, DistributionContext } from '../distribution/types.js';

export type { DistributionContext };

export type ListingResult = {
  externalListingId?: string;
  externalOfferId?: string;
};

export type MarketplaceListingRecord = {
  id: string;
  dealershipId: string;
  vehicleId: string;
  platformSlug: string;
  externalListingId: string | null;
  externalOfferId: string | null;
  status: 'DRAFT' | 'ACTIVE' | 'ENDED' | 'FAILED';
  errorMessage: string | null;
  listedAt: Date | null;
  endedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export interface MarketplaceListingBridge {
  readonly platformSlug: string;
  /** When false the route skips OAuth token fetch. Defaults to true. */
  readonly requiresOAuth: boolean;
  readonly oauthProvider?: OAuthProvider;
  readonly oauthClient?: OAuthClient;
  upsertListing(token: string, pkg: ContentPackage, ctx: DistributionContext): Promise<ListingResult>;
  endListing(token: string, externalOfferId: string): Promise<void>;
}
