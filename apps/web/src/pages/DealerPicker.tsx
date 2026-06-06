import { useMemo, useState } from 'react';
import { fetchDealers } from '@/lib/api/sdk.ts';
import type { DealerSummary } from '@/lib/types.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { SearchField } from '@/components/ui/SearchField.tsx';
import { ErrorState } from '@/components/operator/ErrorState.tsx';
import { InfoLabel } from '@/components/docs';

type Props = { onSelect: (id: string) => void };

export default function DealerPicker({ onSelect }: Props) {
  const { data, loading, error } = useAsyncQuery(() => fetchDealers(), []);
  const dealerRows = data?.dealers;
  const dealers = useMemo(() => dealerRows ?? [], [dealerRows]);
  const [query, setQuery] = useState('');
  const [manualId, setManualId] = useState('');

  const filtered = useMemo(
    () =>
      dealers.filter(
        d =>
          d.legalName.toLowerCase().includes(query.toLowerCase()) || d.id.includes(query)
      ),
    [dealers, query]
  );

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-navy-800 to-navy-700 flex items-center justify-center text-2xl mx-auto mb-4 shadow-chrome">
            📡
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Operator Console</h1>
          <p className="text-ink-faint mt-2 text-sm max-w-xs mx-auto leading-relaxed">
            <InfoLabel
              term="Dealer context"
              docId="dealerships/dealer-context"
              inverted
              termClassName="text-silver-200"
              className="justify-center"
            />
            {' '}— pick a rooftop, then inventory → accounts → sync.
          </p>
        </div>

        <div className="bg-surface-card rounded-xl shadow-elevation-3 overflow-hidden border border-silver-200">
          <div className="p-4 border-b border-silver-200 bg-surface-inset">
            <SearchField
              value={query}
              onChange={setQuery}
              placeholder="Search dealer name or ID…"
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
              <div className="p-8 text-center text-ink-faint text-sm">No dealers found</div>
            )}
            {filtered.map((d: DealerSummary) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelect(d.id)}
                className="w-full text-left px-5 py-4 hover:bg-orange-100/60 border-b border-silver-100 last:border-0 transition-colors"
              >
                <div className="font-semibold text-ink-heading text-sm">{d.legalName}</div>
                {d.dbaName && d.dbaName !== d.legalName && (
                  <div className="text-ink-faint text-xs mt-0.5">dba {d.dbaName}</div>
                )}
                <div className="text-ink-faint text-xs font-mono mt-1">{d.id}</div>
              </button>
            ))}
          </div>

          <div className="px-4 py-3 border-t border-silver-200 bg-surface-card text-center">
            <button
              type="button"
              onClick={() => { window.location.hash = '#/knowledge'; }}
              className="text-xs font-semibold text-ink-muted hover:text-orange-600 transition-colors"
            >
              Knowledge base →
            </button>
          </div>

          <div className="p-4 bg-surface-inset border-t border-silver-200">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste dealer ID…"
                value={manualId}
                onChange={e => setManualId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && manualId.trim() && onSelect(manualId.trim())}
                className="field-input flex-1 !rounded-md font-mono"
              />
              <button
                type="button"
                onClick={() => manualId.trim() && onSelect(manualId.trim())}
                disabled={!manualId.trim()}
                className="btn-primary-operator !px-5 !py-2.5 disabled:opacity-40"
              >
                Open
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
