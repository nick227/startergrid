import test from 'node:test';
import assert from 'node:assert/strict';
import { categoryInventorySource, resolveCategorySchema } from '../../packages/category-schemas/src/index.js';
import { categoryItemEligible } from '../services/marketplace/listingIdentity.js';
import { categoryItemReadiness } from '../services/inventory/publicationContract.js';

const garment = {
  categoryId: 'APPAREL', stockNumber: 'HV-001', primaryIdentifier: null,
  condition: 'VINTAGE', priceCents: 6500, listingStatus: 'READY', soldAt: null, removedAt: null,
  dealership: { businessCategory: 'APPAREL' }, media: [],
  data: { title: 'Denim jacket', brand: 'Demo Vintage', size: 'M', color: 'Indigo', material: 'Denim', era: '1990s' },
};
test('apparel is physical native inventory, with an enabled Marketplace', () => {
  assert.equal(resolveCategorySchema('APPAREL').lifecycleMode, 'physical_inventory');
  assert.equal(categoryInventorySource('APPAREL'), 'category_item');
  assert.equal(resolveCategorySchema('APPAREL').marketplace.consumerEnabled, true);
  assert.equal(categoryInventorySource('BOATS'), 'vehicle');
  assert.equal(categoryInventorySource('AUTOMOTIVE'), 'vehicle');
  assert.equal(categoryItemEligible(garment), true);
  assert.notEqual(categoryItemReadiness(garment).status, 'BLOCKED');
});
test('native apparel readiness rejects missing or malformed size/title/condition/price and wrong sellers', () => {
  for (const value of ['', '   ', 42, null]) {
    for (const field of ['title', 'size']) {
      const item = { ...garment, data: { ...garment.data, [field]: value } };
      assert.equal(categoryItemEligible(item), false, `${field}=${String(value)}`);
      assert.equal(categoryItemReadiness(item).status, 'BLOCKED');
    }
  }
  assert.equal(categoryItemEligible({ ...garment, condition: 'DIGITAL' }), false);
  assert.equal(categoryItemEligible({ ...garment, priceCents: 0 }), false);
  assert.equal(categoryItemEligible({ ...garment, soldAt: new Date() }), false);
  assert.equal(categoryItemEligible({ ...garment, dealership: { businessCategory: 'EBOOKS' } }), false);
});
