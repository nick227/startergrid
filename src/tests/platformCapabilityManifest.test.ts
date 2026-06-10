import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  CATALOG_SYNC_SLUGS,
  SOCIAL_POSTING_SLUGS,
  MARKETPLACE_LISTING_SLUGS,
  PARTNER_FEED_SLUGS,
  OAUTH_PROFILE_SLUGS,
} from '../lib/platformCapabilityManifest.js';
import { CATALOG_BRIDGE_SLUGS } from '../server/routes/catalogSync.js';
import { LISTING_BRIDGE_SLUGS } from '../server/routes/marketplaceListings.js';
import { platformProfiles } from '../data/platformProfiles.js';
import { PlatformClientRegistry } from '../services/platform/clients/PlatformClientRegistry.js';

// ── CATALOG_SYNC_SLUGS vs BRIDGE_REGISTRY ────────────────────────────────────

describe('CATALOG_SYNC_SLUGS matches BRIDGE_REGISTRY exactly', () => {
  it('every catalogSync profile has a bridge', () => {
    for (const slug of CATALOG_SYNC_SLUGS) {
      assert.ok(CATALOG_BRIDGE_SLUGS.has(slug), `${slug} has catalogSync:true but no bridge`);
    }
  });

  it('every bridge has a catalogSync profile', () => {
    for (const slug of CATALOG_BRIDGE_SLUGS) {
      assert.ok(CATALOG_SYNC_SLUGS.has(slug), `bridge ${slug} missing catalogSync:true on profile`);
    }
  });

  it('exact slug set', () => {
    const expected = new Set([
      'meta-automotive-ads',
      'google-vehicle-ads',
      'tiktok-automotive-ads',
      'microsoft-automotive-ads',
      'pinterest-shopping-ads',
      'snapchat-dynamic-product-ads',
      'reddit-dynamic-product-ads',
      'tiktok-shop',
      'x-dynamic-product-ads',
      'nextdoor-ads',
    ]);
    assert.deepEqual(new Set(CATALOG_SYNC_SLUGS), expected);
  });
});

// ── SOCIAL_POSTING_SLUGS ─────────────────────────────────────────────────────

describe('SOCIAL_POSTING_SLUGS', () => {
  it('exact slug set', () => {
    const expected = new Set(['facebook-business-page', 'google-business-profile']);
    assert.deepEqual(new Set(SOCIAL_POSTING_SLUGS), expected);
  });

  it('every socialPosting platform has an oauthProvider', () => {
    for (const slug of SOCIAL_POSTING_SLUGS) {
      const profile = platformProfiles.find(p => p.slug === slug);
      assert.ok(profile?.oauthProvider, `${slug} has socialPosting:true but no oauthProvider`);
    }
  });
});

// ── MARKETPLACE_LISTING_SLUGS ────────────────────────────────────────────────

describe('MARKETPLACE_LISTING_SLUGS', () => {
  it('includes first-party and third-party marketplace channels', () => {
    const expected = [
      'dealer-storefront',
      'consumer-marketplace',
      'tiktok-shop',
      'ebay-motors',
      'cargurus-dealer',
      'autotrader-cox',
      'cars-com',
      'truecar-dealer-network',
      'facebook-marketplace-general',
      'rv-trader',
      'cycle-trader',
      'atv-trader',
      'trailer-trader',
      'boat-trader',
      'yachtworld',
      'boats-com',
    ];
    for (const slug of expected) {
      assert.ok(MARKETPLACE_LISTING_SLUGS.has(slug), `expected ${slug} in MARKETPLACE_LISTING_SLUGS`);
    }
  });

  it('ad networks and lead routers are NOT marketplace listings', () => {
    const notListing = [
      'google-vehicle-ads',
      'meta-automotive-ads',
      'tiktok-automotive-ads',
      'microsoft-automotive-ads',
      'pinterest-shopping-ads',
      'snapchat-dynamic-product-ads',
      'reddit-dynamic-product-ads',
      'adf-xml-lead-routing',
      'linkedin-lead-gen-forms',
      'nextdoor-ads',
      'x-dynamic-product-ads',
    ];
    for (const slug of notListing) {
      assert.ok(!MARKETPLACE_LISTING_SLUGS.has(slug), `${slug} should NOT be in MARKETPLACE_LISTING_SLUGS`);
    }
  });
});

// ── PARTNER_FEED_SLUGS ───────────────────────────────────────────────────────

