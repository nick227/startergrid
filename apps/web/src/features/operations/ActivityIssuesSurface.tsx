import { useMemo, useEffect, useState, useCallback } from 'react';
import type { OperationsScope, OperationalIssue } from '@/lib/models/operations.ts';
import type { RemediationEvent } from '@/lib/telemetry.ts';
import { fetchScopedIssues, retryOperationalIssue, reauthenticateOperationalIssue, bulkRetryOperationalIssues } from './api.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { useToast } from '@/contexts/ToastContext.tsx';
import { trackRemediationEvent } from '@/lib/telemetry.ts';
import { ActivityHistorySurface } from './ActivityHistorySurface.tsx';

export type ActivityIssuesProps = {
  scope: OperationsScope;
  className?: string;
  hideAuditLog?: boolean;
};

// 'vehicle' and 'global' scopes carry no dealerId; telemetry falls back to a sentinel for those.
function scopeDealerId(scope: OperationsScope): string {
  return 'dealerId' in scope ? scope.dealerId : 'global';
}

// The single-retry endpoint returns a loose string status; normalize it to the
// telemetry vocabulary so a result can never be misreported as a bare "success".
function toRemediationResult(status: string): RemediationEvent['result'] {
  if (status === 'succeeded') return 'success';
  if (status === 'already_resolved') return 'already_resolved';
  return 'failed';
}

