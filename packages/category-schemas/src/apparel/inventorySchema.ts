import type { CategoryInventorySchema } from '../types.js';

/** One physical garment per SKU. No VIN, mileage, digital format or fulfillment fiction. */
export const apparelInventorySchema: CategoryInventorySchema = {
  categoryId: 'APPAREL', schemaVersion: '1.0.0', strictFieldValidation: true,
  validConditionValues: ['NEW', 'USED', 'VINTAGE'],
  primaryIdentifier: { fieldKey: 'sku', label: 'SKU' },
  externalIdentifiers: [{ fieldKey: 'barcode', label: 'Barcode', helpText: 'Optional manufacturer barcode; the seller SKU identifies this garment.' }],
  displayFields: {
    browseRow: ['title', 'brand', 'size', 'condition', 'priceCents'],
    detailHeader: ['sku', 'title', 'brand', 'size', 'condition', 'color', 'material', 'era', 'priceCents'],
  },
  importFields: [
    { fieldKey: 'sku', label: 'SKU', kind: 'identifier', requiredLevel: 'REQUIRED', displayPriority: 100, importAliases: ['sku', 'stock number'] },
    { fieldKey: 'title', label: 'Title', kind: 'text', requiredLevel: 'REQUIRED', displayPriority: 95, importAliases: ['title', 'item', 'description'] },
    { fieldKey: 'brand', label: 'Brand', kind: 'text', requiredLevel: 'RECOMMENDED', displayPriority: 90, importAliases: ['brand', 'label'] },
    { fieldKey: 'size', label: 'Size', kind: 'text', requiredLevel: 'REQUIRED', displayPriority: 85, importAliases: ['size', 'label size'] },
    { fieldKey: 'condition', label: 'Condition', kind: 'enum', requiredLevel: 'REQUIRED', displayPriority: 80, importAliases: ['condition'] },
    { fieldKey: 'priceCents', label: 'Price', kind: 'currency', requiredLevel: 'REQUIRED', displayPriority: 75, importAliases: ['price'], validation: { min: 1 } },
    ...['color', 'material', 'era', 'measurements', 'conditionNotes'].map(fieldKey => ({ fieldKey, label: fieldKey, kind: 'text' as const, requiredLevel: 'OPTIONAL' as const, displayPriority: 50, importAliases: [fieldKey] })),
  ],
  attributeGroups: [
    { key: 'garment', label: 'Garment', fieldKeys: ['sku', 'title', 'brand', 'size', 'color', 'material', 'era', 'measurements'] },
    { key: 'condition', label: 'Condition', fieldKeys: ['condition', 'conditionNotes', 'priceCents'] },
  ],
  readinessRules: [
    { fieldKey: 'stockNumber', severity: 'BLOCKER', message: 'SKU is required' },
    { fieldKey: 'title', severity: 'BLOCKER', message: 'Garment title is required' },
    { fieldKey: 'size', severity: 'BLOCKER', message: 'Size is required (use One Size where appropriate)' },
    { fieldKey: 'condition', severity: 'BLOCKER', message: 'Condition is required' },
    { fieldKey: 'priceCents', severity: 'BLOCKER', message: 'A positive price is required' },
  ],
};
