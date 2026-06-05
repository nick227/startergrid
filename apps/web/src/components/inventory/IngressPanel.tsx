import { useState } from 'react';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import {
  fetchIngressSources,
  fetchIngressRuns,
  createIngressSource,
  updateIngressSource,
  checkIngressSource,
} from '@/lib/api/sdk.ts';
import type {
  IngressSourceView,
  IngressRunView,
  IngressRunPlatformImpact,
} from '@/lib/types.ts';
import { SectionCard } from '@/components/operator';
import { AsyncPanel } from '@/components/operator/AsyncPanel.tsx';

// ── Props ─────────────────────────────────────────────────────────────────────

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

function relativeTimeFromNow(iso: string): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  if (Math.abs(diffMs) < 60_000) return 'now';
  const abs  = Math.abs(diffMs);
  const mins = Math.floor(abs / 60_000);
  if (diffMs < 0) return `${mins < 60 ? `${mins}m` : `${Math.floor(mins / 60)}h`} ago`;
  if (mins < 60)  return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `in ${hrs}h` : `in ${Math.floor(hrs / 24)}d`;
}

const SOURCE_KIND_LABEL: Record<string, string> = {
  CSV:             'CSV upload',
  JSON:            'JSON feed',
  API:             'API feed',
  WEBHOOK:         'Webhook',
  MANUAL:          'Manual',
  SCHEDULED_CHECK: 'Scheduled check',
};

const SOURCE_STATUS_STYLE: Record<string, string> = {
  ACTIVE:       'bg-emerald-100 text-emerald-800',
  PAUSED:       'bg-amber-100 text-amber-800',
  DISCONNECTED: 'bg-slate-100 text-slate-500',
  ERROR:        'bg-red-100 text-red-700',
};

// ── Platform impact helpers ───────────────────────────────────────────────────

type ImpactChip = { label: string; cls: string };

