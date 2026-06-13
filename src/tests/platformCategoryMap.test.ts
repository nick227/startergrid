// Category → platform mapping boundary tests.
//
// Proves (1) the centralized predicate fails closed for unknown/absent
// categories, and (2) the publish/prepare target resolver never lets a dealer
// touch platforms outside its business category — not even when an out-of-category
// slug is passed explicitly in the platform filter. Artifacts, applications, and
// feeds in runPrepareAndPublish are generated only for the resolved target set,
// so an empty/scoped target set is the guarantee that no cross-category artifact
// can be produced.

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  platformsForCategory,
  platformSlugsForCategory,
  isPlatformAllowedForCategory,
} from '../data/platformCategoryMap.js';
import { resolvePublishTargets } from '../services/publishing/prepareAndPublishService.js';

// Representative automotive-only platforms an ebook shop must never reach.
const AUTOMOTIVE_SLUGS = ['cars-com', 'autotrader-cox', 'ebay-motors'];
// Representative ebook platform.
const EBOOK_SLUG = 'amazon-kdp';

describe('platformCategoryMap — centralized predicate', () => {
  it('AUTOMOTIVE resolves to a non-empty set that includes car platforms', () => {
    const slugs = platformSlugsForCategory('AUTOMOTIVE');
    assert.ok(slugs.length > 0);
    for (const slug of AUTOMOTIVE_SLUGS) {
      assert.ok(slugs.includes(slug), `AUTOMOTIVE should include ${slug}`);
    }
    assert.ok(!slugs.includes(EBOOK_SLUG), 'AUTOMOTIVE must not include amazon-kdp');
  });

  it('EBOOKS resolves to ebook platforms and excludes every car platform', () => {
    const slugs = platformSlugsForCategory('EBOOKS');
    assert.ok(slugs.length > 0);
    assert.ok(slugs.includes(EBOOK_SLUG), 'EBOOKS should include amazon-kdp');
    for (const slug of AUTOMOTIVE_SLUGS) {
      assert.ok(!slugs.includes(slug), `EBOOKS must not include ${slug}`);
    }
  });

  it('fails closed for null / undefined / empty / unknown category', () => {
    assert.deepEqual(platformsForCategory(null), []);
    assert.deepEqual(platformsForCategory(undefined), []);
    assert.deepEqual(platformsForCategory(''), []);
    assert.deepEqual(platformsForCategory('NOT_A_REAL_CATEGORY'), []);
    assert.deepEqual(platformSlugsForCategory(null), []);
  });

  it('isPlatformAllowedForCategory enforces the boundary both ways', () => {
    assert.equal(isPlatformAllowedForCategory('cars-com', 'AUTOMOTIVE'), true);
    assert.equal(isPlatformAllowedForCategory('cars-com', 'EBOOKS'), false);
    assert.equal(isPlatformAllowedForCategory(EBOOK_SLUG, 'EBOOKS'), true);
    assert.equal(isPlatformAllowedForCategory(EBOOK_SLUG, 'AUTOMOTIVE'), false);
    // Fail closed on unknown category.
    assert.equal(isPlatformAllowedForCategory('cars-com', null), false);
  });
});

describe('resolvePublishTargets — publish/prepare category boundary', () => {
  it('EBOOKS dealer with no filter targets only ebook platforms, never car platforms', () => {
    const targets = resolvePublishTargets('EBOOKS');
    assert.ok(targets.length > 0);
    const slugs = targets.map(t => t.slug);
    assert.ok(slugs.includes(EBOOK_SLUG));
    for (const slug of AUTOMOTIVE_SLUGS) {
      assert.ok(!slugs.includes(slug), `EBOOKS target set must not include ${slug}`);
    }
    // Every target genuinely supports EBOOKS.
    for (const t of targets) {
      assert.ok(t.supportedCategories.includes('EBOOKS'));
    }
  });

  it('EBOOKS dealer cannot reach car platforms even with an explicit filter', () => {
    const targets = resolvePublishTargets('EBOOKS', AUTOMOTIVE_SLUGS);
    assert.deepEqual(targets, [], 'explicit car-platform filter must resolve to []');
  });

  it('a mixed filter keeps only the in-category slugs (intersection, not union)', () => {
    const targets = resolvePublishTargets('EBOOKS', ['cars-com', EBOOK_SLUG]);
    assert.deepEqual(targets.map(t => t.slug), [EBOOK_SLUG]);
  });

  it('a filter still narrows within the dealer category for automotive', () => {
    const targets = resolvePublishTargets('AUTOMOTIVE', ['cars-com']);
    assert.deepEqual(targets.map(t => t.slug), ['cars-com']);
  });

  it('unknown / absent category resolves to [] even with a filter', () => {
    assert.deepEqual(resolvePublishTargets(null, AUTOMOTIVE_SLUGS), []);
    assert.deepEqual(resolvePublishTargets(undefined), []);
    assert.deepEqual(resolvePublishTargets('NOT_A_REAL_CATEGORY', ['cars-com']), []);
  });
});
