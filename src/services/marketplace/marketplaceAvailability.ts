export type MarketplaceAvailabilityStatus = 'AVAILABLE' | 'PENDING' | 'SOLD';

/**
 * Minimal derivation for the existing marketplace enum.
 *
 * - Never invent PENDING without a source field.
 * - Treat removed as SOLD for consumer safety (enum has no REMOVED).
 */
export function deriveMarketplaceAvailabilityStatus(input: {
  soldAt?: Date | null;
  removedAt?: Date | null;
}): MarketplaceAvailabilityStatus {
  if (input.soldAt != null) return 'SOLD';
  if (input.removedAt != null) return 'SOLD';
  return 'AVAILABLE';
}