describe('PARTNER_FEED_SLUGS', () => {
  it('includes all vehicle marketplace partner feeds', () => {
    const vehicleFeeds = [
      'cargurus-dealer',
      'autotrader-cox',
      'cars-com',
      'truecar-dealer-network',
      'rv-trader',
      'cycle-trader',
      'atv-trader',
      'trailer-trader',
      'boat-trader',
      'yachtworld',
      'boats-com',
    ];
    for (const slug of vehicleFeeds) {
      assert.ok(PARTNER_FEED_SLUGS.has(slug), `expected ${slug} in PARTNER_FEED_SLUGS`);
    }
  });

  it('includes FEEDABLE non-vehicle stubs (e.g. shopify-catalog)', () => {
    assert.ok(PARTNER_FEED_SLUGS.has('shopify-catalog'), 'shopify-catalog should be in PARTNER_FEED_SLUGS (FEEDABLE non-vehicle stub)');
  });

  it('every partnerFeed platform is also a marketplaceListing', () => {
    for (const slug of PARTNER_FEED_SLUGS) {
      assert.ok(MARKETPLACE_LISTING_SLUGS.has(slug), `${slug} has partnerFeed:true but not marketplaceListing:true`);
    }
  });
});

// ── OAUTH_PROFILE_SLUGS ──────────────────────────────────────────────────────

describe('OAUTH_PROFILE_SLUGS', () => {
  it('every OAuth profile slug has a PlatformClientRegistry client', () => {
    for (const slug of OAUTH_PROFILE_SLUGS) {
      const client = PlatformClientRegistry.forSlug(slug);
      assert.ok(client !== null, `${slug} has oauthProvider but no PlatformClientRegistry client`);
    }
  });

  it('apple-business-connect is NOT in OAUTH_PROFILE_SLUGS (oauthProvider suppressed)', () => {
    assert.ok(
      !OAUTH_PROFILE_SLUGS.has('apple-business-connect'),
      'apple-business-connect should not be in OAUTH_PROFILE_SLUGS until jose JWT ships',
    );
  });

  it('all catalogSync profiles have oauthProvider', () => {
    for (const slug of CATALOG_SYNC_SLUGS) {
      const profile = platformProfiles.find(p => p.slug === slug);
      assert.ok(profile?.oauthProvider, `${slug} has catalogSync:true but no oauthProvider`);
    }
  });
});

// ── connectionType + integrationMaturity coverage ────────────────────────────

describe('capability field coverage', () => {
  const vehicleProfiles = platformProfiles.filter(p =>
    !p.schemaVersion.startsWith('stub-2026.06-') || p.slug === 'tiktok-shop',
  ).filter(p => p.supportedCategories?.includes('AUTOMOTIVE')
    || p.supportedCategories?.includes('TRAILERS_POWERSPORTS_RV')
    || p.supportedCategories?.includes('BOATS'));

  it('every vehicle platform profile has connectionType set', () => {
    for (const p of vehicleProfiles) {
      assert.ok(p.connectionType, `${p.slug} is missing connectionType`);
    }
  });

  it('every vehicle platform profile has integrationMaturity set', () => {
    for (const p of vehicleProfiles) {
      assert.ok(p.integrationMaturity, `${p.slug} is missing integrationMaturity`);
    }
  });

  it('every vehicle platform profile has requirementsConfidence set', () => {
    for (const p of vehicleProfiles) {
      assert.ok(p.requirementsConfidence, `${p.slug} is missing requirementsConfidence`);
    }
  });

  it('LIVE_VERIFIED profiles are first-party owned channels', () => {
    const liveVerified = vehicleProfiles.filter(p => p.integrationMaturity === 'LIVE_VERIFIED');
    assert.deepEqual(
      liveVerified.map(p => p.slug).sort(),
      ['consumer-marketplace', 'dealer-storefront'],
    );
  });

  it('PARTNER_FEED connectionType matches partnerFeed flag', () => {
    for (const p of vehicleProfiles) {
      if (p.connectionType === 'PARTNER_FEED') {
        assert.ok(p.partnerFeed, `${p.slug} has connectionType PARTNER_FEED but partnerFeed is not true`);
      }
      if (p.partnerFeed) {
        assert.equal(p.connectionType, 'PARTNER_FEED', `${p.slug} has partnerFeed:true but connectionType is ${p.connectionType}`);
      }
    }
  });
});

// ── LISTING_BRIDGE_SLUGS vs MARKETPLACE_LISTING_SLUGS ────────────────────────

describe('LISTING_BRIDGE_SLUGS is a strict subset of MARKETPLACE_LISTING_SLUGS', () => {
  it('every listing bridge slug has marketplaceListing:true', () => {
    for (const slug of LISTING_BRIDGE_SLUGS) {
      assert.ok(MARKETPLACE_LISTING_SLUGS.has(slug), `${slug} is a listing bridge but not in MARKETPLACE_LISTING_SLUGS`);
    }
  });

  it('LISTING_BRIDGE_SLUGS is a proper subset (fewer than MARKETPLACE_LISTING_SLUGS)', () => {
    assert.ok(
      LISTING_BRIDGE_SLUGS.size < MARKETPLACE_LISTING_SLUGS.size,
      'LISTING_BRIDGE_SLUGS should be a proper subset of MARKETPLACE_LISTING_SLUGS',
    );
  });

  it('ebay-motors is the current registered listing bridge', () => {
    assert.deepEqual(new Set(LISTING_BRIDGE_SLUGS), new Set(['ebay-motors']));
  });
});
