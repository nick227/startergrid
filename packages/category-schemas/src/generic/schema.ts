import type { BusinessCategoryId, CategoryCopyBundle, CategorySchema } from '../types.js';
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
  };
}

/** Fallback when category is not registered — never throws. */
export function createUnknownFallbackSchema(category: string): CategorySchema {
  return {
    id: category as BusinessCategoryId,
    status: 'placeholder',
    label: category || 'Unknown',
    copy: { ...genericCopy },
    asset: { ...genericAsset },
    channel: { ...genericChannel },
    fields: [],
    lifecycle: { ...genericLifecycle },
    readiness: { ...genericReadiness },
    performance: { ...genericPerformance },
    formatters: genericFormatters,
  };
}
