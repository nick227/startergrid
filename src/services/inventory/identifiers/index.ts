import type { BusinessCategoryId } from '@auto-dealer/category-schemas';
import type { IdentifierDecoder } from './identifierDecoder.js';
import { NoopIdentifierDecoder } from './noopDecoder.js';
import { MockIsbnDecoder } from './mockIsbnDecoder.js';
import { OpenLibraryIsbnDecoder } from './openLibraryIsbnDecoder.js';

export type { IdentifierDecoder, IdentifierDecodeResult } from './identifierDecoder.js';
export { NoopIdentifierDecoder } from './noopDecoder.js';
export { MockIsbnDecoder } from './mockIsbnDecoder.js';
export { OpenLibraryIsbnDecoder } from './openLibraryIsbnDecoder.js';

/**
 * Resolves the identifier decoder for a given category.
 * EBOOKS: MockIsbnDecoder in dev/test, OpenLibraryIsbnDecoder in production.
 * All others: NoopIdentifierDecoder (identifier passes through as-is).
 *
 * Override for EBOOKS with IDENTIFIER_DECODER_PROVIDER=openlib or =mock env var.
 */
export function resolveIdentifierDecoder(categoryId: BusinessCategoryId): IdentifierDecoder {
  if (categoryId === 'EBOOKS') {
    const provider = process.env['IDENTIFIER_DECODER_PROVIDER']
      ?? (process.env['NODE_ENV'] === 'production' ? 'openlib' : 'mock');
    return provider === 'openlib'
      ? new OpenLibraryIsbnDecoder()
      : new MockIsbnDecoder();
  }

  // All other categories: no external decode — SKU/Work ID is dealer-assigned
  return new NoopIdentifierDecoder('sku');
}
