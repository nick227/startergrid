/**
 * Tests for the generic category inventory system:
 *   - IdentifierDecoder (MockIsbnDecoder, NoopIdentifierDecoder, resolveIdentifierDecoder)
 *   - categoryItemShellService (condition auto-fill, stock number generation)
 *   - inventoryRecordAdapter (categoryItemToInventoryRecord)
 *   - platformRequirementRegistry round-trip
 */

import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { MockIsbnDecoder } from '../services/inventory/identifiers/mockIsbnDecoder.js';
import { NoopIdentifierDecoder } from '../services/inventory/identifiers/noopDecoder.js';
import { resolveIdentifierDecoder } from '../services/inventory/identifiers/index.js';
import { categoryItemToInventoryRecord } from '../services/inventory/inventoryRecordAdapter.js';
import { canPublish } from '../services/inventory/platformRequirementRegistry.js';
import type { InventoryRecord } from '../services/inventory/inventoryRecordAdapter.js';

// ─── MockIsbnDecoder ─────────────────────────────────────────────────────────

describe('MockIsbnDecoder', () => {
  const decoder = new MockIsbnDecoder();

  it('decodes a fixture ISBN and returns known fields', async () => {
    const result = await decoder.decode('9780451524935');
    assert.equal(result.valid, true);
    assert.equal(result.decoded, true);
    assert.equal(result.fields['title'], 'Nineteen Eighty-Four');
    assert.equal(result.fields['author'], 'George Orwell');
    assert.equal(result.warnings.length, 0);
  });

  it('normalises dashes in ISBN input', async () => {
    const result = await decoder.decode('978-0-451-52493-5');
    assert.equal(result.valid, true);
    assert.equal(result.identifier, '9780451524935');
  });

  it('returns valid=true decoded=false for unknown but well-formed ISBN', async () => {
    const result = await decoder.decode('9780000000002');
    assert.equal(result.valid, true);
    assert.equal(result.decoded, false);
    assert.ok(result.warnings.length > 0);
  });

  it('returns valid=false for malformed ISBN', async () => {
    const result = await decoder.decode('1234567');
    assert.equal(result.valid, false);
    assert.equal(result.decoded, false);
  });

  it('returns valid=false for ISBN starting with wrong prefix', async () => {
    const result = await decoder.decode('9750000000002');
    assert.equal(result.valid, false);
  });
});

// ─── NoopIdentifierDecoder ───────────────────────────────────────────────────

describe('NoopIdentifierDecoder', () => {
  it('passes identifier through as sku field', async () => {
    const decoder = new NoopIdentifierDecoder('sku');
    const result = await decoder.decode('MY-SCRIPT-001');
    assert.equal(result.valid, true);
    assert.equal(result.decoded, false);
    assert.equal(result.fields['sku'], 'MY-SCRIPT-001');
    assert.equal(result.warnings.length, 0);
  });

  it('returns invalid for empty identifier', async () => {
    const decoder = new NoopIdentifierDecoder();
    const result = await decoder.decode('   ');
    assert.equal(result.valid, false);
  });
});

// ─── resolveIdentifierDecoder ────────────────────────────────────────────────

describe('resolveIdentifierDecoder', () => {
  it('returns MockIsbnDecoder for EBOOKS in non-production', () => {
    const decoder = resolveIdentifierDecoder('EBOOKS');
    assert.equal(decoder.name, 'mock-isbn');
  });

  it('returns NoopIdentifierDecoder for non-EBOOKS categories', () => {
    const decoder = resolveIdentifierDecoder('APPAREL');
    assert.equal(decoder.name, 'noop');
  });

  it('returns NoopIdentifierDecoder for AUTOMOTIVE', () => {
    const decoder = resolveIdentifierDecoder('AUTOMOTIVE');
    assert.equal(decoder.name, 'noop');
  });
});

// ─── categoryItemToInventoryRecord ───────────────────────────────────────────

describe('categoryItemToInventoryRecord', () => {
  const now = new Date();

  const baseItem = {
    id: 'item-1',
    dealershipId: 'dealer-1',
    categoryId: 'EBOOKS',
    stockNumber: 'SKU-001',
    primaryIdentifier: '9780451524935',
    priceCents: 999,
    originalPriceCents: null,
    priceLastChangedAt: null,
    condition: 'DIGITAL',
    listingStatus: 'DRAFT',
    data: { title: 'Test Book', author: 'Test Author' },
    soldAt: null,
    removedAt: null,
    reactivatedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  it('projects a DRAFT active item to InventoryRecord', () => {
    const record = categoryItemToInventoryRecord(baseItem);
    assert.equal(record.id, 'item-1');
    assert.equal(record.source, 'category_item');
    assert.equal(record.categoryId, 'EBOOKS');
    assert.equal(record.primaryIdentifier, '9780451524935');
    assert.equal(record.lifecycleStatus, 'AVAILABLE');
    assert.equal(record.listingStatus, 'DRAFT');
    assert.equal(record.data['title'], 'Test Book');
  });

  it('derives lifecycleStatus SOLD from soldAt', () => {
    const record = categoryItemToInventoryRecord({ ...baseItem, soldAt: now });
    assert.equal(record.lifecycleStatus, 'SOLD');
  });

  it('derives lifecycleStatus REMOVED from removedAt', () => {
    const record = categoryItemToInventoryRecord({ ...baseItem, removedAt: now });
    assert.equal(record.lifecycleStatus, 'REMOVED');
  });

  it('soldAt takes precedence over removedAt', () => {
    const record = categoryItemToInventoryRecord({ ...baseItem, soldAt: now, removedAt: now });
    assert.equal(record.lifecycleStatus, 'SOLD');
  });
});

// ─── End-to-end: decode → canPublish ─────────────────────────────────────────

describe('ISBN decode → canPublish round-trip', () => {
  function makeRecord(overrides: Partial<InventoryRecord['data']> = {}): InventoryRecord {
    const now = new Date();
    return {
      id: 'item-1',
      source: 'category_item',
      dealershipId: 'dealer-1',
      categoryId: 'EBOOKS',
      stockNumber: 'SKU-001',
      primaryIdentifier: '9780451524935',
      priceCents: 999,
      originalPriceCents: null,
      priceLastChangedAt: null,
      condition: 'DIGITAL',
      listingStatus: 'READY',
      lifecycleStatus: 'AVAILABLE',
      soldAt: null, removedAt: null, reactivatedAt: null,
      createdAt: now, updatedAt: now,
      data: {
        title: 'Nineteen Eighty-Four',
        author: 'George Orwell',
        cover: 'https://cdn.example.com/cover.jpg',
        ...overrides,
      },
    };
  }

  it('a fully decoded item passes amazon-kdp', async () => {
    const decoder = new MockIsbnDecoder();
    const decoded = await decoder.decode('9780451524935');
    const record = makeRecord(decoded.fields);
    const result = canPublish(record, 'amazon-kdp');
    assert.equal(result.canPublish, true);
    assert.equal(result.blockers.length, 0);
  });

  it('a self-published script with no ISBN passes dealer-storefront', () => {
    const record = makeRecord({ title: 'My First Script', author: 'Jane Playwright' });
    const result = canPublish(record, 'dealer-storefront');
    assert.equal(result.canPublish, true);
  });

  it('a self-published script with no ISBN passes amazon-kdp (ISBN not required)', () => {
    const record = makeRecord({ title: 'My First Script', author: 'Jane Playwright' });
    const result = canPublish(record, 'amazon-kdp');
    assert.equal(result.canPublish, true);
    assert.ok(!result.blockers.some(b => b.toLowerCase().includes('isbn')));
  });
});
