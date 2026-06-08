import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { cardDistanceMiles, haversineMiles } from '../lib/geo/haversine.js';

const AUSTIN_LAT = 30.2672;
const AUSTIN_LNG = -97.7431;
const FORT_LAUDERDALE_LAT = 26.1224;
const FORT_LAUDERDALE_LNG = -80.1373;

describe('haversineMiles', () => {
  it('returns 0 for identical coordinates', () => {
    assert.equal(haversineMiles(AUSTIN_LAT, AUSTIN_LNG, AUSTIN_LAT, AUSTIN_LNG), 0);
  });

  it('returns a positive distance for known city pairs', () => {
    const miles = haversineMiles(AUSTIN_LAT, AUSTIN_LNG, FORT_LAUDERDALE_LAT, FORT_LAUDERDALE_LNG);
    assert.ok(miles > 1000 && miles < 1200);
  });
});

describe('cardDistanceMiles', () => {
  it('omits distance when buyer coords are missing', () => {
    assert.equal(cardDistanceMiles(undefined, undefined, AUSTIN_LAT, AUSTIN_LNG), undefined);
  });

  it('omits distance when seller coords are missing', () => {
    assert.equal(cardDistanceMiles(AUSTIN_LAT, AUSTIN_LNG, null, null), undefined);
  });

  it('returns rounded whole miles when both sides are present', () => {
    assert.equal(cardDistanceMiles(AUSTIN_LAT, AUSTIN_LNG, AUSTIN_LAT, AUSTIN_LNG), 0);
    const miles = cardDistanceMiles(AUSTIN_LAT, AUSTIN_LNG, FORT_LAUDERDALE_LAT, FORT_LAUDERDALE_LNG);
    assert.equal(typeof miles, 'number');
    assert.ok(miles! > 1000);
  });
});
