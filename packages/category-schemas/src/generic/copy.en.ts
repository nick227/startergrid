import type {
  CategoryAssetLabels,
  CategoryChannelLabels,
  CategoryCopyBundle,
  CategoryLifecycleLabels,
  CategoryPerformanceLabels,
  CategoryReadinessLabels,
} from '../types.js';

/** Generic fallback labels — used by placeholder categories and unknown fallback. */
export const genericAsset: CategoryAssetLabels = {
  singular: 'asset',
  plural: 'assets',
  refLabel: 'Ref #',
  idLabel: 'Identifier',
  titleLabel: 'Asset',
  idFieldKey: '',
};

export const genericChannel: CategoryChannelLabels = {
  singular: 'channel',
  plural: 'channels',
};

export const genericCopy: CategoryCopyBundle = {
  inventoryTitle: 'Inventory',
  inventorySubtitle: 'Import assets, fix blockers, then publish to channels.',
  searchPlaceholder: 'Search ref #, title…',
  refColumn: 'Ref #',
  titleColumn: 'Asset',
  invalidIdentifierLabel: 'Invalid identifier',
};

export const genericLifecycle: CategoryLifecycleLabels = {
  active: 'Active',
  sold: 'Sold',
  removed: 'Removed',
};

export const genericReadiness: CategoryReadinessLabels = {
  ready: 'Ready to list',
  warning: 'Needs review',
  blocked: "Can't go live",
};

export const genericPerformance: CategoryPerformanceLabels = {
  movementLabel: 'Movement',
  benchmarksLabel: 'Benchmarks',
};
