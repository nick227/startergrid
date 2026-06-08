import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  minPriceCentsForCategory,
  minPriceCentsForPlatform,
} from '../lib/categoryPricePolicy.js';

describe('minPriceCentsForCategory', () => {
  it('AUTOMOTIVE uses $1,000 floor', () => {
    assert.equal(minPriceCentsForCategory('AUTOMOTIVE'), 100_000);
  });

  it('digital distribution categories have no floor', () => {
    for (const category of ['SONGS', 'EBOOKS', 'DIGITAL_ART', 'VIDEO_DISTRIBUTION']) {
      assert.equal(minPriceCentsForCategory(category), null, category);
    }
  });

  it('VACATION_RENTALS and APARTMENTS have no floor (rate-based)', () => {
    assert.equal(minPriceCentsForCategory('VACATION_RENTALS'), null);
    assert.equal(minPriceCentsForCategory('APARTMENTS'), null);
  });

  it('general merchandise uses $10 floor', () => {
    assert.equal(minPriceCentsForCategory('APPAREL'), 1_000);
    assert.equal(minPriceCentsForCategory('SNEAKERS'), 1_000);
  });

  it('HEAVY_EQUIPMENT uses $1,000 floor', () => {
    assert.equal(minPriceCentsForCategory('HEAVY_EQUIPMENT'), 100_000);
  });
});

describe('minPriceCentsForPlatform', () => {
  it('returns null when any supported category has no floor', () => {
    assert.equal(
      minPriceCentsForPlatform(['AUTOMOTIVE', 'TRAILERS_POWERSPORTS_RV', 'BOATS']),
      100_000,
    );
    assert.equal(
      minPriceCentsForPlatform(['APPAREL', 'SONGS']),
      null,
    );
  });
});
