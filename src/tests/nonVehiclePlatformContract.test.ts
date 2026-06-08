// Non-vehicle platform contract tests.
//
// Proves that stub platform profiles for SONGS, EBOOKS, APPAREL, DIGITAL_ART,
// VIDEO_DISTRIBUTION, and PAWN have valid URLs, required field definitions,
// and that pristine fixtures pass readiness validation.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { platformProfiles } from '../data/platformProfiles.js';
import { NON_VEHICLE_FIXTURES } from '../fixtures/scenarios/nonVehicleFixtures.js';
import {
  NON_VEHICLE_PAYLOAD_KEYS,
  parseApparelCategoryPayload,
  parseApartmentsCategoryPayload,
  parseCollectiblesCategoryPayload,
  parseCommercialPropertyCategoryPayload,
  parseDigitalArtCategoryPayload,
  parseEbooksCategoryPayload,
  parseFurnitureCategoryPayload,
  parseHeavyEquipmentCategoryPayload,
  parseHomesCategoryPayload,
  parsePawnCategoryPayload,
  parseSneakersCategoryPayload,
  parseSongsCategoryPayload,
  parseVacationRentalsCategoryPayload,
  parseVideoCategoryPayload,
  parseWatchesCategoryPayload,
} from '../lib/nonVehicleCategoryPayload.js';
import {
  NON_VEHICLE_PLATFORM_CATEGORIES,
  nonVehiclePlatformsForCategory,
  PLATFORM_REGISTRY_TOTAL,
  type NonVehiclePlatformCategory,
} from '../data/nonVehiclePlatformStubs.js';
import {
  BUSINESS_CATEGORY_IDS,
  resolveCategorySchema,
} from '../../packages/category-schemas/src/index.js';

const PAYLOAD_PARSERS = {
  SONGS: parseSongsCategoryPayload,
  EBOOKS: parseEbooksCategoryPayload,
  APPAREL: parseApparelCategoryPayload,
  DIGITAL_ART: parseDigitalArtCategoryPayload,
  VIDEO_DISTRIBUTION: parseVideoCategoryPayload,
  PAWN: parsePawnCategoryPayload,
  WATCHES: parseWatchesCategoryPayload,
  SNEAKERS: parseSneakersCategoryPayload,
  COLLECTIBLES: parseCollectiblesCategoryPayload,
  FURNITURE: parseFurnitureCategoryPayload,
  VACATION_RENTALS: parseVacationRentalsCategoryPayload,
  APARTMENTS: parseApartmentsCategoryPayload,
  HOMES: parseHomesCategoryPayload,
  COMMERCIAL_PROPERTY: parseCommercialPropertyCategoryPayload,
  HEAVY_EQUIPMENT: parseHeavyEquipmentCategoryPayload,
} as const;

function isHttpsUrl(value: string | undefined): boolean {
  return typeof value === 'string' && value.startsWith('https://');
}

describe('non-vehicle platform registry', () => {
  it('each rich placeholder category has at least two platform stubs', () => {
    for (const category of NON_VEHICLE_PLATFORM_CATEGORIES) {
      const platforms = nonVehiclePlatformsForCategory(category);
      assert.ok(platforms.length >= 2, `${category} needs ≥2 platform stubs`);
    }
  });

  it('non-vehicle stubs are present in the main platform registry', () => {
    const slugs = new Set(platformProfiles.map(p => p.slug));
    for (const category of NON_VEHICLE_PLATFORM_CATEGORIES) {
      for (const platform of nonVehiclePlatformsForCategory(category)) {
        assert.ok(slugs.has(platform.slug), `missing ${platform.slug} in platformProfiles`);
      }
    }
  });

  it('every non-vehicle stub has HTTPS partner and developer doc URLs', () => {
    for (const category of NON_VEHICLE_PLATFORM_CATEGORIES) {
      for (const platform of nonVehiclePlatformsForCategory(category)) {
        assert.ok(
          isHttpsUrl(platform.integrationUrls.partnerPortalUrl),
          `${platform.slug} missing partnerPortalUrl`,
        );
        assert.ok(
          isHttpsUrl(platform.integrationUrls.developerDocsUrl),
          `${platform.slug} missing developerDocsUrl`,
        );
      }
    }
  });

  it('non-vehicle stubs only support their declared category', () => {
    for (const category of NON_VEHICLE_PLATFORM_CATEGORIES) {
      for (const platform of nonVehiclePlatformsForCategory(category)) {
        assert.deepEqual(platform.supportedCategories, [category]);
      }
    }
  });

  it('non-vehicle stubs are tagged for contract validation', () => {
    for (const platform of platformProfiles) {
      if (!NON_VEHICLE_PLATFORM_CATEGORIES.some(c => platform.supportedCategories.includes(c))) continue;
      assert.equal(platform.testFixtures['validatesNonVehicleChannelStub'], true);
    }
  });
});

