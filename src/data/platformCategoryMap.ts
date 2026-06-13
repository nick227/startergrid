import type { PlatformProfileSeed } from '../lib/types.js';
import { platformProfiles } from './platformProfiles.js';

// ─── Category → platform mapping (single authority) ─────────────────────────────
//
// The business-category → platform relationship is defined by each platform's
// `supportedCategories` tag (see platformProfiles.ts / nonVehiclePlatformStubs.ts).
// Every part of the system that needs to know "which platforms belong to this
// dealer's category?" MUST go through here rather than re-implementing the
// `supportedCategories.includes(...)` predicate inline. One authority means one
// place to change when this becomes admin-controlled, and one place to audit for
// cross-category leaks.
//
// Fail-closed contract: an absent, null, or unrecognized category resolves to an
// EMPTY set — never the full registry and never an AUTOMOTIVE default. A dealer we
// cannot categorize gets zero platforms, not every platform.

/** Platforms that support the given business category. Unknown/absent → []. */
export function platformsForCategory(
  category: string | null | undefined,
): PlatformProfileSeed[] {
  if (!category) return [];
  return platformProfiles.filter(p => p.supportedCategories.includes(category));
}

/** Platform slugs that support the given business category. Unknown/absent → []. */
export function platformSlugsForCategory(category: string | null | undefined): string[] {
  return platformsForCategory(category).map(p => p.slug);
}

/** Whether a specific platform slug is allowed for the given category. */
export function isPlatformAllowedForCategory(
  slug: string,
  category: string | null | undefined,
): boolean {
  if (!category) return false;
  return platformsForCategory(category).some(p => p.slug === slug);
}