export function ActivityIssuesSurface({ scope, className = '', hideAuditLog = false }: ActivityIssuesProps) {
  const [issues, setIssues] = useState<OperationalIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isBulkRetrying, setIsBulkRetrying] = useState(false);
  const [activeTab, setActiveTab] = useState<'actionable' | 'audit'>('actionable');
  const toast = useToast();

  const loadIssues = useCallback(() => {
    setLoading(true);
    setLoadError(null);
    fetchScopedIssues(scope).then((data) => {
      setIssues(data);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      // Don't fall through to "No actionable issues" on a failed fetch — that reads as
      // a false all-clear. Surface the failure so it isn't mistaken for zero issues.
      setLoadError(err instanceof Error ? err.message : 'Failed to load issues');
      setLoading(false);
    });
  }, [scope]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  const scopeLabel = useMemo(() => {
    switch (scope.type) {
      case 'vehicle': return `Vehicle ${scope.vehicleId}`;
      case 'platform': return `Platform ${scope.platformSlug} (Dealer ${scope.dealerId})`;
      case 'dealer': return `Dealer ${scope.dealerId}`;
      case 'global': return 'All Dealerships';
    }
  }, [scope]);

  return (
    <div className={`flex flex-col gap-4 ${className}`}>
      {!hideAuditLog && (
        <div className="flex gap-4 border-b border-silver-200 pb-2">
          <button
            onClick={() => setActiveTab('actionable')}
            className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 -mb-px ${activeTab === 'actionable' ? 'text-ink-heading border-orange-600' : 'text-ink-muted border-transparent hover:text-ink-body'}`}
          >
            Actionable Issues
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-4 py-2 font-semibold text-sm transition-colors border-b-2 -mb-px ${activeTab === 'audit' ? 'text-ink-heading border-orange-600' : 'text-ink-muted border-transparent hover:text-ink-body'}`}
          >
            Audit Log
          </button>
        </div>
      )}

      {activeTab === 'actionable' || hideAuditLog ? (
        <div className="surface-card-operator p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-ink-heading">Actionable Issues</h2>
              <p className="text-sm text-ink-muted mt-1">
                Scope: <span className="text-ink-heading font-mono">{scopeLabel}</span>
              </p>
            </div>
            <div className="flex gap-2">
          {issues.filter(i => i.remediation?.isBulkSafe && !i.status?.includes('resolved') && !i.isResolved).length > 0 && (
            <button 
              className={`bg-navy-700 hover:bg-navy-600 border border-navy-600 text-silver-200 text-sm rounded px-3 py-1.5 transition-colors ${isBulkRetrying ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={isBulkRetrying}
              onClick={async () => {
                const eligible = issues.filter(i => i.remediation?.isBulkSafe && !i.isResolved);
                if (eligible.length === 0) return;
                setIsBulkRetrying(true);
                try {
                  const res = await bulkRetryOperationalIssues(eligible);
                  const succeeded = res.results.filter(r => r.status === 'succeeded').length;
                  const alreadyResolved = res.results.filter(r => r.status === 'already_resolved').length;
                  const failed = res.results.filter(r => r.status === 'failed' || r.status === 'not_authorized').length;
                  
                  if (failed > 0) {
                    toast(`Bulk Retry Complete: ${succeeded} succeeded, ${alreadyResolved} already resolved, ${failed} failed.`, 'error');
                  } else {
                    toast(`Bulk Retry Complete: ${succeeded} succeeded, ${alreadyResolved} already resolved.`, 'success');
                  }
                  
                  trackRemediationEvent({
                    dealerId: scopeDealerId(scope),
                    scope: 'bulk',
                    action: 'retry',
                    result: failed > 0 ? (succeeded > 0 ? 'partial_success' : 'failed') : 'success',
                    succeededCount: succeeded,
                    failedCount: failed,
                    alreadyResolvedCount: alreadyResolved,
                  });
                  
                  loadIssues();
                } catch (err) {
                  toast(err instanceof Error ? err.message : String(err), 'error');
                } finally {
                  setIsBulkRetrying(false);
                }
              }}
            >
              {isBulkRetrying ? 'Retrying...' : 'Retry All Eligible'}
            </button>
          )}
          <select className="bg-surface-card border border-silver-300 text-ink-heading text-sm rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy-500/30 transition-colors cursor-pointer">
            <option>All Severities</option>
            <option>Critical</option>
            <option>Warning</option>
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <Skeleton rows={3} />
          ) : loadError ? (
            <p className="text-sm text-status-error-text">Unable to load issues: {loadError}</p>
          ) : issues.length === 0 ? (
            <p className="text-sm text-ink-muted">No actionable issues for this scope.</p>
          ) : (
            issues.map((issue) => {
              const isResolved = issue.status === 'resolved';
              // Placeholder for real RBAC integration. 
              // In a real app, this would use a hook like: const { hasPermission } = useAuthorization();
              const hasRetryPermission = true; 
              const hasReauthPermission = true;
              
              const canRetry = issue.remediation?.isRetryable && hasRetryPermission && !isResolved;
              const canReauth = issue.remediation?.requiresReauth && hasReauthPermission && !isResolved;
              const needsManualResolve = !canRetry && !canReauth && !isResolved;

              return (
                <div key={issue.id} className={`border rounded-lg p-4 flex justify-between items-start transition-opacity ${
                  isResolved ? 'border-status-success-border bg-status-success-bg opacity-70' : 'border-silver-200 bg-surface-inset'
                }`}>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${
                        isResolved ? 'bg-status-success-text' :
                        issue.severity === 'critical' ? 'bg-status-error-text' : 
                        issue.severity === 'warning' ? 'bg-status-warning-text' : 'bg-status-info-text'
                      }`}></span>
                      <h3 className={`font-semibold ${isResolved ? 'text-status-success-text line-through' : 'text-ink-heading'} capitalize`}>
                        {issue.category} Issue {isResolved && '(Resolved)'}
                      </h3>
                      {issue.platformSlug && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold font-mono bg-surface-inset text-ink-muted border border-silver-200">
                          {issue.platformSlug}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink-muted mt-1">
                      Affecting {issue.affectedCount} {issue.affectedCount === 1 ? 'item' : 'items'}.
                      {issue.dealerId && ` (Dealer: ${issue.dealerId})`}
                    </p>
                    <p className="text-xs text-ink-faint mt-2">
                      First seen: {new Date(issue.observedFirstSeenAt).toLocaleString()}
                      {isResolved && issue.resolvedAt && ` • Resolved at: ${new Date(issue.resolvedAt).toLocaleString()}`}
                    </p>
                  </div>
                  {issue.remediation && !isResolved && (
                    <div className="flex flex-col gap-2">
                      {canRetry && (
                        <button 
                          className="bg-navy-700 hover:bg-navy-600 border border-navy-600 text-silver-200 text-sm px-3 py-1.5 rounded transition-colors"
                          onClick={async () => {
                            try {
                              const res = await retryOperationalIssue(issue);
                              if (res.status === 'already_resolved') {
                                toast('This issue was already resolved on the server.', 'info');
                              } else {
                                toast('Retry dispatched successfully.', 'success');
                              }
                              
                              trackRemediationEvent({
                                dealerId: issue.dealerId ?? 'unknown',
                                scope: 'single',
                                action: 'retry',
                                result: toRemediationResult(res.status),
                                issueCategory: issue.category,
                                affectedCount: issue.affectedCount
                              });
                              
                              loadIssues();
                            } catch (err) {
                              toast(err instanceof Error ? err.message : String(err), 'error');
                            }
                          }}
                        >
                          {issue.remediation.isBulkSafe ? 'Bulk Retry' : 'Retry'}
                        </button>
                      )}
                      {canReauth && (
                        <button 
                          className="bg-orange-600 hover:bg-orange-500 text-white text-sm px-3 py-1.5 rounded transition-colors shadow shadow-orange-900/20"
                          onClick={async () => {
                            try {
                              const res = await reauthenticateOperationalIssue(issue);
                              toast(`Re-authentication flow initiated. Visit: ${res.authUrl}`, 'success');
                              
                              trackRemediationEvent({
                                dealerId: issue.dealerId ?? 'unknown',
                                scope: 'single',
                                action: 'reauth',
                                result: 'success',
                                issueCategory: issue.category,
                                affectedCount: issue.affectedCount
                              });
                              
                              loadIssues();
                            } catch (err) {
                              toast(err instanceof Error ? err.message : String(err), 'error');
                            }
                          }}
                        >
                          Re-authenticate
                        </button>
                      )}
                      {needsManualResolve && (
                        <button 
                          className="bg-navy-700 hover:bg-navy-600 border border-navy-600 text-silver-200 text-sm px-3 py-1.5 rounded transition-colors"
                          onClick={() => toast('Mark Resolved Action Executed', 'info')}
                        >
                          Resolve Issue
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
      ) : (
        <ActivityHistorySurface scope={scope} />
      )}
    </div>
  );
}
