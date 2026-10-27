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
  status: 'RECONCILED' | 'CLEAN';
  reconciledCount: number;
  marketplaceListingsEnded: number;
  distributionTargetsWithdrawn: number;
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
