import { EbayListingClient } from '../EbayListingClient.js';
import { EbayOAuthClient } from '../../platform/clients/providers/EbayOAuthClient.js';
import type { MarketplaceListingBridge, ListingResult, DistributionContext } from '../marketplaceListingTypes.js';
import type { ContentPackage } from '../../distribution/types.js';
import type { OAuthProvider } from '../../../lib/types.js';

// Category 6001: eBay Motors > Cars & Trucks
const EBAY_MOTORS_CATEGORY_ID = '6001';
const EBAY_MARKETPLACE_ID = 'EBAY_MOTORS_US';

function requirePolicyEnv(name: string): string {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required env var ${name} for eBay listing policies`);
  return val;
}

export class EbayListingBridge implements MarketplaceListingBridge {
  readonly platformSlug = 'ebay-motors';
  readonly requiresOAuth = true;
  readonly oauthProvider: OAuthProvider = 'ebay';
  readonly oauthClient = new EbayOAuthClient();

  async upsertListing(token: string, pkg: ContentPackage, _ctx: DistributionContext): Promise<ListingResult> {
    const sd = pkg.structuredData as {
      stockNumber: string;
      year: number;
      make: string;
      model: string;
      trim: string | null;
      condition: string;
      mileage: number;
      vin: string | null;
    };

    const sku = sd.stockNumber;
    const priceDollars = (pkg.price ?? 0) / 100;

    await EbayListingClient.upsertInventoryItem(token, {
      sku,
      condition: sd.condition,
      title: pkg.headline,
      description: pkg.body,
      imageUrls: pkg.imageUrls,
      mileage: sd.mileage,
      year: sd.year,
      make: sd.make,
      vehicleModel: sd.model,
      trim: sd.trim,
      vin: sd.vin,
    });

    const existing = await EbayListingClient.getOffer(token, sku);
    let offerId: string;

    const listingPolicies = {
      fulfillmentPolicyId: requirePolicyEnv('EBAY_FULFILLMENT_POLICY_ID'),
      paymentPolicyId: requirePolicyEnv('EBAY_PAYMENT_POLICY_ID'),
      returnPolicyId: requirePolicyEnv('EBAY_RETURN_POLICY_ID'),
    };
    const merchantLocationKey = process.env['EBAY_MERCHANT_LOCATION_KEY'];

    if (existing) {
      offerId = existing.offerId;
      await EbayListingClient.updateOffer(token, offerId, {
        priceSummary: { value: String(priceDollars.toFixed(2)), currency: 'USD' },
        listingPolicies,
        ...(merchantLocationKey ? { merchantLocationKey } : {}),
      });
    } else {
      offerId = await EbayListingClient.createOffer(token, {
        sku,
        marketplaceId: EBAY_MARKETPLACE_ID,
        format: 'FIXED_PRICE',
        listingDescription: pkg.body,
        priceSummary: { value: String(priceDollars.toFixed(2)), currency: 'USD' },
        quantityLimitPerBuyer: 1,
        categoryId: EBAY_MOTORS_CATEGORY_ID,
        listingPolicies,
        ...(merchantLocationKey ? { merchantLocationKey } : {}),
      });
    }

    const listingId = await EbayListingClient.publishOffer(token, offerId);

    return { externalListingId: listingId, externalOfferId: offerId };
  }

  async endListing(token: string, externalOfferId: string): Promise<void> {
    await EbayListingClient.withdrawOffer(token, externalOfferId);
  }
}
