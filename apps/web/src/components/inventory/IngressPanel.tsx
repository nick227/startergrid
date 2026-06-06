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
import { ingressRunStatusVisual, EMPTY_STATE_COPY } from '@/lib/statusRegistry.ts';
import { SnapshotReviewCard } from './SnapshotReviewCard.tsx';
import { SectionCard } from '@/components/operator';
import { AsyncPanel } from '@/components/operator/AsyncPanel.tsx';
import { EmptyState } from '@/components/ui';

// ── Props ─────────────────────────────────────────────────────────────────────

type Props = {
  dealerId: string;
  latestRunId?: string | null;
  onShowBlockedVehicles?: () => void;
  onSnapshotCommitted?: () => void;
};

// ── Time helpers ──────────────────────────────────────────────────────────────

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
  if (diffMs < 0) return mins < 60 ? `${mins}m ago` : `${Math.floor(mins / 60)}h ago`;
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  return hrs < 24 ? `in ${hrs}h` : `in ${Math.floor(hrs / 24)}d`;
}

// ── Poll interval presets ─────────────────────────────────────────────────────

type PresetKey = 'none' | '15' | '60' | '360' | '1440' | 'custom';

const PRESET_OPTIONS: { key: PresetKey; label: string; minutes: number | null }[] = [
  { key: 'none',   label: 'Manual only',    minutes: null },
  { key: '15',     label: 'Every 15 min',   minutes: 15   },
  { key: '60',     label: 'Hourly',         minutes: 60   },
  { key: '360',    label: 'Every 6 hours',  minutes: 360  },
  { key: '1440',   label: 'Daily',          minutes: 1440 },
  { key: 'custom', label: 'Custom…',        minutes: null },
];

function toPresetKey(minutes: number | null): PresetKey {
  if (minutes === null) return 'none';
  const found = PRESET_OPTIONS.find(p => p.key !== 'custom' && p.key !== 'none' && p.minutes === minutes);
  return found ? (found.key as PresetKey) : 'custom';
}

function resolveInterval(preset: PresetKey, custom: string): number | null {
  if (preset === 'none') return null;
  if (preset === 'custom') {
    const n = parseInt(custom, 10);
    return !isNaN(n) && n >= 5 && n <= 10080 ? n : null;
  }
  return parseInt(preset, 10);
}

// ── PollIntervalPicker ────────────────────────────────────────────────────────

function PollIntervalPicker({ preset, custom, onPreset, onCustom }: {
  preset: PresetKey;
  custom: string;
  onPreset: (k: PresetKey) => void;
  onCustom:  (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs text-slate-500 shrink-0">Schedule</span>
        <select
          value={preset}
          onChange={e => onPreset(e.target.value as PresetKey)}
          className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
        >
          {PRESET_OPTIONS.map(p => (
            <option key={p.key} value={p.key}>{p.label}</option>
          ))}
        </select>
        {preset === 'custom' && (
          <input
            type="number"
            min={5}
            max={10080}
            value={custom}
            onChange={e => onCustom(e.target.value)}
            placeholder="min (5–10080)"
            className="w-28 text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
          />
        )}
      </div>
      {preset !== 'none' && (
        <p className="text-xs text-slate-400">
          Automatic checks run on your server schedule — ask your ops team to enable polling.
        </p>
      )}
    </div>
  );
}

// ── Source status label maps ──────────────────────────────────────────────────

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
    chips.push({ label: `${impact.dispatched} submitted`, cls: 'text-emerald-700' });
  const scheduled = (s['Scheduled'] ?? 0) + (s['Ready'] ?? 0);
  if (scheduled > 0)
    chips.push({ label: `${scheduled} scheduled`, cls: 'text-sky-700' });
  if ((s['Needs Approval'] ?? 0) > 0)
    chips.push({ label: `${s['Needs Approval']} pending`, cls: 'text-amber-700' });
  if ((s['Failed'] ?? 0) > 0)
    chips.push({ label: `${s['Failed']} failed`, cls: 'text-red-600 font-semibold' });
  return chips;
}

// ── Main component ────────────────────────────────────────────────────────────

