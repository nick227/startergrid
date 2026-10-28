import type { CategorySchema } from '@auto-dealer/category-schemas';
import { getActiveCategorySchema } from './copy/activeCategoryCopy.ts';

/** Inventory workspace name from category copy. Generic "items" uses the schema inventory title. */
export function inventoryWorkspaceLabel(schema: CategorySchema): string {
  if (schema.asset.plural === 'items') return schema.copy.inventoryTitle;
  return capitalize(schema.asset.plural);
}

/** VIN decode, window stickers, and mileage comparables belong to the automotive identifier. */
export function usesVehicleIdentifier(schema: CategorySchema): boolean {
  return schema.asset.idLabel === 'VIN';
}

export function showsAutomotiveComparables(schema: CategorySchema): boolean {
  return schema.fields.some(field => field.key === 'mileage' && field.label === 'Mileage');
}

export function schemaHasField(schema: CategorySchema, key: string): boolean {
  return schema.fields.some(field => field.key === key);
}

export function fieldLabel(schema: CategorySchema, key: string, fallback: string): string {
  return schema.fields.find(field => field.key === key)?.label ?? fallback;
}

/** Singular asset name for the open business. Falls back to vehicle when no category is active. */
export function activeAssetSingular(): string {
  return getActiveCategorySchema()?.asset.singular ?? 'vehicle';
}

export function businessNoun(schema: CategorySchema): 'dealership' | 'business' {
  return usesVehicleIdentifier(schema) ? 'dealership' : 'business';
}

export function usageDisplay(schema: CategorySchema, value: number): string | null {
  const field = schema.fields.find(item => item.key === 'mileage');
  if (!field || value <= 0) return null;
  const suffix = field.label === 'Mileage' ? ' mi' : field.label === 'Hours' ? ' hrs' : '';
  return `${value.toLocaleString()}${suffix}`;
}

/** Null when this category should show automotive comparable aging. */
export function comparableAgingNote(schema: CategorySchema): string | null {
  if (showsAutomotiveComparables(schema)) return null;
  const usage = schema.fields.find(field => field.key === 'mileage');
  if (!usage) return 'Comparable aging is not available for this category.';
  return `${usage.label} is stored on the record. Similar-vehicle aging is not available for this category.`;
}

const GRID_FIELD_KEY: Record<string, string> = {
  vin: 'vin',
  mileage: 'mileage',
  year: 'year',
  make: 'make',
  model: 'model',
  trim: 'trim',
  color: 'exteriorColor',
  condition: 'condition',
};

export function gridColumnVisible(schema: CategorySchema, columnKey: string): boolean {
  const fieldKey = GRID_FIELD_KEY[columnKey];
  if (!fieldKey) return true;
  return schemaHasField(schema, fieldKey);
}

export function gridColumnLabel(schema: CategorySchema, columnKey: string, fallback: string): string {
  if (columnKey === 'daysOnline' && !showsAutomotiveComparables(schema)) return schema.performance.movementLabel;
  if (columnKey === 'stockNumber') return schema.asset.refLabel;
  const fieldKey = GRID_FIELD_KEY[columnKey];
  if (!fieldKey) return fallback;
  return fieldLabel(schema, fieldKey, fallback);
}

function capitalize(word: string): string {
  return word.charAt(0).toUpperCase() + word.slice(1);
}
