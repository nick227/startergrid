import type { BusinessCategoryId, CategoryMarketplaceMeta, CategorySchema } from '../types.js';
import { BUSINESS_CATEGORY_IDS } from '../types.js';
import { CATEGORY_REGISTRY } from '../registry.js';

const TAGLINES: Partial<Record<BusinessCategoryId, string>> = {
  AUTOMOTIVE: 'Find your next vehicle from participating dealers',
  WATCHES: 'Discover timepieces from trusted sellers',
  EBOOKS: 'Browse digital titles from participating publishers',
  SNEAKERS: 'Shop authenticated sneakers from verified sellers',
  HOMES: 'Explore homes listed by participating brokerages',
  BOATS: 'Browse boats and watercraft from participating dealers',
  TRAILERS_POWERSPORTS_RV: 'Browse RVs, trailers, ATVs, and powersports from participating dealers',
  APPAREL: 'Browse apparel and fashion from participating sellers',
  SONGS: 'Browse music releases from participating artists',
  VIDEO_DISTRIBUTION: 'Browse videos from participating creators',
  PAWN: 'Browse pre-owned items from participating shops',
  DIGITAL_ART: 'Browse digital artworks from participating artists',
};

export function categoryIdToSlug(id: BusinessCategoryId): string {
  return id.toLowerCase().replace(/_/g, '-');
}

export function categorySlugToId(slug: string): BusinessCategoryId | null {
  const normalized = slug.trim().toLowerCase();
  for (const id of BUSINESS_CATEGORY_IDS) {
    if (categoryIdToSlug(id) === normalized) return id;
  }
  return null;
}

export function buildMarketplaceMeta(
  id: BusinessCategoryId,
  label: string,
  overrides: Partial<CategoryMarketplaceMeta> = {},
): CategoryMarketplaceMeta {
  return {
    slug: categoryIdToSlug(id),
    consumerEnabled: true,
    tagline: TAGLINES[id] ?? `Browse ${label.toLowerCase()} from participating sellers`,
    ...overrides,
  };
}

export function listMarketplaceCategories(): CategorySchema[] {
  return Object.values(CATEGORY_REGISTRY).filter(schema => schema.marketplace.consumerEnabled);
}
