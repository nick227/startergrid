// Unified platform readiness contract — every registered platform is validated
// against the pristine fixture for each category it supports (automotive,
// trailers, boats, and non-vehicle categories).

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { platformProfiles } from '../data/platformProfiles.js';
import {
  categoriesWithPlatformFixtures,
  platformFixtureForCategory,
} from '../lib/platformFixtureRegistry.js';
import type { BusinessCategoryId } from '../../packages/category-schemas/src/types.js';
import {
  validatePlatformReadiness,
  validatePlatformReadinessStrict,
} from '../validators/platform/platformReadinessValidator.js';

function readinessFailures(
  category: BusinessCategoryId,
  mode: 'baseline' | 'strict',
) {
  const fixture = platformFixtureForCategory(category);
  if (!fixture) return [];

  const platforms = platformProfiles.filter(p =>
    p.supportedCategories.includes(category),
  );

  return platforms
    .map(platform => {
      const report = mode === 'strict'
        ? validatePlatformReadinessStrict(platform, fixture.dealer, fixture.inventory)
        : validatePlatformReadiness(platform, fixture.dealer, fixture.inventory);
      return { platform, report };
    })
    .filter(({ report }) =>
      mode === 'strict'
        ? report.readiness === 'RED'
        : report.readiness !== 'GREEN' || report.issues.length > 0,
    )
    .map(({ platform, report }) => ({
      platformSlug: platform.slug,
      category,
      readiness: report.readiness,
      issues: report.issues,
    }));
}

describe('platform readiness — all categories with fixtures', () => {
  for (const category of categoriesWithPlatformFixtures()) {
    it(`${category} pristine fixture passes baseline readiness for every supported platform`, () => {
      assert.deepEqual(readinessFailures(category, 'baseline'), []);
    });
  }

  it('AUTOMOTIVE pristine fixture produces no RED platforms under strict mode', () => {
    assert.deepEqual(readinessFailures('AUTOMOTIVE', 'strict'), []);
  });
});

describe('platform readiness — dealer channel alignment', () => {
  for (const category of categoriesWithPlatformFixtures()) {
    it(`${category} dealer desiredChannels lists every category-exclusive platform`, () => {
      const fixture = platformFixtureForCategory(category)!;
      const channels = new Set(fixture.dealer.desiredChannels);
      const categoryPlatforms = platformProfiles.filter(p =>
        p.supportedCategories.length === 1
        && p.supportedCategories[0] === category,
      );

      for (const platform of categoryPlatforms) {
        assert.ok(
          channels.has(platform.slug),
          `${category} dealer missing desired channel ${platform.slug}`,
        );
      }
    });
  }
});

describe('platform readiness — registry coverage', () => {
  it('every platform supported category has a fixture or is intentionally uncovered', () => {
    const fixtureCategories = new Set(categoriesWithPlatformFixtures());
    const uncovered = new Set<string>();

    for (const platform of platformProfiles) {
      for (const category of platform.supportedCategories) {
        if (!fixtureCategories.has(category as BusinessCategoryId)) {
          uncovered.add(`${platform.slug}/${category}`);
        }
      }
    }

    assert.deepEqual([...uncovered].sort(), []);
  });

  it('every platform profile is exercised by at least one category fixture', () => {
    const exercised = new Set<string>();

    for (const category of categoriesWithPlatformFixtures()) {
      for (const platform of platformProfiles) {
        if (platform.supportedCategories.includes(category)) {
          exercised.add(platform.slug);
        }
      }
    }

    const missing = platformProfiles
      .filter(p => !exercised.has(p.slug))
      .map(p => p.slug);

    assert.deepEqual(missing, []);
  });
});
