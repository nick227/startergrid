import { useState } from 'react';
import type { PlatformAccountDetail } from '@/lib/types.ts';
import { fetchLeadForms, triggerLeadSync, type LeadFormInfo, type LeadSyncResponse } from '@/lib/api/sdk.ts';
import { Button } from '@/components/ui/Button.tsx';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { leadSyncBlockerReason } from '@/lib/platformPanelGuards.ts';

type Props = {
  dealerId: string;
  platformSlug: string;
  account: PlatformAccountDetail | null;
};

function BlockerNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
      <p className="text-xs text-amber-800">{children}</p>
    </div>
  );
}

export function LeadSyncPanel({ dealerId, platformSlug, account }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<LeadSyncResponse | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const blocker = leadSyncBlockerReason(account);
  const isConnected = account?.oauthConnected ?? false;
  const hasAccountId = Boolean(account?.accountId);

  const {
    data: formsData,
    loading: formsLoading,
    error: formsError,
  } = useAsyncQuery(
    () => (isConnected && hasAccountId ? fetchLeadForms(dealerId, platformSlug) : Promise.resolve(null)),
    [dealerId, platformSlug, isConnected, hasAccountId],
  );

  const handleSync = async () => {
    setSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await triggerLeadSync(dealerId, platformSlug);
      setSyncResult(res);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  if (blocker === 'no_oauth') {
    return (
      <BlockerNote>
        Connect via OAuth in the Setup tab to pull leads from your lead gen forms.
      </BlockerNote>
    );
  }

  if (blocker === 'no_account_id') {
    return (
      <BlockerNote>
        Set your Company Page ID in the Setup tab before syncing leads.
      </BlockerNote>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint mb-1">
          Lead Gen Forms
        </p>
        {formsLoading && (
          <p className="text-xs text-ink-faint">Loading forms…</p>
        )}
        {formsError && (
          <p className="text-xs text-status-error-text">{formsError}</p>
        )}
        {!formsLoading && !formsError && (
          formsData?.forms.length ? (
            <ul className="space-y-1">
              {formsData.forms.map((f: LeadFormInfo) => (
                <li key={f.urn} className="flex items-center justify-between gap-2 py-1 border-b border-silver-100 last:border-0">
                  <span className="text-xs text-ink-body truncate">{f.name || f.urn}</span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                    f.status === 'ACTIVE'
                      ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                      : 'bg-silver-100 text-ink-muted border-silver-200'
                  }`}>
                    {f.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-ink-faint">
              No lead gen forms found for this account.
              Create forms in LinkedIn Campaign Manager first.
            </p>
          )
        )}
      </div>

      <div className="border-t border-silver-200 pt-3 space-y-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
          Pull leads
        </p>
        <p className="text-xs text-ink-muted">
          Fetches new responses from all active forms. Already-imported leads are skipped.
        </p>

        {syncError && (
          <div className="text-xs text-status-error-text bg-status-error-bg px-3 py-2 rounded-md border border-status-error-border">
            {syncError}
          </div>
        )}

        {syncResult && (
          <div className="text-xs text-green-700 bg-green-50 px-3 py-2 rounded-md border border-green-200">
            {syncResult.fetched === 0
              ? 'No new leads found.'
              : `${syncResult.saved} lead${syncResult.saved !== 1 ? 's' : ''} imported`
                + (syncResult.skipped > 0 ? ` · ${syncResult.skipped} already on file` : '')}
          </div>
        )}

        <Button variant="secondary" size="sm" loading={syncing} onClick={() => void handleSync()}>
          {syncing ? 'Pulling…' : 'Pull leads now'}
        </Button>
      </div>
    </div>
  );
}
