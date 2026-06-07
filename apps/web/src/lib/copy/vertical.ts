import { operatorCopy } from './operator.ts';

/** Vertical-specific label overrides — inventory fields, trigger verbs, etc. */
export type VerticalCopyAdapter = {
  id: string;
  /** Override triggerKind → task action label (e.g. SOLD → "Sold" for automotive). */
  taskActionOverrides: Partial<Record<string, string>>;
  inventory: {
    refColumn: string;
    titleColumn: string;
    searchPlaceholder: string;
    invalidIdentifierLabel: string;
    canonicalRef: string;
    canonicalId: string;
    /** Backend field path for identifier-failure issues. Empty string = no check. */
    idFieldKey: string;
    /** Usage column label from category schema (Mileage, Hours, etc.). */
    mileageLabel?: string;
  };
};

export const genericVertical: VerticalCopyAdapter = {
  id: 'generic',
  taskActionOverrides: {},
  inventory: {
    refColumn: operatorCopy.asset.refLabel,
    titleColumn: 'Asset',
    searchPlaceholder: 'Search ref #, title…',
    invalidIdentifierLabel: 'Invalid identifier',
    canonicalRef: 'Ref number',
    canonicalId: 'Identifier',
    idFieldKey: '',
  },
};

/** Automotive v1 — field labels when vertical-specific UI is enabled. */
export const automotiveVertical: VerticalCopyAdapter = {
  id: 'automotive',
  taskActionOverrides: {
    SOLD: 'Sold',
  },
  inventory: {
    refColumn: 'Stock #',
    titleColumn: 'Vehicle',
    searchPlaceholder: 'Search stock #, VIN, make, model…',
    invalidIdentifierLabel: 'Invalid VIN',
    canonicalRef: 'Stock number',
    canonicalId: 'VIN',
    idFieldKey: 'vin',
  },
};
