import { useState } from 'react';
import { fetchPublishHistory } from '../lib/api.ts';
import type { SyncEvent, HistoryResponse } from '../lib/types.ts';

type Props = {
  events: SyncEvent[] | null;
  meta: HistoryResponse['meta'] | null;
  loading: boolean;
  error: string | null;
  dealerId: string;
  onRetry: () => void;
};

const KIND_STYLES: Record<string, { bg: string; label: string }> = {
  ARTIFACT_GENERATED:  { bg: 'bg-indigo-100 text-indigo-700', label: 'Artifact' },
  SUBMISSION_SENT:     { bg: 'bg-green-100 text-green-700',   label: 'Sent' },
  APPROVAL_GRANTED:    { bg: 'bg-green-100 text-green-700',   label: 'Approved' },
  APPROVAL_REJECTED:   { bg: 'bg-red-100 text-red-700',       label: 'Rejected' },
  APPROVAL_REQUESTED:  { bg: 'bg-amber-100 text-amber-700',   label: 'Approval req.' },
  APPROVAL_HELD:       { bg: 'bg-amber-100 text-amber-700',   label: 'Held' },
  APPROVAL_RELEASED:   { bg: 'bg-blue-100 text-blue-700',     label: 'Released' },
  DISPATCH_CLAIMED:    { bg: 'bg-blue-100 text-blue-700',     label: 'Claimed' },
  DISPATCH_FAILED:     { bg: 'bg-red-100 text-red-700',       label: 'Failed' },
  DISPATCH_RETRY:      { bg: 'bg-amber-100 text-amber-700',   label: 'Retry' },
  INVENTORY_CHANGE:    { bg: 'bg-slate-100 text-slate-600',   label: 'Inventory' },
  VEHICLE_SOLD:        { bg: 'bg-slate-100 text-slate-600',   label: 'Sold' },
  VEHICLE_REMOVED:     { bg: 'bg-slate-100 text-slate-600',   label: 'Removed' },
  ACCOUNT_UPDATED:     { bg: 'bg-amber-100 text-amber-700',   label: 'Account' },
  POLICY_CHANGED:      { bg: 'bg-slate-100 text-slate-500',   label: 'Policy' },
  PARTNER_FOLLOWUP:    { bg: 'bg-slate-100 text-slate-500',   label: 'Partner' }
};

// Derive badge style for ACCOUNT_UPDATED based on the new state in the payload
function accountEventStyle(payload: unknown): { bg: string; label: string } {
  const p = payload as { newState?: string; previousState?: string | null } | null;
  const newState = p?.newState ?? '';
  if (newState === 'ACTIVE') return { bg: 'bg-green-100 text-green-700', label: 'Account ✓' };
  if (newState === 'BLOCKED' || newState === 'SUSPENDED') return { bg: 'bg-red-100 text-red-700', label: 'Account blocked' };
  if (newState === 'PARTNER_REQUIRED') return { bg: 'bg-slate-100 text-slate-500', label: 'Account' };
  return { bg: 'bg-amber-100 text-amber-700', label: 'Account' };
}

