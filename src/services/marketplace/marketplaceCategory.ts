import type { FastifyReply } from 'fastify';
import { BusinessCategory } from '@prisma/client';
import {
  categorySlugToId,
  isConsumerMarketplaceLive,
  isRegisteredCategory,
  resolveCategorySchema,
  type BusinessCategoryId,
} from '../../../packages/category-schemas/src/index.js';

export const MARKETPLACE_CATEGORY_UNAVAILABLE = 'Marketplace category not available';

export const DEFAULT_MARKETPLACE_CATEGORY: BusinessCategory = BusinessCategory.AUTOMOTIVE;

export type ParsedMarketplaceCategory =
  | { ok: true; category: BusinessCategory }
  | { ok: false; error: string };

export function parseMarketplaceCategoryParam(value: string | string[] | undefined): ParsedMarketplaceCategory {
  if (Array.isArray(value)) value = value[0];
  if (!value || typeof value !== 'string' || value.trim() === '') {
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

export function isConsumerMarketplaceCategoryEnabled(category: BusinessCategory): boolean {
  return isConsumerMarketplaceLive(resolveCategorySchema(category));
}

export function resolveEnabledMarketplaceCategory(
  categoryParam: string | undefined,
  reply: FastifyReply,
): BusinessCategory | null {
  const parsed = parseMarketplaceCategoryParam(categoryParam);
  if (!parsed.ok) {
    reply.status(400).send({ error: parsed.error });
    return null;
  }
  if (!isConsumerMarketplaceCategoryEnabled(parsed.category)) {
    reply.status(404).send({ error: MARKETPLACE_CATEGORY_UNAVAILABLE });
    return null;
  }
  return parsed.category;
}

export function isAutomotiveCategory(category: BusinessCategoryId | BusinessCategory): boolean {
  return category === 'AUTOMOTIVE';
}
