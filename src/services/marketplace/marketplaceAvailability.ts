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

/** Card DTO field — omit when available; never invent PENDING without a source. */
export function marketplaceCardAvailabilityStatus(input: {
  soldAt?: Date | null;
  removedAt?: Date | null;
}): 'PENDING' | 'SOLD' | undefined {
  const status = deriveMarketplaceAvailabilityStatus(input);
  return status === 'AVAILABLE' ? undefined : status;
}

