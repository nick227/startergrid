import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { canPublish, getRegisteredPlatformSlugs } from '../services/inventory/platformRequirementRegistry.js';
import type { InventoryRecord } from '../services/inventory/inventoryRecordAdapter.js';

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeEbookItem(overrides: Partial<InventoryRecord['data']> = {}, topLevel: Partial<InventoryRecord> = {}): InventoryRecord {
  return {
    id: 'item-1',
    source: 'category_item',
    dealershipId: 'dealer-1',
    categoryId: 'EBOOKS',
    stockNumber: 'SKU-001',
    primaryIdentifier: 'SKU-001',
    priceCents: 999,
    originalPriceCents: null,
    priceLastChangedAt: null,
    condition: 'DIGITAL',
    listingStatus: 'READY',
    lifecycleStatus: 'AVAILABLE',
    soldAt: null,
    removedAt: null,
    reactivatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    data: {
      title: 'A Great Script',
      author: 'Jane Author',
      publisher: 'Self Published',
      format: 'EPUB',
      cover: 'https://cdn.example.com/cover.jpg',
      ...overrides,
    },
    ...topLevel,
  };
}

function makeVehicleItem(overrides: Partial<InventoryRecord> = {}): InventoryRecord {
  return {
    id: 'v-1',
    source: 'vehicle',
    dealershipId: 'dealer-1',
    categoryId: 'AUTOMOTIVE',
    stockNumber: 'LS-001',
    primaryIdentifier: '1HGBH41JXMN109186',
    priceCents: 2499500,
    originalPriceCents: null,
    priceLastChangedAt: null,
    condition: 'USED',
    listingStatus: 'READY',
    lifecycleStatus: 'AVAILABLE',
    soldAt: null,
    removedAt: null,
    reactivatedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    data: {
      vin: '1HGBH41JXMN109186',
      year: 2021, make: 'Toyota', model: 'Camry',
      mileage: 15000, exteriorColor: 'White',
    },
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('canPublish — unknown platform', () => {
  it('is permissive for unregistered platform+category', () => {
    const result = canPublish(makeEbookItem(), 'nonexistent-platform');
    assert.equal(result.canPublish, true);
    assert.equal(result.blockers.length, 0);
    assert.equal(result.warnings.length, 0);
  });
});

describe('canPublish — dealer-storefront', () => {
  it('passes a complete ebook with no additional requirements', () => {
    const result = canPublish(makeEbookItem(), 'dealer-storefront');
    assert.equal(result.canPublish, true);
    assert.equal(result.blockers.length, 0);
  });

  it('passes an ebook with no ISBN (storefront has no ISBN requirement)', () => {
    const result = canPublish(makeEbookItem({ isbn: undefined }), 'dealer-storefront');
    assert.equal(result.canPublish, true);
  });

  it('passes a vehicle with no additional requirements', () => {
    const result = canPublish(makeVehicleItem(), 'dealer-storefront');
    assert.equal(result.canPublish, true);
  });
});

describe('canPublish — amazon-kdp', () => {
  it('passes a complete ebook', () => {
    const result = canPublish(makeEbookItem(), 'amazon-kdp');
    assert.equal(result.canPublish, true);
    assert.equal(result.blockers.length, 0);
  });

  it('blocks when title is missing', () => {
    const result = canPublish(makeEbookItem({ title: '' }), 'amazon-kdp');
    assert.equal(result.canPublish, false);
    assert.ok(result.blockers.some(b => b.includes('title')));
  });

  it('blocks when author is missing', () => {
    const result = canPublish(makeEbookItem({ author: null as unknown as string }), 'amazon-kdp');
    assert.equal(result.canPublish, false);
    assert.ok(result.blockers.some(b => b.includes('author')));
  });

  it('warns but does not block when cover is missing', () => {
    const result = canPublish(makeEbookItem({ cover: undefined }), 'amazon-kdp');
    assert.equal(result.canPublish, true);
    assert.equal(result.blockers.length, 0);
    assert.ok(result.warnings.some(w => w.toLowerCase().includes('cover')));
  });

  it('does NOT require ISBN — ebook-only digital uploads are allowed without one', () => {
    const result = canPublish(makeEbookItem({ isbn: undefined }), 'amazon-kdp');
    assert.equal(result.canPublish, true);
    assert.ok(!result.blockers.some(b => b.toLowerCase().includes('isbn')));
  });

  it('is permissive for unregistered category (automotive on kdp)', () => {
    const result = canPublish(makeVehicleItem(), 'amazon-kdp');
    assert.equal(result.canPublish, true);
  });
});

describe('canPublish — draft2digital', () => {
  it('passes a complete ebook', () => {
    const result = canPublish(makeEbookItem(), 'draft2digital');
    assert.equal(result.canPublish, true);
    assert.equal(result.blockers.length, 0);
  });

  it('blocks when author is missing', () => {
    const result = canPublish(makeEbookItem({ author: '' }), 'draft2digital');
    assert.equal(result.canPublish, false);
  });

  it('warns when cover is missing', () => {
    const result = canPublish(makeEbookItem({ cover: undefined }), 'draft2digital');
    assert.equal(result.canPublish, true);
    assert.ok(result.warnings.some(w => w.toLowerCase().includes('cover')));
  });

  it('warns when publisher is missing', () => {
    const result = canPublish(makeEbookItem({ publisher: undefined }), 'draft2digital');
    assert.equal(result.canPublish, true);
    assert.ok(result.warnings.some(w => w.toLowerCase().includes('publisher')));
  });
});

describe('canPublish — smashwords', () => {
  it('passes a complete ebook', () => {
    const result = canPublish(makeEbookItem(), 'smashwords');
    assert.equal(result.canPublish, true);
  });

  it('blocks on missing title', () => {
    const result = canPublish(makeEbookItem({ title: undefined }), 'smashwords');
    assert.equal(result.canPublish, false);
  });

  it('warns on missing cover', () => {
    const result = canPublish(makeEbookItem({ cover: undefined }), 'smashwords');
    assert.equal(result.canPublish, true);
    assert.ok(result.warnings.length > 0);
  });
});

describe('getRegisteredPlatformSlugs', () => {
  it('returns registered ebook platforms', () => {
    const slugs = getRegisteredPlatformSlugs('EBOOKS');
    assert.ok(slugs.includes('dealer-storefront'));
    assert.ok(slugs.includes('amazon-kdp'));
    assert.ok(slugs.includes('draft2digital'));
    assert.ok(slugs.includes('smashwords'));
  });

  it('returns registered automotive platforms', () => {
    const slugs = getRegisteredPlatformSlugs('AUTOMOTIVE');
    assert.ok(slugs.includes('dealer-storefront'));
  });
});
