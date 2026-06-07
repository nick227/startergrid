import { describe, expect, it } from 'vitest';
import { genericVertical } from '@/lib/copy/vertical.ts';
import { inventoryLabels, setActiveCategorySchema, taskActionLabel } from '@/lib/copy/activeCategoryCopy.ts';
import { verticalAdapterFromCategorySchema } from '@/lib/copy/verticalFromSchema.ts';
import type { CategorySchema } from '@auto-dealer/category-schemas';

const automotiveSchema: CategorySchema = {
  id: 'AUTOMOTIVE',
  status: 'active',
  label: 'Automotive',
  copy: {
    inventoryTitle: 'Inventory',
    inventorySubtitle: '',
    searchPlaceholder: 'Search stock #, VIN, make, model…',
    refColumn: 'Stock #',
    titleColumn: 'Vehicle',
    invalidIdentifierLabel: 'Invalid VIN',
  },
  asset: {
    singular: 'vehicle',
    plural: 'vehicles',
    refLabel: 'Stock #',
    idLabel: 'VIN',
    titleLabel: 'Vehicle',
  },
  channel: { singular: 'channel', plural: 'channels' },
  fields: [],
  lifecycle: { active: 'Active', sold: 'Sold', removed: 'Removed' },
  readiness: { ready: 'Ready', warning: 'Needs review', blocked: 'Blocked' },
  performance: { movementLabel: 'Movement', benchmarksLabel: 'Benchmarks' },
  formatters: { assetLead: () => '', assetMeta: () => '' },
  marketplace: { slug: 'automotive', consumerEnabled: true, tagline: '' },
};

const songsSchema: CategorySchema = {
  ...automotiveSchema,
  id: 'SONGS',
  status: 'placeholder',
  label: 'Songs',
  copy: {
    ...automotiveSchema.copy,
    refColumn: 'Ref #',
    titleColumn: 'Asset',
    searchPlaceholder: 'Search ref #, title…',
    invalidIdentifierLabel: 'Invalid identifier',
  },
  asset: {
    singular: 'asset',
    plural: 'assets',
    refLabel: 'Ref #',
    idLabel: 'Identifier',
    titleLabel: 'Asset',
  },
};

describe('verticalAdapterFromCategorySchema', () => {
  it('maps automotive schema to Stock # / VIN labels', () => {
    const adapter = verticalAdapterFromCategorySchema(automotiveSchema);
    expect(adapter.inventory.refColumn).toBe('Stock #');
    expect(adapter.inventory.canonicalId).toBe('VIN');
    expect(adapter.taskActionOverrides.SOLD).toBe('Sold');
  });

  it('uses generic ref labels for placeholder categories', () => {
    const adapter = verticalAdapterFromCategorySchema(songsSchema);
    expect(adapter.inventory.refColumn).toBe('Ref #');
    expect(adapter.taskActionOverrides.SOLD).toBeUndefined();
  });

  it('uses schema asset labels for canonical fields', () => {
    const adapter = verticalAdapterFromCategorySchema(automotiveSchema);
    expect(adapter.inventory.canonicalRef).toBe('Stock #');
    expect(adapter.inventory.canonicalId).toBe('VIN');
  });

  it('uses generic ref column for placeholder categories', () => {
    const adapter = verticalAdapterFromCategorySchema(songsSchema);
    expect(adapter.inventory.refColumn).toBe(genericVertical.inventory.refColumn);
  });
});

describe('setActiveCategorySchema', () => {
  it('updates inventoryLabels and taskActionLabel for active org', () => {
    setActiveCategorySchema(automotiveSchema);
    expect(inventoryLabels().searchPlaceholder).toContain('VIN');
    expect(taskActionLabel('SOLD')).toBe('Sold');

    setActiveCategorySchema(songsSchema);
    expect(inventoryLabels().refColumn).toBe('Ref #');
    expect(taskActionLabel('SOLD')).toBe('Delist');
  });
});
