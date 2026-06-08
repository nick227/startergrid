// Feed artifact contract — proves generateFeedForPlatform produces parseable
// listing packets from category fixtures (generic JSON catalog path).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { platformProfiles } from '../data/platformProfiles.js';
import { NON_VEHICLE_PLATFORM_CATEGORIES } from '../data/nonVehiclePlatformStubs.js';
import { NON_VEHICLE_FIXTURES } from '../fixtures/scenarios/nonVehicleFixtures.js';
import { generateFeedForPlatform } from '../services/publishing/feedGeneratorService.js';

/** One representative platform slug per category for feed generation. */
const FEED_SAMPLE_SLUG: Record<(typeof NON_VEHICLE_PLATFORM_CATEGORIES)[number], string> = {
  SONGS: 'distrokid',
  EBOOKS: 'amazon-kdp',
  APPAREL: 'shopify-catalog',
  DIGITAL_ART: 'opensea',
  VIDEO_DISTRIBUTION: 'youtube-creator',
  PAWN: 'ebay-resale',
  WATCHES: 'chrono24-dealer',
  SNEAKERS: 'stockx',
  COLLECTIBLES: 'tcgplayer',
  FURNITURE: 'chairish',
  VACATION_RENTALS: 'airbnb-host',
  APARTMENTS: 'zillow-rental-manager',
  HOMES: 'zillow-homes',
  COMMERCIAL_PROPERTY: 'loopnet',
  HEAVY_EQUIPMENT: 'machinery-trader',
};

describe('platform feed artifacts — non-vehicle category fixtures', () => {
  for (const category of NON_VEHICLE_PLATFORM_CATEGORIES) {
    it(`${category} generates a parseable generic listing packet`, () => {
      const slug = FEED_SAMPLE_SLUG[category];
      const platform = platformProfiles.find(p => p.slug === slug);
      assert.ok(platform, `missing platform ${slug}`);

      const { dealer, inventory } = NON_VEHICLE_FIXTURES[category];
      const artifact = generateFeedForPlatform(platform, dealer, inventory);
      const parsed = JSON.parse(artifact.content) as {
        platform: string;
        items: Array<Record<string, unknown>>;
      };

      assert.equal(parsed.platform, slug);
      assert.ok(Array.isArray(parsed.items));
      assert.equal(parsed.items.length, inventory.length);

      const first = inventory[0]!;
      const row = parsed.items[0]!;
      assert.equal(row['id'], first.stockNumber);
      assert.ok(typeof row['title'] === 'string' && (row['title'] as string).length > 0);
      assert.ok(typeof row['price'] === 'string' && (row['price'] as string).includes('USD'));
      assert.equal(artifact.format, platform.outputFormat);
      assert.equal(artifact.platformSlug, slug);
    });
  }
});

describe('platform feed artifacts — FEEDABLE non-vehicle platforms', () => {
  it('shopify-catalog and facebook-marketplace-resale use FEED_URL submission', () => {
    for (const slug of ['shopify-catalog', 'facebook-marketplace-resale']) {
      const platform = platformProfiles.find(p => p.slug === slug)!;
      assert.equal(platform.integrationClass, 'FEEDABLE');
      assert.ok(platform.submissionMethods.includes('FEED_URL'));
    }
  });
});
