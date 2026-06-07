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
  };
};

export const genericVertical: VerticalCopyAdapter = {
  id: 'generic',
  taskActionOverrides: {},
  inventory: {
    refColumn: operatorCopy.asset.refLabel,
    titleColumn: 'Asset',
    searchPlaceholder: 'Search ref #, title, channel…',
  },
};

/** Automotive v1 — use only where vertical-specific labels are intentional. */
export const automotiveVertical: VerticalCopyAdapter = {
  id: 'automotive',
  taskActionOverrides: {
    SOLD: 'Sold',
  },
  inventory: {
    refColumn: 'Stock #',
    titleColumn: 'Vehicle',
    searchPlaceholder: 'Search stock #, VIN, make, model…',
  },
};