export function IngressPanel({ dealerId, latestRunId, onShowBlockedVehicles, onSnapshotCommitted }: Props) {
  const { data: srcData, loading: loadingSrc, error: srcErr, reload: reloadSrc } =
    useAsyncQuery(() => fetchIngressSources(dealerId), [dealerId, latestRunId]);

  const { data: runsData, loading: loadingRuns, error: runsErr, reload: reloadRuns } =
    useAsyncQuery(() => fetchIngressRuns(dealerId, { limit: 5 }), [dealerId, latestRunId]);

  const [addingSource, setAddingSource] = useState(false);

  const sources = srcData?.sources ?? [];
  const runs    = runsData?.runs   ?? [];
  const loading = (loadingSrc && !srcData) || (loadingRuns && !runsData);

  const lastRun  = runs[0] ?? null;
  const subtitle = lastRun
    ? `Last intake ${relativeTime(lastRun.receivedAt)} · ${lastRun.vehicleCount} vehicle${lastRun.vehicleCount !== 1 ? 's' : ''}`
    : EMPTY_STATE_COPY.noIntakeRuns.subtitle;

  const handleSourceSaved = () => { setAddingSource(false); reloadSrc(); };
  const handleSourceUpdated = () => { reloadSrc(); reloadRuns(); };

  return (
    <SectionCard title="Intake sources" subtitle={subtitle} noPadding>
      <AsyncPanel
        label="Intake sources"
        loading={loading}
        error={srcErr ?? runsErr}
        hasData={srcData !== null || runsData !== null}
        onRetry={() => { reloadSrc(); reloadRuns(); }}
        skeletonRows={3}
      >
        {sources.length === 0 && !addingSource && (
          <EmptyState
            icon="🔗"
            title={EMPTY_STATE_COPY.noIntakeSources.title}
            subtitle={EMPTY_STATE_COPY.noIntakeSources.subtitle}
          />
        )}

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
                dealerId={dealerId}
                run={run}
                isLatest={i === 0 && run.id === latestRunId}
                onShowBlockedVehicles={
                  run.errorCount > 0 || run.blockedCount > 0 ? onShowBlockedVehicles : undefined
                }
                onSnapshotCommitted={onSnapshotCommitted}
              />
            ))}
          </div>
        ) : (
          !loading && sources.length === 0 && (
            <EmptyState
              icon="📥"
              title={EMPTY_STATE_COPY.noIntakeRuns.title}
              subtitle={EMPTY_STATE_COPY.noIntakeRuns.subtitle}
            />
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
  const [label,    setLabel]    = useState('');
  const [feedUrl,  setFeedUrl]  = useState('');
  const [status,   setStatus]   = useState<'ACTIVE' | 'PAUSED'>('ACTIVE');
  const [preset,   setPreset]   = useState<PresetKey>('none');
  const [custom,   setCustom]   = useState('');
  const [error,    setError]    = useState<string | null>(null);
  const [saving,   setSaving]   = useState(false);

  const pollInterval = resolveInterval(preset, custom);
  const canSubmit = label.trim().length > 0 && feedUrl.trim().startsWith('https://');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await createIngressSource(dealerId, {
        label:               label.trim(),
        feedUrl:             feedUrl.trim(),
        status,
        pollIntervalMinutes: pollInterval,
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
          type="text" value={label} onChange={e => setLabel(e.target.value)}
          placeholder="Label (e.g. DMS Feed, Partner API)"
          required maxLength={160}
          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
        <input
          type="url" value={feedUrl} onChange={e => setFeedUrl(e.target.value)}
          placeholder="https://api.example.com/inventory"
          required
          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
        {feedUrl && !feedUrl.startsWith('https://') && (
          <p className="text-xs text-amber-700">Feed URL must use HTTPS</p>
        )}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 shrink-0">Status</span>
          <select
            value={status} onChange={e => setStatus(e.target.value as 'ACTIVE' | 'PAUSED')}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
          </select>
        </div>
        <PollIntervalPicker
          preset={preset} custom={custom}
          onPreset={setPreset} onCustom={setCustom}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit" disabled={saving || !canSubmit}
          className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save source'}
        </button>
        <button type="button" onClick={onCancel}
          className="text-xs font-semibold text-slate-400 hover:text-slate-600"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

// ── Edit source form ──────────────────────────────────────────────────────────

function EditSourceForm({
  source,
  dealerId,
  onSaved,
  onCancel,
}: {
  source: IngressSourceView;
  dealerId: string;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [label,   setLabel]   = useState(source.label);
  const [feedUrl, setFeedUrl] = useState(source.feedUrl ?? '');
  const [status,  setStatus]  = useState<'ACTIVE' | 'PAUSED'>(
    source.status === 'PAUSED' ? 'PAUSED' : 'ACTIVE',
  );
  const initPreset = toPresetKey(source.pollIntervalMinutes);
  const [preset, setPreset]   = useState<PresetKey>(initPreset);
  const [custom, setCustom]   = useState(
    initPreset === 'custom' && source.pollIntervalMinutes !== null
      ? String(source.pollIntervalMinutes)
      : '',
  );
  const [error,  setError]   = useState<string | null>(null);
  const [saving, setSaving]  = useState(false);

  const pollInterval = resolveInterval(preset, custom);
  const canSubmit = label.trim().length > 0 && feedUrl.trim().startsWith('https://');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    setError(null);
    try {
      await updateIngressSource(dealerId, source.id, {
        label:               label.trim(),
        feedUrl:             feedUrl.trim(),
        status,
        pollIntervalMinutes: pollInterval,
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update source');
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="px-5 py-4 bg-slate-50/50 border-t border-slate-100 space-y-3"
    >
      <p className="text-xs font-semibold text-slate-700">Edit API source</p>
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="space-y-2">
        <input
          type="text" value={label} onChange={e => setLabel(e.target.value)}
          placeholder="Label" required maxLength={160}
          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
        <input
          type="url" value={feedUrl} onChange={e => setFeedUrl(e.target.value)}
          placeholder="https://api.example.com/inventory" required
          className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
        />
        {feedUrl && !feedUrl.startsWith('https://') && (
          <p className="text-xs text-amber-700">Feed URL must use HTTPS</p>
        )}
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-500 shrink-0">Status</span>
          <select
            value={status} onChange={e => setStatus(e.target.value as 'ACTIVE' | 'PAUSED')}
            className="text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-slate-400"
          >
            <option value="ACTIVE">Active</option>
            <option value="PAUSED">Paused</option>
          </select>
        </div>
        <PollIntervalPicker
          preset={preset} custom={custom}
          onPreset={setPreset} onCustom={setCustom}
        />
      </div>
      <div className="flex items-center gap-3">
        <button
          type="submit" disabled={saving || !canSubmit}
          className="px-3 py-1.5 text-xs font-semibold bg-slate-900 text-white rounded-lg disabled:opacity-40"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button type="button" onClick={onCancel}
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
  const statusCls  = SOURCE_STATUS_STYLE[source.status] ?? 'bg-slate-100 text-slate-500';
  const kindLabel  = SOURCE_KIND_LABEL[source.kind] ?? source.kind;
  const isApi      = source.kind === 'API';
  const isError    = source.status === 'ERROR';
  const canCheck   = isApi && (source.status === 'ACTIVE' || isError);

  const [toggling,   setToggling]   = useState(false);
  const [checking,   setChecking]   = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [editing,    setEditing]    = useState(false);

  const toggleStatus = async () => {
    if (!isApi || toggling) return;
    const next: 'ACTIVE' | 'PAUSED' =
      source.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE';
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

  const handleEditSaved = () => {
    setEditing(false);
    onUpdated?.();
  };

  // Scheduling status line values (computed once, used below)
  const isOverdue = !!(source.pollIntervalMinutes && source.nextCheckAt && new Date(source.nextCheckAt) <= new Date());
  const scheduleText = isError
    ? 'Error · retry available'
    : !source.pollIntervalMinutes
      ? 'Manual only'
      : isOverdue
        ? 'Overdue'
        : source.nextCheckAt
          ? `Next check ${relativeTimeFromNow(source.nextCheckAt)}`
          : `every ${source.pollIntervalMinutes}m`;
  const scheduleCls = isError
    ? 'text-red-500'
    : isOverdue
      ? 'text-amber-500 font-medium'
      : 'text-slate-400';

  return (
    <div>
      <div className="px-5 py-3 text-xs">
        {/* Row 1: label / kind / status badge / actions / received */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900">{source.label}</span>
            <span className="text-slate-400">{kindLabel}</span>
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
              className={`text-xs font-semibold shrink-0 disabled:opacity-50 ${isError ? 'text-red-600 hover:text-red-800' : 'text-sky-700 hover:text-sky-900'}`}
            >
              {checking ? 'Checking…' : isError ? 'Retry' : 'Check now'}
            </button>
          )}
          {isApi && (
            <button
              type="button"
              onClick={() => setEditing(v => !v)}
              className="text-xs font-semibold text-slate-400 hover:text-slate-700 shrink-0"
            >
              {editing ? 'Cancel' : 'Edit'}
            </button>
          )}
          <div className="text-slate-400 shrink-0 text-right text-xs ml-auto">
            {source.lastReceivedAt
              ? <span title={source.lastReceivedAt}>received {relativeTime(source.lastReceivedAt)}</span>
              : <span className="italic">never received</span>}
          </div>
        </div>

        {/* Row 2 (API only): feedUrl · last checked · schedule status */}
        {isApi && (
          <div className="mt-1 flex items-center gap-3 text-slate-400 flex-wrap">
            {source.feedUrl ? (
              <span className="truncate max-w-[220px]" title={source.feedUrl}>
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
            <span className={`shrink-0 ${scheduleCls}`}>{scheduleText}</span>
          </div>
        )}

        {/* Row 3 (API only): inline check error */}
        {isApi && (source.lastCheckError || checkError) && (
          <div className="mt-1 text-red-600 text-xs">
            {checkError ?? source.lastCheckError}
          </div>
        )}
      </div>

      {/* Inline edit form */}
      {editing && (
        <EditSourceForm
          source={source}
          dealerId={dealerId}
          onSaved={handleEditSaved}
          onCancel={() => setEditing(false)}
        />
      )}
    </div>
  );
}

// ── Run row ───────────────────────────────────────────────────────────────────

function RunRow({ dealerId, run, isLatest, onShowBlockedVehicles, onSnapshotCommitted }: {
  dealerId: string;
  run: IngressRunView;
  isLatest: boolean;
  onShowBlockedVehicles?: () => void;
  onSnapshotCommitted?: () => void;
}) {
  const s = ingressRunStatusVisual(run.status);
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
          <div className="mt-1 text-slate-400 text-xs">{EMPTY_STATE_COPY.noPerformancePlatforms.title}</div>
        ) : null}

        {run.snapshotReview && run.snapshotReview.pendingCount > 0 && (
          <SnapshotReviewCard
            dealerId={dealerId}
            ingressRunId={run.id}
            review={run.snapshotReview}
            onCommitted={() => onSnapshotCommitted?.()}
          />
        )}
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
