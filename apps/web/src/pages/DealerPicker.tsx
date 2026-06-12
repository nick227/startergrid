import { useMemo, useState } from 'react';
import { fetchDealers } from '@/lib/api/sdk.ts';
import { createOperatorDealership, uploadDealerLogo } from '@/lib/api/sdk.ts';
import type { DealerSummary } from '@/lib/types.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { SearchField } from '@/components/ui/SearchField.tsx';
import { ErrorState } from '@/components/operator/ErrorState.tsx';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { canAccessDealer, filterDealersForOperator } from '@/lib/operatorAccess.ts';
import { DealershipIntakeFlow } from '@/components/dealers/DealershipIntakeFlow.tsx';

type Props = {
  onSelect: (id: string) => void;
  forbiddenDealerId?: string;
};

export default function DealerPicker({ onSelect, forbiddenDealerId }: Props) {
  const { user, logout, refresh } = useAuth();
  const { data, loading, error } = useAsyncQuery(() => fetchDealers(), []);
  const dealerRows = data?.dealers;
  const dealers = useMemo(() => dealerRows ?? [], [dealerRows]);
  const [query, setQuery] = useState('');
  const [manualId, setManualId] = useState('');
  const [manualError, setManualError] = useState<string | null>(null);
  const [showCreateDealer, setShowCreateDealer] = useState(false);

  const scopedDealers = useMemo(
    () => (user ? filterDealersForOperator(dealers, user) : []),
    [dealers, user],
  );

  const filtered = useMemo(
    () =>
      scopedDealers.filter(
        d =>
          d.legalName.toLowerCase().includes(query.toLowerCase()) || d.id.includes(query)
      ),
    [scopedDealers, query]
  );

  const trySelect = (id: string) => {
    if (!user || !canAccessDealer(user, id)) {
      setManualError(operatorCopy.auth.orgForbidden);
      return;
    }
    setManualError(null);
    onSelect(id);
  };

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      {showCreateDealer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl border border-silver-200 bg-surface-card p-6 shadow-elevation-3">
            <DealershipIntakeFlow
              mode="signup"
              onSubmit={createOperatorDealership}
              onUploadLogo={uploadDealerLogo}
              onComplete={async response => {
                setShowCreateDealer(false);
                await refresh();
                onSelect(response.dealer.id);
              }}
              onCancel={() => setShowCreateDealer(false)}
            />
          </div>
        </div>
      )}
      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-navy-800 to-navy-700 flex items-center justify-center text-2xl mx-auto mb-4 shadow-chrome">
            📡
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{operatorCopy.app.title}</h1>
          <p className="text-ink-faint mt-2 text-sm max-w-sm mx-auto leading-relaxed">
            {operatorCopy.scope.pickerTitle} — {operatorCopy.app.tagline}
          </p>
          {user && (
            <div className="mt-4 flex items-center justify-center gap-3 text-xs">
              <span className="text-silver-300">{user.email}</span>
              <button
                type="button"
                onClick={() => void logout()}
                className="font-semibold text-orange-500 hover:text-orange-400 transition-colors"
              >
                {operatorCopy.auth.signOut}
              </button>
            </div>
          )}
        </div>

        <div className="bg-surface-card rounded-xl shadow-elevation-3 overflow-hidden border border-silver-200">
          {(forbiddenDealerId || manualError) && (
            <div className="px-4 py-3 bg-status-error-bg border-b border-status-error-border text-xs text-status-error-text">
              {operatorCopy.auth.orgForbidden}
              {forbiddenDealerId ? ` (${forbiddenDealerId})` : ''}
            </div>
          )}

          <div className="p-4 border-b border-silver-200 bg-surface-inset">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder={operatorCopy.scope.searchPlaceholder}
              autoFocus
            />
          </div>

          <div className="max-h-72 overflow-y-auto scrollbar-thin">
            {loading && <Skeleton rows={5} />}
            {error && (
              <div className="p-4">
                <ErrorState message={error} onRetry={() => window.location.reload()} />
                <p className="text-center text-xs text-ink-faint mt-2">Is the API server running on port 3000?</p>
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="p-8 text-center text-ink-faint text-sm">
                {scopedDealers.length === 0
                  ? operatorCopy.scope.noAssignedOrgs
                  : operatorCopy.scope.noResults}
              </div>
            )}
            {filtered.map((d: DealerSummary) => (
              <button
                key={d.id}
                type="button"
                onClick={() => trySelect(d.id)}
                className="w-full text-left px-5 py-4 hover:bg-orange-100/60 border-b border-silver-100 last:border-0 transition-colors flex items-center gap-4 group"
              >
                {d.logoUrl ? (
                  <img src={d.logoUrl} alt="Logo" className="w-10 h-10 rounded shadow-sm object-cover bg-white" />
                ) : (
                  <div className="w-10 h-10 rounded shadow-sm bg-silver-200 flex items-center justify-center text-silver-400 text-xs font-medium">
                    {d.legalName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="font-semibold text-ink-heading text-sm">{d.legalName}</div>
                  {d.dbaName && d.dbaName !== d.legalName && (
                    <div className="text-ink-faint text-xs mt-0.5">dba {d.dbaName}</div>
                  )}
                  <div className="text-ink-faint text-xs font-mono mt-1">{d.id}</div>
                </div>
              </button>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-silver-200 bg-surface-card text-center flex items-center justify-center gap-6">
            <button
              type="button"
              onClick={() => setShowCreateDealer(true)}
              className="text-xs font-semibold text-ink-muted hover:text-orange-600 transition-colors"
            >
              Add dealership
            </button>
            <button
              type="button"
              onClick={() => { window.location.hash = '#/knowledge'; }}
              className="text-xs font-semibold text-ink-muted hover:text-orange-600 transition-colors"
            >
              Knowledge base →
            </button>
            {user?.role === 'SUPER_ADMIN' && (
              <button
                type="button"
                onClick={() => { window.location.hash = '#/admin'; }}
                className="text-xs font-semibold text-ink-muted hover:text-orange-600 transition-colors"
              >
                Site administration →
              </button>
            )}
          </div>

          <div className="p-4 bg-surface-inset border-t border-silver-200">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder={operatorCopy.scope.pasteIdPlaceholder}
                value={manualId}
                onChange={e => { setManualId(e.target.value); setManualError(null); }}
                onKeyDown={e => e.key === 'Enter' && manualId.trim() && trySelect(manualId.trim())}
                className="field-input flex-1 !rounded-md font-mono"
              />
              <button
                type="button"
                onClick={() => manualId.trim() && trySelect(manualId.trim())}
                disabled={!manualId.trim()}
                className="btn-primary-operator !px-5 !py-2.5 disabled:opacity-40"
              >
                {operatorCopy.scope.manualOpen}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
