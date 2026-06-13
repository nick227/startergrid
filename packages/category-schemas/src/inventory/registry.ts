import type {
  BusinessCategoryId,
  CategoryInventorySchema,
  InventoryReadinessRule,
  MediaGuide,
  MediaSlot,
} from '../types.js';
import { automotiveInventorySchema } from '../automotive/inventorySchema.js';
import { ebooksInventorySchema } from '../ebooks/inventorySchema.js';
import { songsInventorySchema } from '../songs/inventorySchema.js';
import { digitalArtInventorySchema } from '../digital_art/inventorySchema.js';
import { videoDistributionInventorySchema } from '../video_distribution/inventorySchema.js';

// ── Registry ──────────────────────────────────────────────────────────────────
// Add a CategoryInventorySchema here when a category is ready for
// CategoryInventoryItem-backed inventory (asset storage + ingress in place).

const CATEGORY_INVENTORY_REGISTRY: Partial<Record<BusinessCategoryId, CategoryInventorySchema>> = {
  AUTOMOTIVE: automotiveInventorySchema,
  EBOOKS: ebooksInventorySchema,
  SONGS: songsInventorySchema,
  DIGITAL_ART: digitalArtInventorySchema,
  VIDEO_DISTRIBUTION: videoDistributionInventorySchema,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

export function getCategoryInventorySchema(
  id: BusinessCategoryId,
): CategoryInventorySchema | undefined {
  return CATEGORY_INVENTORY_REGISTRY[id];
}

/** Returns the human-readable primary identifier label for a category.
 *  Callers should use this instead of hardcoding 'VIN', 'HIN', 'SKU', etc. */
export function getPrimaryIdentifierLabel(id: BusinessCategoryId): string {
  return CATEGORY_INVENTORY_REGISTRY[id]?.primaryIdentifier.label ?? 'ID';
}

/** Returns the readiness rules for a category (blocker + warning field rules). */
export function getRequiredReadinessFields(id: BusinessCategoryId): InventoryReadinessRule[] {
  return CATEGORY_INVENTORY_REGISTRY[id]?.readinessRules ?? [];
}

/** Returns the MediaGuide for a category, or undefined if not defined. */
export function getMediaGuide(id: BusinessCategoryId): MediaGuide | undefined {
  return CATEGORY_INVENTORY_REGISTRY[id]?.mediaGuide;
}

/** Returns slots from the media guide that have no matching key in assignedSlotKeys. */
export function getMissingMediaSlots(
  id: BusinessCategoryId,
  assignedSlotKeys: string[],
): MediaSlot[] {
  const guide = getMediaGuide(id);
  if (!guide) return [];
  const assigned = new Set(assignedSlotKeys);
  return guide.slots.filter(s => !assigned.has(s.key));
}

/** Returns only the minimum-publish-set slots that are missing. */
export function getMissingRequiredPublishSlots(
  id: BusinessCategoryId,
  assignedSlotKeys: string[],
): string[] {
  const guide = getMediaGuide(id);
  if (!guide) return [];
  const assigned = new Set(assignedSlotKeys);
  return guide.minimumPublishSet.filter(k => !assigned.has(k));
}