function fmtAccountState(state: string): string {
  return state.toLowerCase().replace(/_/g, ' ');
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// Derive a human-readable prepare run summary from a batch of ARTIFACT_GENERATED events
function derivePrepareSummary(events: SyncEvent[]): string | null {
  const artifacts = events.filter(e => e.kind === 'ARTIFACT_GENERATED');
  if (!artifacts.length) return null;
  const mostRecent = artifacts[0]!;
  const platformsInBatch = new Set(artifacts.map(e => e.platformSlug).filter(Boolean));
  return `Last prepare: ${relativeTime(mostRecent.createdAt)} · ${artifacts.length} artifact${artifacts.length !== 1 ? 's' : ''} · ${platformsInBatch.size} platform${platformsInBatch.size !== 1 ? 's' : ''}`;
}

// Group events by syncRunId, returning ungrouped events for those without a run
type EventGroup =
  | { type: 'run'; runId: string; events: SyncEvent[]; firstAt: string }
  | { type: 'single'; event: SyncEvent };

function groupEvents(events: SyncEvent[]): EventGroup[] {
  const groups: EventGroup[] = [];
  const runMap = new Map<string, SyncEvent[]>();

  for (const e of events) {
    if (e.syncRunId) {
      const arr = runMap.get(e.syncRunId) ?? [];
      arr.push(e);
      runMap.set(e.syncRunId, arr);
    } else {
      groups.push({ type: 'single', event: e });
    }
  }

  for (const [runId, runEvents] of runMap) {
    groups.push({
      type: 'run',
      runId,
      events: runEvents,
      firstAt: runEvents[runEvents.length - 1]?.createdAt ?? runEvents[0]!.createdAt
    });
  }

  return groups.sort((a, b) => {
    const aTime = a.type === 'run' ? a.firstAt : a.event.createdAt;
    const bTime = b.type === 'run' ? b.firstAt : b.event.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}

function RunGroup({ group }: { group: EventGroup & { type: 'run' } }) {
  const [expanded, setExpanded] = useState(false);
  const hasFailed = group.events.some(e => e.kind === 'DISPATCH_FAILED' || e.kind === 'APPROVAL_REJECTED');
  const statusColor = hasFailed ? 'text-red-600' : 'text-slate-500';

  return (
    <div className="border-b border-slate-50 last:border-0">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full px-5 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors text-left"
      >
        <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 bg-slate-100 ${statusColor}`}>
          Sync run
        </span>
        <span className="flex-1 text-xs text-slate-500">
          {group.events.length} event{group.events.length !== 1 ? 's' : ''}
        </span>
        <time className="text-xs text-slate-300 font-mono shrink-0">{relativeTime(group.firstAt)}</time>
        <span className="text-slate-300 text-xs">{expanded ? '▲' : '▼'}</span>
      </button>
      {expanded && (
        <div className="border-t border-slate-50">
          {group.events.map(e => <SingleEventRow key={e.id} event={e} indented />)}
        </div>
      )}
    </div>
  );
}

function SingleEventRow({ event: e, indented = false }: { event: SyncEvent; indented?: boolean }) {
  const isAcctEvent = e.kind === 'ACCOUNT_UPDATED';
  const k = isAcctEvent
    ? accountEventStyle(e.payload)
    : (KIND_STYLES[e.kind] ?? { bg: 'bg-slate-100 text-slate-500', label: e.kind });

  // For ACCOUNT_UPDATED, extract the state transition from the payload
  const acctPayload = isAcctEvent
    ? (e.payload as { previousState?: string | null; newState?: string } | null)
    : null;
  const stateTransition = acctPayload?.newState
    ? (acctPayload.previousState
        ? `${fmtAccountState(acctPayload.previousState)} → ${fmtAccountState(acctPayload.newState)}`
        : fmtAccountState(acctPayload.newState))
    : null;

  return (
    <div className={`${indented ? 'pl-8 pr-5' : 'px-5'} py-2 flex items-center gap-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors`}>
      <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 ${k.bg}`}>{k.label}</span>
      <div className="flex-1 min-w-0">
        {e.platformSlug && (
          <span className="text-xs text-slate-600 truncate block">{e.platformSlug}</span>
        )}
        {isAcctEvent && stateTransition && (
          <span className="text-xs text-slate-400 italic truncate block">{stateTransition}</span>
        )}
        {!e.platformSlug && e.vehicleId && (
          <span className="text-xs font-mono text-slate-400 truncate block">vehicle:{e.vehicleId.slice(-8)}</span>
        )}
      </div>
      <time className="text-xs text-slate-300 shrink-0 whitespace-nowrap font-mono" title={e.createdAt}>
        {relativeTime(e.createdAt)}
      </time>
    </div>
  );
}

export default function RecentActivityPanel({ events: initialEvents, meta: initialMeta, loading, error, dealerId, onRetry }: Props) {
  const [localEvents, setLocalEvents] = useState<SyncEvent[]>(initialEvents ?? []);
  const [localMeta, setLocalMeta] = useState<HistoryResponse['meta'] | null>(initialMeta);
  const [loadingMore, setLoadingMore] = useState(false);

  // When the parent refreshes (initialEvents changes), reset local pagination state
  const events = !loadingMore && initialEvents !== null ? initialEvents : localEvents;
  const meta = !loadingMore && initialMeta !== null ? initialMeta : localMeta;

  const loadMore = async () => {
    if (!meta?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const r = await fetchPublishHistory(dealerId, { before: meta.nextCursor, limit: 30 });
      setLocalEvents([...events, ...r.events]);
      setLocalMeta(r.meta);
    } finally {
      setLoadingMore(false);
    }
  };

  const prepareSummary = events.length > 0 ? derivePrepareSummary(events) : null;
  const groups = groupEvents(events);

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Recent Activity</h2>
        {prepareSummary && (
          <p className="text-xs text-slate-400 mt-0.5">{prepareSummary}</p>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="px-5 py-4 flex items-center justify-between bg-red-50 border-b border-red-100">
          <span className="text-xs text-red-600">Could not load activity — {error}</span>
          <button onClick={onRetry} className="text-xs text-red-600 underline">Retry</button>
        </div>
      )}

      {/* Skeleton */}
      {loading && events.length === 0 && (
        <div className="p-4 space-y-2.5">
          {[75, 55, 85, 65, 70].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-12 h-4 bg-slate-100 rounded animate-pulse shrink-0" />
              <div className="h-3 bg-slate-100 rounded animate-pulse" style={{ width: `${w}%` }} />
              <div className="w-10 h-3 bg-slate-100 rounded animate-pulse shrink-0" />
            </div>
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && !error && events.length === 0 && (
        <div className="px-5 py-8 text-center">
          <div className="text-2xl mb-2">📋</div>
          <div className="text-sm font-medium text-slate-600">No activity recorded yet</div>
          <div className="text-xs text-slate-400 mt-1">Run Prepare &amp; Publish to record the first event.</div>
        </div>
      )}

      {/* Events */}
      {events.length > 0 && (
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {groups.map(g =>
            g.type === 'run'
              ? <RunGroup key={g.runId} group={g} />
              : <SingleEventRow key={g.event.id} event={g.event} />
          )}
          {meta?.hasMore && (
            <div className="px-5 py-3 border-t border-slate-50 text-center">
              <button
                onClick={() => void loadMore()}
                disabled={loadingMore}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-40"
              >
                {loadingMore ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
