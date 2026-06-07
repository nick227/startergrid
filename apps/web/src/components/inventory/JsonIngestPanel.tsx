import { useRef, useState } from 'react';
import type { IngressSourceView, JsonIngestResponse } from '@/lib/types.ts';
import { ingestJsonInventory } from '@/lib/api/sdk.ts';
import {
  formatJsonIngestFileSizeError,
  jsonIngestFileTooLarge,
  parseJsonIngestText,
  snapshotReviewFromSalesStatus,
} from '@/lib/jsonIngestParse.ts';
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
  const payloadBytes = new TextEncoder().encode(jsonText).length;

  const handleFile = async (file: File) => {
    if (jsonIngestFileTooLarge(file.size)) {
      setParseError(formatJsonIngestFileSizeError(file.size));
      return;
    }

    const text = await file.text();
    if (jsonIngestFileTooLarge(new TextEncoder().encode(text).length)) {
      setParseError(formatJsonIngestFileSizeError(new TextEncoder().encode(text).length));
      return;
    }

    setJsonText(text);
    setParseError(null);
    setResult(null);
  };

  const handleSubmit = async () => {
    if (jsonIngestFileTooLarge(payloadBytes)) {
      setParseError(formatJsonIngestFileSizeError(payloadBytes));
      return;
    }

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
    <div className="border-b border-silver-100 bg-silver-100/30 min-w-0">
      <button
        type="button"
        data-testid="json-ingest-toggle"
        onClick={() => setExpanded(v => !v)}
        className="w-full px-3 sm:px-5 py-3 flex items-center justify-between gap-3 text-left hover:bg-silver-100/80"
      >
        <div className="min-w-0">
          <p className="text-xs font-bold text-ink-heading">JSON / API ingest</p>
          <p className="text-[11px] text-ink-muted mt-0.5 truncate sm:whitespace-normal">
            Paste or upload a feed — optional authoritative snapshot dry-run
          </p>
        </div>
        <span className="text-ink-faint text-xs shrink-0">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="px-3 sm:px-5 pb-4 space-y-3 border-t border-silver-100 min-w-0">
          {sources.length > 0 && (
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-ink-faint uppercase tracking-widest">
                Tag with source (optional)
              </label>
              <select
                value={sourceId}
                onChange={e => setSourceId(e.target.value)}
                className="w-full min-w-0 text-xs px-3 py-2 border border-silver-200 rounded-lg bg-white"
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

          <div className="space-y-1 min-w-0">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <label className="text-[10px] font-bold text-ink-faint uppercase tracking-widest">
                JSON payload
              </label>
              <input
                ref={fileRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                data-testid="json-ingest-file-input"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-[11px] font-semibold text-status-success-text hover:underline self-start sm:self-auto"
              >
                Upload file
              </button>
            </div>
            <textarea
              data-testid="json-ingest-textarea"
              value={jsonText}
              onChange={e => { setJsonText(e.target.value); setParseError(null); }}
              rows={8}
              placeholder='{"vehicles":[{"stockNumber":"A001","vin":"...","year":2023,...}]}'
              className="w-full min-w-0 text-xs font-mono px-3 py-2 border border-silver-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-navy-500/30 resize-y"
            />
            {payloadBytes > 0 && (
              <p className="text-[10px] text-ink-faint tabular-nums">
                {(payloadBytes / 1024).toFixed(1)} KB
                {jsonIngestFileTooLarge(payloadBytes) && (
                  <span className="text-red-600"> — exceeds 5 MB limit</span>
                )}
              </p>
            )}
          </div>

          <label className="flex items-start gap-2 cursor-pointer">
            <input
              type="checkbox"
              data-testid="json-ingest-snapshot"
              checked={snapshotMode}
              onChange={e => setSnapshotMode(e.target.checked)}
              className="mt-0.5 rounded border-silver-300 shrink-0"
            />
            <span className="text-xs text-ink-body min-w-0">
              <span className="font-semibold">Treat this feed as the full current inventory</span>
              <span className="block text-[11px] text-amber-800 mt-0.5">
                Dry-run first — vehicles missing from this payload appear as removal candidates.
                Missing from feed means removed from active inventory, not sold. Commit explicitly below.
              </span>
            </span>
          </label>

          {parseError && (
            <p data-testid="json-ingest-parse-error" className="text-xs text-red-600 break-words">
              {parseError}
            </p>
          )}
          {submitError && (
            <p data-testid="json-ingest-submit-error" className="text-xs text-red-600 break-words">
              {submitError}
            </p>
          )}

          <button
            type="button"
            data-testid="json-ingest-submit"
            disabled={submitting || !jsonText.trim() || jsonIngestFileTooLarge(payloadBytes)}
            onClick={() => void handleSubmit()}
            className="w-full sm:w-auto px-4 py-2 text-xs font-bold bg-navy-900 text-white rounded-lg disabled:opacity-50"
          >
            {submitting ? 'Running ingest…' : snapshotMode ? 'Run snapshot dry-run ingest' : 'Run JSON ingest'}
          </button>

          {result && (
            <div
              data-testid="json-ingest-outcome"
              className="rounded-lg border border-silver-200 bg-white p-3 space-y-3 min-w-0 overflow-hidden"
            >
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
