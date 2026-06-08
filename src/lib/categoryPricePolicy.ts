import {
  isRegisteredCategory,
  resolveCategorySchema,
} from '../../packages/category-schemas/src/index.js';
import type { BusinessCategoryId } from '../../packages/category-schemas/src/types.js';

/** High-ticket physical inventory — keep the $1,000 automotive-style floor. */
const HIGH_TICKET_PHYSICAL = new Set<BusinessCategoryId>([
  'AUTOMOTIVE',
  'BOATS',
  'TRAILERS_POWERSPORTS_RV',
  'HEAVY_EQUIPMENT',
  'HOMES',
  'COMMERCIAL_PROPERTY',
]);

/** Per-night or per-unit rates where sub-$10 listings are normal. */
const RATE_BASED_CATEGORIES = new Set<BusinessCategoryId>([
  'VACATION_RENTALS',
  'APARTMENTS',
]);

/**
 * Minimum priceCents before emitting PRICE_SUSPICIOUS.
 * Returns null when no floor applies (digital goods, nightly rent, etc.).
 */
export function minPriceCentsForCategory(category: string): number | null {
  if (!isRegisteredCategory(category)) return 100_000;

  if (RATE_BASED_CATEGORIES.has(category)) return null;

  const schema = resolveCategorySchema(category);
  if (schema.lifecycleMode === 'digital_distribution') return null;

  if (HIGH_TICKET_PHYSICAL.has(category)) return 100_000;

  return 1_000;
}

/** Most permissive floor when a platform supports multiple categories. */
export function minPriceCentsForPlatform(categories: string[]): number | null {
  if (categories.length === 0) return 100_000;

  let floor: number | null = null;
  for (const category of categories) {
    const categoryFloor = minPriceCentsForCategory(category);
    if (categoryFloor === null) return null;
    floor = floor === null ? categoryFloor : Math.min(floor, categoryFloor);
  }
  return floor;
}
