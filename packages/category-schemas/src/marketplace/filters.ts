import type { CategorySchema } from '../types.js';

export function hasMarketplaceSellerFilter(schema: CategorySchema): boolean {
  return schema.fields.some(field => field.marketplaceFilter === 'seller');
}

/**
 * Resolves the make-column text filter for marketplace list/feed queries.
 * sellerName is only honored when the category schema declares marketplaceFilter: 'seller'.
 */
export function resolveMarketplaceMakeFilter(
  schema: CategorySchema,
  input: { make?: string; sellerName?: string },
): string | undefined {
  const make = input.make?.trim() || undefined;
  const sellerName = input.sellerName?.trim() || undefined;

  if (hasMarketplaceSellerFilter(schema)) {
    return sellerName ?? make;
  }

  return make;
}
