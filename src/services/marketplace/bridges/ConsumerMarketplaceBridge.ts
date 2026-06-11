import type { MarketplaceListingBridge, ListingResult, DistributionContext } from '../marketplaceListingTypes.js';
import type { ContentPackage } from '../../distribution/types.js';

// First-party bridge for our own consumer marketplace.
// No OAuth, no external API — the route writes directly to MarketplaceListing.
// upsertListing/endListing are no-ops; the route handles all DB state.
export class ConsumerMarketplaceBridge implements MarketplaceListingBridge {
  readonly platformSlug = 'consumer-marketplace';
  readonly requiresOAuth = false;

  async upsertListing(
    _token: string,
    _pkg: ContentPackage,
    _ctx: DistributionContext,
  ): Promise<ListingResult> {
    return {};
  }

  async endListing(_token: string, _externalOfferId: string): Promise<void> {
    // no-op: route calls markEnded directly
  }
}