describe('non-vehicle payload shapes — fixtures match category schema fields', () => {
  for (const category of NON_VEHICLE_PLATFORM_CATEGORIES) {
    it(`${category} fixture inventory covers schema identifier fields`, () => {
      const schema = resolveCategorySchema(category);
      const { inventory } = NON_VEHICLE_FIXTURES[category];
      assert.ok(inventory.length >= 2);

      const identifierFields = schema.fields
        .filter(f => f.kind === 'identifier' || f.kind === 'text' || f.kind === 'number' || f.kind === 'currency')
        .map(f => f.key);

      for (const item of inventory) {
        for (const key of identifierFields) {
          if (key === 'vin' && !schema.asset.idFieldKey) continue;
          const value = item[key as keyof typeof item];
          assert.ok(value != null && value !== '', `${category} item ${item.stockNumber} missing ${key}`);
        }
      }
    });

    it(`${category} categoryPayload keys are documented and parseable`, () => {
      const expectedKeys = NON_VEHICLE_PAYLOAD_KEYS[category];
      const parser = PAYLOAD_PARSERS[category];
      const { inventory } = NON_VEHICLE_FIXTURES[category];

      for (const item of inventory) {
        const parsed = parser(item.categoryPayload);
        assert.notDeepEqual(parsed, {}, `${category} item ${item.stockNumber} has empty categoryPayload`);
        for (const key of expectedKeys) {
          const value = parsed[key as keyof typeof parsed];
          assert.ok(value != null, `${category} item ${item.stockNumber} missing categoryPayload.${key}`);
        }
      }
    });
  }
});

describe('non-vehicle fixtures — dealer channel alignment', () => {
  for (const category of NON_VEHICLE_PLATFORM_CATEGORIES) {
    it(`${category} dealer desiredChannels lists every category platform`, () => {
      const { dealer } = NON_VEHICLE_FIXTURES[category];
      const expected = new Set(nonVehiclePlatformsForCategory(category).map(p => p.slug));
      const actual = new Set(dealer.desiredChannels);
      for (const slug of expected) {
        assert.ok(actual.has(slug), `${category} dealer missing desired channel ${slug}`);
      }
    });
  }
});

describe('non-vehicle platform count — registry growth', () => {
  it(`platform registry includes non-vehicle stubs (${PLATFORM_REGISTRY_TOTAL} total)`, () => {
    assert.equal(platformProfiles.length, PLATFORM_REGISTRY_TOTAL);
  });

  it('automotive-only platforms do not claim non-vehicle categories', () => {
    const automotiveOnly = platformProfiles.filter(p =>
      p.supportedCategories.includes('AUTOMOTIVE')
      && !p.supportedCategories.some(c => NON_VEHICLE_PLATFORM_CATEGORIES.includes(c as NonVehiclePlatformCategory)),
    );
    for (const platform of automotiveOnly) {
      for (const category of NON_VEHICLE_PLATFORM_CATEGORIES) {
        assert.ok(
          !platform.supportedCategories.includes(category),
          `${platform.slug} should not support ${category}`,
        );
      }
    }
  });
});

describe('non-vehicle categories — schema registry parity', () => {
  it('all non-vehicle platform categories exist in BUSINESS_CATEGORY_IDS', () => {
    for (const category of NON_VEHICLE_PLATFORM_CATEGORIES) {
      assert.ok(BUSINESS_CATEGORY_IDS.includes(category));
    }
  });
});
