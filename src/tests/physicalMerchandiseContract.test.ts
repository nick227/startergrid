import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { isDigitalSongRelease, isPhysicalRecordMerchandise } from '../../packages/category-schemas/src/index.js';
import { categoryItemEligible } from '../services/marketplace/listingIdentity.js';

function item(overrides: Record<string, unknown> = {}) {
  return {
    categoryId: 'APPAREL',
    condition: 'VINTAGE',
    priceCents: 6500,
    stockNumber: 'ME-VINTAGE-1',
    primaryIdentifier: 'DENIM-JACKET',
    listingStatus: 'READY',
    soldAt: null,
    removedAt: null,
    data: { title: 'Denim jacket', brand: 'Demo Vintage', size: 'M', color: 'Indigo', material: 'Denim', era: '1990' },
    dealership: { businessCategory: 'APPAREL' },
    media: [],
    ...overrides,
  };
}

describe('physical merchandise publication', () => {
  it('accepts a complete vintage garment and rejects a garment missing size', () => {
    assert.equal(categoryItemEligible(item()), true);
    assert.equal(categoryItemEligible(item({ data: { title: 'Wool coat', brand: 'Demo Vintage', size: '' } })), false);
  });

  it('publishes a vinyl record without treating it as a digital song', () => {
    const vinyl = item({
      categoryId: 'SONGS',
      condition: 'USED',
      data: { title: 'Harbor Sessions', artist: 'Demo Quartet', format: 'Vinyl LP', catalogNumber: 'DG-LP-001' },
      dealership: { businessCategory: 'SONGS' },
    });
    assert.equal(isPhysicalRecordMerchandise('USED', vinyl.data as Record<string, unknown>), true);
    assert.equal(categoryItemEligible(vinyl), true);
    assert.equal(categoryItemEligible(item({
      categoryId: 'SONGS',
      condition: 'DIGITAL',
      data: { title: 'Harbor Sessions', artist: 'Demo Quartet', format: 'Digital Album', isrc: 'US-DG1-26-00001' },
      dealership: { businessCategory: 'SONGS' },
    })), false);
    assert.equal(isDigitalSongRelease('DIGITAL', { format: 'Digital Album' }), true);
  });
});