function buildImpactChips(impact: IngressRunPlatformImpact): ImpactChip[] {
  const chips: ImpactChip[] = [];
  const s = impact.publishSummary;
  if (impact.dispatched > 0)
    chips.push({ label: `${impact.dispatched} dispatched`, cls: 'text-emerald-700' });
  const scheduled = (s['Scheduled'] ?? 0) + (s['Ready'] ?? 0);
  if (scheduled > 0)
    chips.push({ label: `${scheduled} scheduled`, cls: 'text-sky-700' });
  if ((s['Needs Approval'] ?? 0) > 0)
    chips.push({ label: `${s['Needs Approval']} need approval`, cls: 'text-amber-700' });
  if ((s['Failed'] ?? 0) > 0)
    chips.push({ label: `${s['Failed']} failed`, cls: 'text-red-600 font-semibold' });
  if (impact.inCooldown > 0)
    chips.push({ label: `${impact.inCooldown} in cooldown`, cls: 'text-slate-400' });
  return chips;
}

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

  const [addingSource, setAddingSource] = useState(false);

  const sources  = srcData?.sources  ?? [];
  const runs     = runsData?.runs    ?? [];
  const loading  = loadingSrc && !srcData || loadingRuns && !runsData;

  const lastRun = runs[0] ?? null;
  const subtitle = lastRun
    ? `Last intake ${relativeTime(lastRun.receivedAt)} · ${lastRun.vehicleCount} vehicle${lastRun.vehicleCount !== 1 ? 's' : ''}`
    : 'No imports yet — use Import CSV to bring in your first batch';

  const handleSourceSaved = () => {
    setAddingSource(false);
    reloadSrc();
  };

  const handleSourceUpdated = () => {
    reloadSrc();
    reloadRuns();
  };

  return (
    <SectionCard title="Intake sources" subtitle={subtitle} noPadding>
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
            {sources.map(s => (
              <SourceRow
                key={s.id}
                source={s}
                dealerId={dealerId}
                onUpdated={handleSourceUpdated}
              />
            ))}
          </div>
        )}

        {/* ── Add API source ────────────────────────────────────────────────── */}
        {addingSource ? (
          <AddSourceForm
            dealerId={dealerId}
            onSaved={handleSourceSaved}
            onCancel={() => setAddingSource(false)}
          />
        ) : (
          <div className={`px-5 py-2 ${sources.length > 0 ? 'border-b border-slate-100' : ''}`}>
            <button
              type="button"
              onClick={() => setAddingSource(true)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 py-1"
            >
              + Add API source
            </button>
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
                  run.errorCount > 0 || run.blockedCount > 0 ? onShowBlockedVehicles : undefined
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

// ── Add source form ───────────────────────────────────────────────────────────

function AddSourceForm({
  dealerId,
  onSaved,
  onCancel,
}: {
  dealerId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [label, setLabel]   = useState('');
  const [feedUrl, setFeedUrl] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'PAUSED'>('ACTIVE');
  const [error, setError]   = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const canSubmit = label.trim().length > 0 && feedUrl.trim().startsWith('https://');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await createIngressSource(dealerId, {
        label:   label.trim(),
        feedUrl: feedUrl.trim(),
        status,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create source');
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="px-5 py-4 border-b border-slate-100 space-y-3 bg-slate-50/50"
    >
      <p className="text-xs font-semibold text-slate-700">Register API source</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="space-y-2">
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder="Label (e.g. DMS Feed, Partner API)"
          required
          maxLength={160}
          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
        <input
          type="url"
          value={feedUrl}
          onChange={e => setFeedUrl(e.target.value)}
          placeholder="https://api.example.com/inventory"
          required
          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
        {feedUrl && !feedUrl.startsWith('https://') && (
          <p className="text-xs text-amber-700">Feed URL must use HTTPS</p>
        )}
        <select
          value={status}
          onChange={e => setStatus(e.target.value as 'ACTIVE' | 'PAUSED')}
          className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
        >
          <option value="ACTIVE">Active</option>
          <option value="PAUSED">Paused</option>
        </select>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving || !canSubmit}
          className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save source'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Source row ────────────────────────────────────────────────────────────────

function SourceRow({
  source,
  dealerId,
  onUpdated,
}: {
  source: IngressSourceView;
  dealerId: string;
  onUpdated?: () => void;
}) {
  const statusCls = SOURCE_STATUS_STYLE[source.status] ?? 'bg-slate-100 text-slate-500';
  const kindLabel = SOURCE_KIND_LABEL[source.kind] ?? source.kind;
  const isApi     = source.kind === 'API';
  const canCheck  = isApi && (source.status === 'ACTIVE' || source.status === 'ERROR');

  const [toggling, setToggling] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const toggleStatus = async () => {
    if (!isApi || toggling) return;
    const next = source.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
    setToggling(true);
    try {
      await updateIngressSource(dealerId, source.id, { status: next });
      onUpdated?.();
    } finally {
      setToggling(false);
    }
  };

  const handleCheck = async () => {
    if (!canCheck || checking) return;
    setChecking(true);
    setCheckError(null);
    try {
      const result = await checkIngressSource(dealerId, source.id);
      if (!result.success && result.error) setCheckError(result.error);
      onUpdated?.();
    } catch (err) {
      setCheckError(err instanceof Error ? err.message : 'Check failed');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="px-5 py-3 text-xs">
      {/* Row 1: label / kind / status / check button */}
      <div className="flex items-center gap-3">
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-slate-900">{source.label}</span>
          <span className="ml-2 text-slate-400">{kindLabel}</span>
        </div>
        {isApi ? (
          <button
            type="button"
            onClick={toggleStatus}
            disabled={toggling}
            title={source.status === 'ACTIVE' ? 'Click to pause' : 'Click to activate'}
            className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 transition-opacity ${statusCls} ${toggling ? 'opacity-50' : 'hover:opacity-75 cursor-pointer'}`}
          >
            {toggling ? '…' : source.status.toLowerCase()}
          </button>
        ) : (
          <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${statusCls}`}>
            {source.status.toLowerCase()}
          </span>
        )}
        {canCheck && (
          <button
            type="button"
            onClick={handleCheck}
            disabled={checking}
            className="text-xs font-semibold text-sky-700 hover:text-sky-900 shrink-0 disabled:opacity-50"
          >
            {checking ? 'Checking…' : 'Check now'}
          </button>
        )}
        <div className="text-slate-400 shrink-0 text-right text-xs min-w-[90px]">
          {source.lastReceivedAt
            ? <span title={source.lastReceivedAt}>received {relativeTime(source.lastReceivedAt)}</span>
            : <span className="italic">never received</span>}
        </div>
      </div>

      {/* Row 2 (API only): feedUrl · checked timestamp · next schedule */}
      {isApi && (
        <div className="mt-1 flex items-center gap-3 text-slate-400 flex-wrap text-xs">
          {source.feedUrl ? (
            <span className="truncate max-w-[240px]" title={source.feedUrl}>
              {source.feedUrl}
            </span>
          ) : (
            <span className="italic">no feed URL set</span>
          )}
          <span className="shrink-0">
            {source.lastCheckedAt
              ? `checked ${relativeTime(source.lastCheckedAt)}`
              : 'not yet checked'}
          </span>
          {source.pollIntervalMinutes && source.nextCheckAt ? (
            <span className={`shrink-0 ${new Date(source.nextCheckAt) <= new Date() ? 'text-amber-500' : 'text-slate-300'}`}>
              {new Date(source.nextCheckAt) <= new Date()
                ? 'overdue'
                : `next ${relativeTimeFromNow(source.nextCheckAt)}`}
            </span>
          ) : source.pollIntervalMinutes ? (
            <span className="shrink-0 text-slate-300">every {source.pollIntervalMinutes}m</span>
          ) : null}
        </div>
      )}

      {/* Row 3 (API only): error state from last check */}
      {isApi && (source.lastCheckError || checkError) && (
        <div className="mt-1 text-red-600 text-xs">
          {checkError ?? source.lastCheckError}
        </div>
      )}
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

      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${s.dot}`} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`px-1.5 py-0.5 rounded font-medium shrink-0 ${s.pill}`}>{s.label}</span>
          {run.sourceLabel && (
            <span className="text-slate-500 truncate">{run.sourceLabel}</span>
          )}
          <span className="text-slate-400">{relativeTime(run.receivedAt)}</span>
        </div>

        <div className="flex items-center gap-3 mt-1 text-slate-500 flex-wrap">
          <span>{run.vehicleCount} vehicle{run.vehicleCount !== 1 ? 's' : ''}</span>
          {run.createdCount > 0 && <span className="text-emerald-700">+{run.createdCount} created</span>}
          {run.updatedCount > 0 && <span className="text-sky-700">↻{run.updatedCount} updated</span>}
          {run.skippedCount > 0 && <span className="text-slate-400">{run.skippedCount} skipped</span>}
          {run.errorCount   > 0 && <span className="text-red-600 font-semibold">{run.errorCount} errors</span>}
        </div>

        {run.platformImpactJson ? (
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-slate-300 select-none">→</span>
            {buildImpactChips(run.platformImpactJson).map(c => (
              <span key={c.label} className={`${c.cls}`}>{c.label}</span>
            ))}
          </div>
        ) : run.status === 'COMMITTED' || run.status === 'PARTIAL' ? (
          <div className="mt-1 text-slate-300 text-xs italic">platform impact pending…</div>
        ) : null}
      </div>

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
