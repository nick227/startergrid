import { useRef, useState } from 'react';
import type { IngressSourceView, JsonIngestResponse } from '@/lib/types.ts';
import { ingestJsonInventory } from '@/lib/api/sdk.ts';
import { parseJsonIngestText, snapshotReviewFromSalesStatus } from '@/lib/jsonIngestParse.ts';
import { JsonIngestResults } from './JsonIngestResults.tsx';
import { SnapshotReviewCard } from './SnapshotReviewCard.tsx';

type Props = {
  dealerId: string;
  sources: IngressSourceView[];
  onIngestComplete: (ingressRunId: string) => void;
};

const PORTAL_SOURCE = { slug: 'json-portal', label: 'Portal JSON ingest' };

export function JsonIngestPanel({ dealerId, sources, onIngestComplete }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [jsonText, setJsonText] = useState('');
  const [sourceId, setSourceId] = useState('');
  const [snapshotMode, setSnapshotMode] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<JsonIngestResponse | null>(null);

  const selectedSource = sources.find(s => s.id === sourceId);

  const handleFile = async (file: File) => {
    const text = await file.text();
    setJsonText(text);
    setParseError(null);
  };

  const handleSubmit = async () => {
    const parsed = parseJsonIngestText(jsonText);
    if (!parsed.ok) {
      setParseError(parsed.error);
      return;
    }

    setSubmitting(true);
    setParseError(null);
    setSubmitError(null);
    setResult(null);

    const sourceSlug = selectedSource?.slug ?? parsed.data.sourceSlug ?? PORTAL_SOURCE.slug;
    const sourceLabel = selectedSource?.label ?? parsed.data.sourceLabel ?? PORTAL_SOURCE.label;

    try {
      const response = await ingestJsonInventory(dealerId, {
        sourceSlug,
        sourceLabel,
        vehicles: parsed.data.vehicles,
        snapshotMode: snapshotMode || undefined,
        dryRun: snapshotMode ? true : undefined,
      });
      setResult(response);
      if (response.ingressRunId) onIngestComplete(response.ingressRunId);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Ingest failed');
    } finally {
      setSubmitting(false);
    }
  };

  const snapshotReview = result?.salesStatus
    ? snapshotReviewFromSalesStatus(result.salesStatus)
    : null;

  return (
    <div className="border-b border-slate-100 bg-slate-50/30">
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full px-5 py-3 flex items-center justify-between text-left hover:bg-slate-50/80"
      >
        <div>
          <p className="text-xs font-bold text-slate-800">JSON / API ingest</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Paste or upload a feed — optional authoritative snapshot dry-run</p>
        </div>
        <span className="text-slate-400 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-5 pb-4 space-y-3 border-t border-slate-100">
          {sources.length > 0 && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                Tag with source (optional)
              </label>
              <select
                value={sourceId}
                onChange={e => setSourceId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white"
              >
                <option value="">{PORTAL_SOURCE.label}</option>
                {sources.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.label} ({s.kind}{s.kind === 'API' ? ' · use Check now to pull URL' : ''})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                JSON payload
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-[11px] font-semibold text-emerald-700 hover:underline"
              >
                Upload file
              </button>
            </div>
            <textarea
              value={jsonText}
              onChange={e => { setJsonText(e.target.value); setParseError(null); }}
              rows={8}
              placeholder='{"vehicles":[{"stockNumber":"A001","vin":"...","year":2023,...}]}'
              className="w-full text-xs font-mono px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
            />
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={snapshotMode}
              onChange={e => setSnapshotMode(e.target.checked)}
              className="mt-0.5 rounded border-slate-300"
            />
            <span className="text-xs text-slate-700">
              <span className="font-semibold">Treat this feed as the full current inventory</span>
              <span className="block text-[11px] text-amber-800 mt-0.5">
                Dry-run first — vehicles missing from this payload appear as removal candidates.
                Missing from feed means removed from active inventory, not sold. Commit explicitly below.
              </span>
            </span>
          </label>

          {parseError && <p className="text-xs text-red-600">{parseError}</p>}
          {submitError && <p className="text-xs text-red-600">{submitError}</p>}

          <button
            type="button"
            disabled={submitting || !jsonText.trim()}
            onClick={() => void handleSubmit()}
            className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Running ingest…' : snapshotMode ? 'Run snapshot dry-run ingest' : 'Run JSON ingest'}
          </button>

          {result && (
            <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-3">
              <JsonIngestResults result={result} />
              {snapshotReview && snapshotReview.pendingCount > 0 && result.ingressRunId && (
                <SnapshotReviewCard
                  dealerId={dealerId}
                  ingressRunId={result.ingressRunId}
                  review={snapshotReview}
                  onCommitted={() => onIngestComplete(result.ingressRunId)}
                />
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
