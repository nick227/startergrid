import { useCallback, useEffect, useState } from 'react';
import {
  fetchSyndicationSentryAudit,
  reconcileSyndicationGhostListings,
  type SyndicationSentryAuditResult,
} from '@/lib/api/sentryApi.ts';

type Props = {
  dealerId: string;
  onReconciled?: () => void;
  hideWhenClean?: boolean;
};

export type RemovalFeedback = {
  type: 'confirmed' | 'pending' | 'attention';
  headline: string;
  detail: string;
};

export function SyndicationSentryCard({ dealerId, onReconciled, hideWhenClean = true }: Props) {
  const [audit, setAudit] = useState<SyndicationSentryAuditResult | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [reconciling, setReconciling] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<RemovalFeedback | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAudit = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchSyndicationSentryAudit(dealerId);
      setAudit(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to check advertised sold vehicles');
    } finally {
      setLoading(false);
    }
  }, [dealerId]);

  useEffect(() => {
    void loadAudit();
    const handleDistributionUpdated = () => {
      void loadAudit();
    };
    window.addEventListener('distribution-updated', handleDistributionUpdated);
    return () => {
      window.removeEventListener('distribution-updated', handleDistributionUpdated);
    };
  }, [loadAudit]);

  const handleReconcile = async () => {
    try {
      setReconciling(true);
      setError(null);
      const result = await reconcileSyndicationGhostListings(dealerId);
      if (result.status === 'RECONCILED' || result.status === 'CLEAN') {
        setFeedback({
          type: 'confirmed',
          headline: 'Removal confirmed',
          detail:
            result.reconciledCount > 0
              ? `${result.reconciledCount} vehicle${result.reconciledCount === 1 ? '' : 's'} verified removed from advertising.`
              : 'All advertised vehicles match your active lot inventory.',
        });
      } else if (result.reconciledCount > 0) {
        setFeedback({
          type: 'attention',
          headline: 'Removal needs attention',
          detail: `Removal confirmed for ${result.reconciledCount} listing${
            result.reconciledCount === 1 ? '' : 's'
          }. Removal pending for ${result.remaining.length} listing${
            result.remaining.length === 1 ? '' : 's'
          } requiring action on the destination portal.`,
        });
      } else {
        setFeedback({
          type: 'pending',
          headline: 'Removal pending',
          detail: `Removal requested: Local operation recorded. External removal is not confirmed—${result.remaining.length} listing${
            result.remaining.length === 1 ? '' : 's'
          } require${result.remaining.length === 1 ? '' : 's'} manual action on the destination portal.`,
        });
      }
      await loadAudit();
      onReconciled?.();
      window.dispatchEvent(new Event('distribution-updated'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to request removal of sold vehicles');
    } finally {
      setReconciling(false);
    }
  };

  const isClean = audit?.status === 'CLEAN' || (audit?.activeGhostListingsCount ?? 0) === 0;

  if (hideWhenClean && isClean && !feedback) {
    return null;
  }

  if (loading && !audit) {
    return null;
  }

  return (
    <div
      className={`rounded-xl border p-4 sm:p-5 transition-all shadow-sm ${
        isClean
          ? 'border-emerald-500/25 bg-emerald-50/40 dark:bg-emerald-950/20'
          : 'border-rose-500/35 bg-rose-50/40 dark:bg-rose-950/20'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <span
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${
              isClean ? 'bg-emerald-500/15 text-emerald-700' : 'bg-rose-500/15 text-rose-700'
            }`}
          >
            {isClean ? '✓' : '⚠️'}
          </span>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-ink-heading">
                {isClean
                  ? 'Sold vehicles are not advertised'
                  : `${audit?.activeGhostListingsCount} sold vehicle${
                      (audit?.activeGhostListingsCount ?? 0) === 1 ? '' : 's'
                    } may still be advertised`}
              </h3>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  isClean
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/60'
                    : 'bg-rose-100 text-rose-800 border border-rose-300/60'
                }`}
              >
                {isClean ? 'Up to date' : 'Removal needed'}
              </span>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              {isClean
                ? 'No connected advertising channels show a sold or removed vehicle as active.'
                : 'Sold vehicles may still appear on connected advertising channels. Request removal so shoppers do not call about a vehicle that left the lot.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center shrink-0">
          {!isClean && (
            <button
              onClick={handleReconcile}
              disabled={reconciling}
              className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              {reconciling ? (
                <>
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Requesting removal…
                </>
              ) : (
                'Request removal'
              )}
            </button>
          )}

          <button
            onClick={loadAudit}
            disabled={loading}
            className="inline-flex items-center justify-center px-2.5 py-1.5 rounded-lg text-xs font-medium text-ink-muted hover:text-ink-heading hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            title="Check advertising status"
          >
            {loading ? 'Checking…' : 'Check again'}
          </button>
        </div>
      </div>

      {feedback && (
        <div
          role="alert"
          className={`mt-3 p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
            feedback.type === 'confirmed'
              ? 'bg-emerald-100/90 border-emerald-300 text-emerald-950'
              : feedback.type === 'attention'
              ? 'bg-rose-100/90 border-rose-300 text-rose-950'
              : 'bg-amber-100/90 border-amber-300 text-amber-950'
          }`}
        >
          <div className="space-y-0.5">
            <span className="font-bold flex items-center gap-1.5">
              <span>{feedback.type === 'confirmed' ? '✓' : 'ℹ'}</span>
              <span>{feedback.headline}</span>
            </span>
            <p className="leading-relaxed">{feedback.detail}</p>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-ink-muted hover:text-ink-heading font-bold text-sm shrink-0"
            aria-label="Dismiss message"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 p-2.5 rounded-lg bg-rose-100/80 border border-rose-300/80 text-rose-900 text-xs">
          {error}
        </div>
      )}

      {/* When sold vehicles may still be advertised, show details table */}
      {!isClean && audit && audit.ghostListings.length > 0 && (
        <div className="mt-4 pt-3 border-t border-rose-500/20">
          <h4 className="text-xs font-semibold text-rose-900 dark:text-rose-200 mb-2">
            Vehicles needing removal:
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-rose-500/15 text-[11px] text-ink-muted">
                  <th className="pb-1.5 font-semibold">Vehicle</th>
                  <th className="pb-1.5 font-semibold">Stock #</th>
                  <th className="pb-1.5 font-semibold">Channel</th>
                  <th className="pb-1.5 font-semibold">Lot Status</th>
                  <th className="pb-1.5 font-semibold">Advertised</th>
                  <th className="pb-1.5 font-semibold">Status</th>
                  <th className="pb-1.5 font-semibold">Next step</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rose-500/10">
                {audit.ghostListings.map(ghost => (
                  <tr key={ghost.id} className="hover:bg-rose-500/5">
                    <td className="py-2 font-medium text-ink-heading">{ghost.title}</td>
                    <td className="py-2 text-ink-muted font-mono text-[11px]">
                      {ghost.stockNumber}
                    </td>
                    <td className="py-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-silver-100 text-ink-heading border border-silver-300">
                        {ghost.channelDisplayName}
                      </span>
                    </td>
                    <td className="py-2 text-rose-700 dark:text-rose-300 font-medium">
                      {ghost.soldAt ? 'Sold' : 'Removed from lot'}
                    </td>
                    <td className="py-2">
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          ghost.ftcComplianceRisk === 'CRITICAL'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {ghost.exposureDays} day{ghost.exposureDays === 1 ? '' : 's'} since sold
                      </span>
                    </td>
                    <td className="py-2">
                      <span
                        className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300"
                        title="External removal not confirmed without provider evidence"
                      >
                        Removal pending
                      </span>
                    </td>
                    <td className="py-2 text-ink-muted">{ghost.nextAction}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Clean status metrics footer */}
      {isClean && audit && (
        <div className="mt-3 pt-3 border-t border-emerald-500/15 flex items-center gap-4 text-[11px] text-ink-muted flex-wrap">
          <span>
            Destinations checked:{' '}
            <strong className="text-ink-heading">{audit.channelsAudited.length}</strong>
          </span>
          <span>•</span>
          <span>
            Sold/Removed audited:{' '}
            <strong className="text-ink-heading">{audit.auditedCount} units</strong>
          </span>
        </div>
      )}
    </div>
  );
}
