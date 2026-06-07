import { BusinessCategory } from '@prisma/client';
import {
  categorySlugToId,
  isRegisteredCategory,
  type BusinessCategoryId,
} from '../../../packages/category-schemas/src/index.js';

export const DEFAULT_MARKETPLACE_CATEGORY: BusinessCategory = BusinessCategory.AUTOMOTIVE;

export type ParsedMarketplaceCategory =
  | { ok: true; category: BusinessCategory }
  | { ok: false; error: string };

export function parseMarketplaceCategoryParam(value: string | undefined): ParsedMarketplaceCategory {
  if (!value || value.trim() === '') {
    return { ok: true, category: DEFAULT_MARKETPLACE_CATEGORY };
  }

  const trimmed = value.trim();
  if (isRegisteredCategory(trimmed)) {
    return { ok: true, category: trimmed as BusinessCategory };
  }

  const fromSlug = categorySlugToId(trimmed);
  if (fromSlug) {
    return { ok: true, category: fromSlug as BusinessCategory };
  }

  return { ok: false, error: `Unknown marketplace category: ${trimmed}` };
}

export function marketplaceSiteHref(slug: string): string {
  return `/${slug}/`;
}

export type MarketplaceSiteStatus = 'active' | 'coming_soon' | 'disabled';

export function resolveMarketplaceSiteStatus(
  consumerEnabled: boolean,
  listingCount: number,
): MarketplaceSiteStatus {
  if (!consumerEnabled) return 'disabled';
  if (listingCount > 0) return 'active';
  return 'coming_soon';
}

export function isAutomotiveCategory(category: BusinessCategoryId | BusinessCategory): boolean {
  return category === 'AUTOMOTIVE';
}
