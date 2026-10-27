/**
 * Evidence-based take-down state from the server. Only VERIFIED_REMOVED means the vehicle is
 * confirmed gone; QUEUED_LOCALLY means nothing was sent anywhere, and UNSUPPORTED means a
 * person must end the listing on that site. Never present another value as a removal.
 */
export type RemovalStatus =
  | 'NOT_REQUESTED'
  | 'QUEUED_LOCALLY'
  | 'SUBMISSION_ATTEMPTED'
  | 'PROVIDER_ACCEPTED'
  | 'VERIFIED_REMOVED'
  | 'FAILED'
  | 'UNSUPPORTED';

export interface GhostListingItem {
  id: string;
  source: 'MARKETPLACE_LISTING' | 'DISTRIBUTION_TARGET';
  dealershipId: string;
  vehicleId: string | null;
  categoryItemId: string | null;
  stockNumber: string;
  title: string;
  vin?: string;
  channel: string;
  channelDisplayName: string;
  status: string;
  soldAt: string | null;
  removedAt: string | null;
  inactiveSince: string;
  exposureDays: number;
  ftcComplianceRisk: 'HIGH' | 'CRITICAL';
  removalStatus: RemovalStatus;
  submittedAt: string | null;
  providerReference: string | null;
  nextAction: string;
}

export interface SyndicationSentryAuditResult {
  dealershipId: string;
  status: 'CLEAN' | 'GHOST_LISTINGS_DETECTED';
  auditedCount: number;
  activeGhostListingsCount: number;
  verifiedLiveCount: number;
  channelsAudited: string[];
  lastAuditedAt: string;
  ghostListings: GhostListingItem[];
  summary: string;
}

export interface SyndicationSentryReconcileResult {
  dealershipId: string;
  status: 'RECONCILED' | 'CLEAN' | 'NEEDS_ACTION';
  reconciledCount: number;
  marketplaceListingsEnded: number;
  distributionTargetsWithdrawn: number;
  /** Final removal state of every listing found; RECONCILED only when all are VERIFIED_REMOVED. */
  removalCounts: Record<RemovalStatus, number>;
  notPublishedCount: number;
  remaining: GhostListingItem[];
  message: string;
  reconciledAt: string;
}

export async function fetchSyndicationSentryAudit(
  dealerId: string,
): Promise<SyndicationSentryAuditResult> {
  const res = await fetch(`/api/dealers/${encodeURIComponent(dealerId)}/distribution/sentry`, {
    credentials: 'include',
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to fetch Syndication Sentry audit');
  }
  return res.json();
}

export async function reconcileSyndicationGhostListings(
  dealerId: string,
): Promise<SyndicationSentryReconcileResult> {
  const res = await fetch(
    `/api/dealers/${encodeURIComponent(dealerId)}/distribution/sentry/reconcile`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
    },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Failed to reconcile ghost listings');
  }
  return res.json();
}
