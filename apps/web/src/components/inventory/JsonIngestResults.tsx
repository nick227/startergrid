import type { JsonIngestResponse } from '@/lib/types.ts';

type Props = { result: JsonIngestResponse };

function Stat({ label, value, tone }: { label: string; value: number; tone?: 'ok' | 'warn' | 'bad' }) {
  const color =
    tone === 'bad' ? 'text-red-700' :
    tone === 'warn' ? 'text-amber-700' :
    tone === 'ok' ? 'text-emerald-700' :
    'text-slate-700';
  return (
    <div className="rounded-lg border border-slate-100 bg-white px-3 py-2">
      <p className={`text-lg font-bold tabular-nums leading-none ${color}`}>{value}</p>
      <p className="text-[10px] font-semibold text-slate-500 mt-1">{label}</p>
    </div>
  );
}

export function JsonIngestResults({ result }: Props) {
  const candidates = result.salesStatus?.snapshotRemovedCandidates.length ?? 0;

  return (
    <div className="space-y-2" data-testid="json-ingest-results">
      <div className="flex flex-wrap items-center gap-2">
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
          result.status === 'COMMITTED' ? 'bg-emerald-100 text-emerald-800' :
          result.status === 'PARTIAL' ? 'bg-amber-100 text-amber-800' :
          'bg-red-100 text-red-800'
        }`}>
          {result.status}
        </span>
        <span className="text-[11px] text-slate-500">{result.vehicleCount} rows in payload</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Stat label="Created" value={result.created} tone={result.created > 0 ? 'ok' : undefined} />
        <Stat label="Updated" value={result.updated} />
        <Stat label="Blocked (validation)" value={result.blocked} tone={result.blocked > 0 ? 'warn' : undefined} />
        <Stat label="Skipped" value={result.skipped} />
        <Stat label="Errors" value={result.errors} tone={result.errors > 0 ? 'bad' : undefined} />
        <Stat label="Missing from feed" value={candidates} tone={candidates > 0 ? 'warn' : undefined} />
      </div>

      {result.salesStatus && (result.salesStatus.sold > 0 || result.salesStatus.reactivated > 0) && (
        <p className="text-[11px] text-slate-600">
          Row status: {result.salesStatus.sold > 0 && `${result.salesStatus.sold} sold`}
          {result.salesStatus.sold > 0 && result.salesStatus.reactivated > 0 && ' · '}
          {result.salesStatus.reactivated > 0 && `${result.salesStatus.reactivated} reactivated`}
        </p>
      )}
    </div>
  );
}
