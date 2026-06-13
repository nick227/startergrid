import type { BusinessCategoryId } from '@auto-dealer/category-schemas';
import type { InventoryRecord } from './inventoryRecordAdapter.js';

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlatformPublishResult = {
  canPublish: boolean;
  blockers: string[];
  warnings: string[];
};

type PlatformRequirementRule = {
  fieldKey: string;
  severity: 'BLOCKER' | 'WARNING';
  message: string;
  /** When provided, rule only fires if this returns true for the item. */
  applies?: (item: InventoryRecord) => boolean;
};

type PlatformCategoryRequirements = {
  platformSlug: string;
  categoryId: BusinessCategoryId;
  rules: PlatformRequirementRule[];
};

// ─── Registry ─────────────────────────────────────────────────────────────────
//
// Each entry covers one platform + category pair.
// Unregistered combinations are permissive: { canPublish: true, blockers: [], warnings: [] }.
//
// Rules evaluate against the flat InventoryRecord fields and data JSON.
// field resolution order: top-level InventoryRecord fields first, then data keys.
//
// Scope note: distributionFormat (EPUB vs POD paperback vs hardcover) is out of
// scope for v1. All EBOOKS entries cover digital ebook publishing only.
// Print-on-demand format requirements (IngramSpark ISBN rules, etc.) are a
// future expansion — add a distributionFormat parameter to canPublish at that point.

const PLATFORM_REQUIREMENTS: PlatformCategoryRequirements[] = [

  // ── Dealer Storefront (all categories) ─────────────────────────────────────
  // Storefront defers entirely to base readiness — no additional requirements.
  // Registered explicitly so callers can treat storefront symmetrically with
  // external platforms without special-casing it.
  {
    platformSlug: 'dealer-storefront',
    categoryId: 'AUTOMOTIVE',
    rules: [],
  },
  {
    platformSlug: 'dealer-storefront',
    categoryId: 'EBOOKS',
    rules: [],
  },

  // ── Amazon KDP (digital ebook only) ─────────────────────────────────────────
  // ISBN is not required for KDP ebook uploads — KDP assigns its own ASIN.
  // Cover is strongly recommended (bad listing quality without it) but KDP
  // will accept a submission without one.
  {
    platformSlug: 'amazon-kdp',
    categoryId: 'EBOOKS',
    rules: [
      { fieldKey: 'title',  severity: 'BLOCKER', message: 'KDP requires a title' },
      { fieldKey: 'author', severity: 'BLOCKER', message: 'KDP requires an author' },
      { fieldKey: 'cover',  severity: 'WARNING',  message: 'Cover image is strongly recommended for KDP listings' },
    ],
  },

  // ── Draft2Digital ────────────────────────────────────────────────────────────
  // Aggregator distributing to Apple Books, B&N, Kobo, etc.
  // ISBN optional — D2D provides free ISBNs or accepts existing ones.
  {
    platformSlug: 'draft2digital',
    categoryId: 'EBOOKS',
    rules: [
      { fieldKey: 'title',     severity: 'BLOCKER', message: 'Draft2Digital requires a title' },
      { fieldKey: 'author',    severity: 'BLOCKER', message: 'Draft2Digital requires an author' },
      { fieldKey: 'cover',     severity: 'WARNING',  message: 'Cover image is strongly recommended for retail distribution' },
      { fieldKey: 'publisher', severity: 'WARNING',  message: 'Publisher name improves catalogue presentation' },
    ],
  },

  // ── Smashwords / Smashwords Mark (now Draft2Digital-owned) ──────────────────
  {
    platformSlug: 'smashwords',
    categoryId: 'EBOOKS',
    rules: [
      { fieldKey: 'title',  severity: 'BLOCKER', message: 'Smashwords requires a title' },
      { fieldKey: 'author', severity: 'BLOCKER', message: 'Smashwords requires an author' },
      { fieldKey: 'cover',  severity: 'WARNING',  message: 'Cover image required for Smashwords Premium Catalogue distribution' },
    ],
  },
];

// ─── Registry lookup ─────────────────────────────────────────────────────────

function resolveField(item: InventoryRecord, fieldKey: string): unknown {
  const topLevel: Record<string, unknown> = {
    id: item.id,
    dealershipId: item.dealershipId,
    categoryId: item.categoryId,
    stockNumber: item.stockNumber,
    primaryIdentifier: item.primaryIdentifier,
    priceCents: item.priceCents,
    condition: item.condition,
    listingStatus: item.listingStatus,
    lifecycleStatus: item.lifecycleStatus,
  };
  if (fieldKey in topLevel) return topLevel[fieldKey];
  return item.data[fieldKey];
}

function isMissing(val: unknown): boolean {
  return val === undefined || val === null || val === '' || val === 0;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Check whether an inventory item meets the requirements for a specific platform.
 * This is separate from base readiness (buildInventoryReadiness), which answers
 * "can this item exist and go live on our storefront?" Platform requirements answer
 * "can this exact item go to this destination?"
 *
 * Unregistered platform+category combinations are permissive: no rules = allowed.
 */
export function canPublish(item: InventoryRecord, platformSlug: string): PlatformPublishResult {
  const entry = PLATFORM_REQUIREMENTS.find(
    r => r.platformSlug === platformSlug && r.categoryId === item.categoryId,
  );

  if (!entry) {
    return { canPublish: true, blockers: [], warnings: [] };
  }

  const blockers: string[] = [];
  const warnings: string[] = [];

  for (const rule of entry.rules) {
    if (rule.applies && !rule.applies(item)) continue;
    const val = resolveField(item, rule.fieldKey);
    if (isMissing(val)) {
      if (rule.severity === 'BLOCKER') blockers.push(rule.message);
      else warnings.push(rule.message);
    }
  }

  return { canPublish: blockers.length === 0, blockers, warnings };
}

/**
 * Returns every registered platformSlug for a given category.
 * Useful for building UI platform checklists.
 */
export function getRegisteredPlatformSlugs(categoryId: BusinessCategoryId): string[] {
  return PLATFORM_REQUIREMENTS
    .filter(r => r.categoryId === categoryId)
    .map(r => r.platformSlug);
}
