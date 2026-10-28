import { resolveCategorySchema } from '@auto-dealer/category-schemas';
import { describe, expect, it } from 'vitest';
import {
  comparableAgingNote,
  gridColumnVisible,
  inventoryWorkspaceLabel,
  showsAutomotiveComparables,
  usageDisplay,
  usesVehicleIdentifier,
} from './categoryPresentation.ts';

const categories = ['AUTOMOTIVE', 'EBOOKS', 'SONGS', 'APPAREL', 'BOATS'] as const;

describe('category presentation', () => {
  it('names the inventory workspace from the schema', () => {
    expect(inventoryWorkspaceLabel(resolveCategorySchema('AUTOMOTIVE'))).toBe('Vehicles');
    expect(inventoryWorkspaceLabel(resolveCategorySchema('EBOOKS'))).toBe('Ebooks');
    expect(inventoryWorkspaceLabel(resolveCategorySchema('SONGS'))).toBe('Releases');
    expect(inventoryWorkspaceLabel(resolveCategorySchema('APPAREL'))).toBe('Inventory');
    expect(inventoryWorkspaceLabel(resolveCategorySchema('BOATS'))).toBe('Boats');
  });

  it('keeps VIN tools and mileage comparables on automotive only', () => {
    for (const id of categories) {
      const schema = resolveCategorySchema(id);
      expect(usesVehicleIdentifier(schema)).toBe(id === 'AUTOMOTIVE');
      expect(showsAutomotiveComparables(schema)).toBe(id === 'AUTOMOTIVE');
    }
  });

  it('hides mileage on apparel and formats boat hours without miles', () => {
    expect(gridColumnVisible(resolveCategorySchema('APPAREL'), 'mileage')).toBe(false);
    expect(gridColumnVisible(resolveCategorySchema('BOATS'), 'mileage')).toBe(true);
    expect(usageDisplay(resolveCategorySchema('BOATS'), 80)).toBe('80 hrs');
    expect(usageDisplay(resolveCategorySchema('AUTOMOTIVE'), 12000)).toBe('12,000 mi');
    expect(comparableAgingNote(resolveCategorySchema('EBOOKS'))).toMatch(/not available/i);
    expect(comparableAgingNote(resolveCategorySchema('AUTOMOTIVE'))).toBeNull();
  });
});
