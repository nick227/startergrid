import { fetchAdminDashboard, fetchBlockedDealers } from '@/lib/api/admin.ts';
import type { OperationsScope, OperationalIssue } from '@/lib/models/operations.ts';
import { buildOperationalIssues } from './operationsAdapter.ts';

export async function fetchScopedIssues(scope: OperationsScope): Promise<OperationalIssue[]> {
  try {
    if (scope.type === 'dealer' || scope.type === 'platform') {
      // Dealer-scoped: /api/admin/dashboard is SUPER_ADMIN-only, so a plain dealer operator
      // viewing their own Home page can't use it. /api/admin/blocked-dealers grants access to
      // any operator who can access the given dealerId, and its blocked-item sources (failed
      // queue items, blocked applications, failed accounts, stale syncs, geo/credential issues)
      // are a superset of the dashboard's dealerAttention list — so nothing is lost by using it
      // alone here.
      const blockers = await fetchBlockedDealers({ dealerId: scope.dealerId, limit: 500 });
      const normalizedIssues = buildOperationalIssues([], blockers.items ?? []);
      return normalizedIssues.filter(issue =>
        scope.type === 'platform' ? issue.platformSlug === scope.platformSlug : true
      );
    }

    // 'global' (admin Operations page) and 'vehicle' scopes still need the full cross-dealer
    // payload, which stays SUPER_ADMIN-only.
    const [dashboard, blockers] = await Promise.all([
      fetchAdminDashboard(),
      fetchBlockedDealers({ limit: 500 })
    ]);

    const normalizedIssues = buildOperationalIssues(
      dashboard.dealerAttention ?? [],
      blockers.items ?? []
    );

    return normalizedIssues.filter(issue => {
      if (scope.type === 'global') return true;
      if (scope.type === 'vehicle') return issue.vehicleIds.includes(scope.vehicleId);
      return false;
    });

  } catch (error) {
    console.error('Failed to fetch scoped issues:', error);
    throw error;
  }
}

// Real Remediation Actions wired to backend
export async function retryOperationalIssue(issue: OperationalIssue): Promise<{ status: string, timestamp?: string }> {
  const response = await fetch('/api/admin/issues/retry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      incidentId: issue.id,
      dealerId: issue.dealerId,
      platformSlug: issue.platformSlug,
      reasonCode: issue.reasonCode || 'unknown_error',
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to retry issue (status ${response.status})`);
  }
  
  return response.json();
}

export async function reauthenticateOperationalIssue(issue: OperationalIssue): Promise<{ status: string, authUrl?: string }> {
  const response = await fetch('/api/admin/issues/reauth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      incidentId: issue.id,
      dealerId: issue.dealerId,
      platformSlug: issue.platformSlug,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to initiate reauthentication (status ${response.status})`);
  }
  
  return response.json();
}

export type BulkRetryResult = {
  incidentId: string;
  status: 'succeeded' | 'already_resolved' | 'failed' | 'not_authorized';
  errorCode?: string;
};

export async function bulkRetryOperationalIssues(issues: OperationalIssue[]): Promise<{ results: BulkRetryResult[] }> {
  const response = await fetch('/api/admin/issues/bulk-retry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      incidents: issues.map(issue => ({
        incidentId: issue.id,
        dealerId: issue.dealerId,
        platformSlug: issue.platformSlug,
        reasonCode: issue.reasonCode || 'unknown_error',
        isBulkSafe: issue.remediation?.isBulkSafe === true
      }))
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Failed to execute bulk retry (status ${response.status})`);
  }
  
  return response.json();
}
