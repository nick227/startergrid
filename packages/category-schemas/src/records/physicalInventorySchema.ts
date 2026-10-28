import type { CategoryInventorySchema } from '../types.js';

/** Physical music merchandise. Not the digital SONGS distribution contract. */
export const PHYSICAL_RECORD_FORMATS = ['Vinyl LP', 'CD', 'Cassette', '7-inch'] as const;

export function isDigitalSongRelease(
  condition: string | null | undefined,
  data: Record<string, unknown>,
): boolean {
  if (condition === 'DIGITAL') return true;
  const format = String(data.format ?? '').toLowerCase();
  return format.includes('digital') || format === 'stream' || format === 'download';
}

export function isPhysicalRecordMerchandise(
  condition: string | null | undefined,
  data: Record<string, unknown>,
): boolean {
  if (isDigitalSongRelease(condition, data)) return false;
  return (PHYSICAL_RECORD_FORMATS as readonly string[]).includes(String(data.format ?? ''));
}

export const physicalRecordsInventorySchema: CategoryInventorySchema = {
  categoryId: 'SONGS',
  schemaVersion: '1.0.0',
  validConditionValues: ['NEW', 'USED', 'VINTAGE'],
  primaryIdentifier: { fieldKey: 'catalogNumber', label: 'Catalog number' },
  externalIdentifiers: [],
  displayFields: {
    browseRow: ['title', 'artist', 'format', 'condition', 'priceCents'],
    detailHeader: ['catalogNumber', 'title', 'artist', 'format', 'label', 'condition', 'priceCents'],
  },
  importFields: [
    { fieldKey: 'title', label: 'Title', kind: 'text', requiredLevel: 'REQUIRED', displayPriority: 100, importAliases: ['title'] },
    { fieldKey: 'artist', label: 'Artist', kind: 'text', requiredLevel: 'REQUIRED', displayPriority: 95, importAliases: ['artist'] },
    { fieldKey: 'format', label: 'Format', kind: 'enum', requiredLevel: 'REQUIRED', displayPriority: 90, importAliases: ['format'] },
    { fieldKey: 'condition', label: 'Condition', kind: 'enum', requiredLevel: 'REQUIRED', displayPriority: 80, importAliases: ['condition'] },
    { fieldKey: 'priceCents', label: 'Price', kind: 'currency', requiredLevel: 'REQUIRED', displayPriority: 75, importAliases: ['price'], validation: { min: 1 } },
    { fieldKey: 'catalogNumber', label: 'Catalog number', kind: 'identifier', requiredLevel: 'OPTIONAL', displayPriority: 70, importAliases: ['catalog number', 'cat no'] },
    { fieldKey: 'label', label: 'Label', kind: 'text', requiredLevel: 'OPTIONAL', displayPriority: 60, importAliases: ['label'] },
  ],
  attributeGroups: [
    { key: 'record', label: 'Record', fieldKeys: ['title', 'artist', 'format', 'catalogNumber', 'label'] },
    { key: 'condition', label: 'Condition', fieldKeys: ['condition', 'priceCents'] },
  ],
  readinessRules: [
    { fieldKey: 'stockNumber', severity: 'BLOCKER', message: 'SKU is required' },
    { fieldKey: 'title', severity: 'BLOCKER', message: 'Title is required' },
    { fieldKey: 'artist', severity: 'BLOCKER', message: 'Artist is required' },
    { fieldKey: 'format', severity: 'BLOCKER', message: 'A physical format is required' },
    { fieldKey: 'condition', severity: 'BLOCKER', message: 'Condition is required' },
    { fieldKey: 'priceCents', severity: 'BLOCKER', message: 'A positive price is required' },
  ],
};
