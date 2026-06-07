import type { BusinessCategoryId, CategoryCopyBundle, CategorySchema } from '../types.js';
import { buildMarketplaceMeta } from '../marketplace/helpers.js';
import {
  genericAsset,
  genericChannel,
  genericCopy,
  genericLifecycle,
  genericPerformance,
  genericReadiness,
} from './copy.en.js';
import { genericFormatters } from './formatters.js';

export function createPlaceholderSchema(
  id: BusinessCategoryId,
  label: string,
  copyOverrides: Partial<CategoryCopyBundle> = {},
): CategorySchema {
  return {
    id,
    status: 'placeholder',
    label,
    copy: { ...genericCopy, ...copyOverrides },
    asset: { ...genericAsset },
    channel: { ...genericChannel },
    fields: [],
    lifecycle: { ...genericLifecycle },
    readiness: { ...genericReadiness },
    performance: { ...genericPerformance },
    formatters: genericFormatters,
    marketplace: buildMarketplaceMeta(id, label, { consumerEnabled: false }),
  };
}

/**
 * Neutral schema used while a dealer's real category is loading.
 * Uses generic copy ("Ref #", "Asset") so AUTOMOTIVE labels never flash for
 * non-automotive orgs during the initial fetch window.
 * id === 'SONGS' ensures zero platforms match during the loading window.
 */
export const genericOperatorFallback: CategorySchema = createPlaceholderSchema('SONGS', 'this category');

/** Fallback when category is not registered — never throws. */
export function createUnknownFallbackSchema(category: string): CategorySchema {
  const label = category || 'Unknown';
  return {
    id: category as BusinessCategoryId,
    status: 'placeholder',
    label,
    copy: { ...genericCopy },
    asset: { ...genericAsset },
    channel: { ...genericChannel },
    fields: [],
    lifecycle: { ...genericLifecycle },
    readiness: { ...genericReadiness },
    performance: { ...genericPerformance },
    formatters: genericFormatters,
    marketplace: {
      slug: category.trim().toLowerCase().replace(/_/g, '-'),
      consumerEnabled: false,
      tagline: `Browse ${label.toLowerCase()} listings`,
    },
  };
}
