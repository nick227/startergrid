import { useMemo, useState } from 'react';
import { fetchDealers } from '@/lib/api.ts';
import type { DealerSummary } from '@/lib/types.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { SearchField } from '@/components/ui/SearchField.tsx';
import { ErrorState } from '@/components/operator/ErrorState.tsx';

type Props = { onSelect: (id: string) => void };

export default function DealerPicker({ onSelect }: Props) {
  const { data, loading, error } = useAsyncQuery(() => fetchDealers(), []);
  const dealers = data?.dealers ?? [];
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <div className="mb-10 text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-2xl mx-auto mb-4 shadow-lg shadow-emerald-900/30">
            📡
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Operator Console</h1>
          <p className="text-slate-400 mt-2 text-sm max-w-xs mx-auto leading-relaxed">
            Inventory → accounts → sync. Pick a dealer to start.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl shadow-black/20 overflow-hidden border border-slate-200/80">
          <div className="p-4 border-b border-slate-100 bg-slate-50/50">
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
                <p className="text-center text-xs text-slate-400 mt-2">Is the API server running on port 3000?</p>
              </div>
            )}
            {!loading && !error && filtered.length === 0 && (
              <div className="p-8 text-center text-slate-400 text-sm">No dealers found</div>
            )}
            {filtered.map((d: DealerSummary) => (
              <button
                key={d.id}
                type="button"
                onClick={() => onSelect(d.id)}
                className="w-full text-left px-5 py-4 hover:bg-emerald-50/80 border-b border-slate-50 last:border-0 transition-colors"
              >
                <div className="font-semibold text-slate-900 text-sm">{d.legalName}</div>
                {d.dbaName && d.dbaName !== d.legalName && (
                  <div className="text-slate-400 text-xs mt-0.5">dba {d.dbaName}</div>
                )}
                <div className="text-slate-400 text-xs font-mono mt-1">{d.id}</div>
              </button>
            ))}
          </div>

          <div className="p-4 bg-slate-50 border-t border-slate-100">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste dealer ID…"
                value={manualId}
                onChange={e => setManualId(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && manualId.trim() && onSelect(manualId.trim())}
                className="flex-1 px-3 py-2.5 text-sm border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-emerald-500/40"
              />
              <button
                type="button"
                onClick={() => manualId.trim() && onSelect(manualId.trim())}
                disabled={!manualId.trim()}
                className="px-5 py-2.5 bg-slate-900 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 disabled:opacity-40"
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
