import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchIngressSources, fetchIngressRuns } from '@/lib/api.ts';
import type { IngressSourceView, IngressRunView } from '@/lib/types.ts';
import { SectionCard } from '@/components/operator';
import { AsyncPanel } from '@/components/operator/AsyncPanel.tsx';

// ── Props ────────────────────────────────────────────────────────────────────

type Props = {
  dealerId: string;
  latestRunId?: string | null;
  onShowBlockedVehicles?: () => void;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

const SOURCE_KIND_LABEL: Record<string, string> = {
  CSV:            'CSV upload',
  JSON:           'JSON feed',
  API:            'API',
  WEBHOOK:        'Webhook',
  MANUAL:         'Manual',
  SCHEDULED_CHECK:'Scheduled check',
};

const SOURCE_STATUS_STYLE: Record<string, string> = {
  ACTIVE:       'bg-emerald-100 text-emerald-800',
  PAUSED:       'bg-amber-100 text-amber-800',
  DISCONNECTED: 'bg-slate-100 text-slate-500',
  ERROR:        'bg-red-100 text-red-700',
};

const RUN_STATUS_STYLE: Record<string, { pill: string; dot: string; label: string }> = {
  COMMITTED:  { pill: 'bg-emerald-100 text-emerald-800', dot: 'bg-emerald-500', label: 'Committed' },
  PARTIAL:    { pill: 'bg-amber-100 text-amber-800',     dot: 'bg-amber-500',   label: 'Partial' },
  FAILED:     { pill: 'bg-red-100 text-red-700',         dot: 'bg-red-500',     label: 'Failed' },
  RECEIVED:   { pill: 'bg-sky-100 text-sky-800',         dot: 'bg-sky-500',     label: 'Received' },
  PROCESSING: { pill: 'bg-sky-100 text-sky-800',         dot: 'bg-sky-500',     label: 'Processing' },
};

// ── Main component ────────────────────────────────────────────────────────────

export function IngressPanel({ dealerId, latestRunId, onShowBlockedVehicles }: Props) {
  const {
    data: srcData, loading: loadingSrc, error: srcErr, reload: reloadSrc,
  } = useAsyncQuery(() => fetchIngressSources(dealerId), [dealerId, latestRunId]);

  const {
    data: runsData, loading: loadingRuns, error: runsErr, reload: reloadRuns,
  } = useAsyncQuery(() => fetchIngressRuns(dealerId, { limit: 5 }), [dealerId, latestRunId]);

  const sources  = srcData?.sources  ?? [];
  const runs     = runsData?.runs    ?? [];
  const loading  = loadingSrc && !srcData || loadingRuns && !runsData;

  // Derive the most recent completed run for the subtitle
  const lastRun = runs[0] ?? null;
  const subtitle = lastRun
    ? `Last intake ${relativeTime(lastRun.receivedAt)} · ${lastRun.vehicleCount} vehicle${lastRun.vehicleCount !== 1 ? 's' : ''}`
    : 'No imports yet — use Import CSV to bring in your first batch';

  return (
    <SectionCard
      title="Intake sources"
      subtitle={subtitle}
      noPadding
    >
      <AsyncPanel
        label="ingress sources"
        loading={loading}
        error={srcErr ?? runsErr}
        hasData={srcData !== null || runsData !== null}
        onRetry={() => { reloadSrc(); reloadRuns(); }}
        skeletonRows={3}
      >
        {/* ── Source rows ──────────────────────────────────────────────────── */}
        {sources.length > 0 && (
          <div className="divide-y divide-slate-50 border-b border-slate-100">
            {sources.map(s => <SourceRow key={s.id} source={s} />)}
          </div>
        )}

        {/* ── Run rows ─────────────────────────────────────────────────────── */}
        {runs.length > 0 ? (
          <div className="divide-y divide-slate-50">
            {runs.map((run, i) => (
              <RunRow
                key={run.id}
                run={run}
                isLatest={i === 0 && run.id === latestRunId}
                onShowBlockedVehicles={
                  run.errorCount > 0 || (run.blockedCount > 0) ? onShowBlockedVehicles : undefined
                }
              />
            ))}
          </div>
        ) : (
          !loading && (
            <div className="px-5 py-6 text-center text-sm text-slate-400">
              No intake runs yet. Use <span className="font-medium">Import CSV</span> above to bring in your first batch.
            </div>
          )
        )}
      </AsyncPanel>
    </SectionCard>
  );
}

// ── Source row ────────────────────────────────────────────────────────────────

function SourceRow({ source }: { source: IngressSourceView }) {
  const statusCls = SOURCE_STATUS_STYLE[source.status] ?? 'bg-slate-100 text-slate-500';
  const kindLabel = SOURCE_KIND_LABEL[source.kind] ?? source.kind;

  return (
    <div className="px-5 py-3 flex items-center gap-3 text-xs">
      <div className="flex-1 min-w-0">
        <span className="text-sm font-semibold text-slate-900">{source.label}</span>
        <span className="ml-2 text-slate-400">{kindLabel}</span>
      </div>
      <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${statusCls}`}>
        {source.status.toLowerCase()}
      </span>
      <div className="text-slate-400 shrink-0 text-right min-w-0">
        {source.lastReceivedAt
          ? <span title={source.lastReceivedAt}>received {relativeTime(source.lastReceivedAt)}</span>
          : <span className="italic">never received</span>}
      </div>
    </div>
  );
}

// ── Run row ───────────────────────────────────────────────────────────────────

function RunRow({ run, isLatest, onShowBlockedVehicles }: {
  run: IngressRunView;
  isLatest: boolean;
  onShowBlockedVehicles?: () => void;
}) {
  const s = RUN_STATUS_STYLE[run.status] ?? { pill: 'bg-slate-100 text-slate-600', dot: 'bg-slate-400', label: run.status };
  const hasIssues = run.errorCount > 0 || run.blockedCount > 0;

  return (
    <div className={`px-5 py-2.5 flex items-center gap-3 text-xs transition-colors
      ${isLatest ? 'bg-emerald-50/60' : hasIssues ? 'bg-amber-50/30' : 'hover:bg-slate-50/80'}`}>

      {/* Status dot */}
      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />

      {/* Source + time */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-1.5 py-0.5 rounded font-medium shrink-0 ${s.pill}`}>{s.label}</span>
          {run.sourceLabel && (
            <span className="text-slate-500 truncate">{run.sourceLabel}</span>
          )}
          <span className="text-slate-400">{relativeTime(run.receivedAt)}</span>
        </div>

        {/* Counts */}
        <div className="flex items-center gap-3 mt-1 text-slate-500 flex-wrap">
          <span>{run.vehicleCount} vehicle{run.vehicleCount !== 1 ? 's' : ''}</span>
          {run.createdCount > 0 && <span className="text-emerald-700">+{run.createdCount} created</span>}
          {run.updatedCount > 0 && <span className="text-sky-700">↻{run.updatedCount} updated</span>}
          {run.skippedCount > 0 && <span className="text-slate-400">{run.skippedCount} skipped</span>}
          {run.errorCount   > 0 && <span className="text-red-600 font-semibold">{run.errorCount} errors</span>}
        </div>
      </div>

      {/* Fix link when there are issues */}
      {hasIssues && onShowBlockedVehicles && (
        <button
          type="button"
          onClick={onShowBlockedVehicles}
          className="text-xs font-semibold text-amber-800 hover:text-amber-900 shrink-0 whitespace-nowrap"
        >
          Fix issues →
        </button>
      )}
    </div>
  );
}
