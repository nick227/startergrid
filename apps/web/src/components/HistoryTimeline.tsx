import { useState } from 'react';
import { fetchPublishHistory } from '../lib/api.ts';
import type { SyncEvent, HistoryResponse } from '../lib/types.ts';

type Props = {
  events: SyncEvent[];
  meta: HistoryResponse['meta'];
  dealerId: string;
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
  ACCOUNT_UPDATED:     { bg: 'bg-slate-100 text-slate-500',   label: 'Account' },
  POLICY_CHANGED:      { bg: 'bg-slate-100 text-slate-500',   label: 'Policy' },
  PARTNER_FOLLOWUP:    { bg: 'bg-slate-100 text-slate-500',   label: 'Partner' }
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function HistoryTimeline({ events: initialEvents, meta: initialMeta, dealerId }: Props) {
  const [events, setEvents] = useState(initialEvents);
  const [meta, setMeta] = useState(initialMeta);
  const [loading, setLoading] = useState(false);

  const loadMore = async () => {
    if (!meta.nextCursor || loading) return;
    setLoading(true);
    try {
      const r = await fetchPublishHistory(dealerId, { before: meta.nextCursor, limit: 30 });
      setEvents(prev => [...prev, ...r.events]);
      setMeta(r.meta);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Publish History
        </h2>
      </div>

      {events.length === 0 ? (
        <div className="px-5 py-8 text-center text-slate-400 text-sm">No events recorded yet</div>
      ) : (
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {events.map(e => <EventRow key={e.id} event={e} />)}
          {meta.hasMore && (
            <div className="px-5 py-3 border-t border-slate-50 text-center">
              <button
                onClick={() => void loadMore()}
                disabled={loading}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:opacity-40"
              >
                {loading ? 'Loading…' : 'Load more'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EventRow({ event: e }: { event: SyncEvent }) {
  const k = KIND_STYLES[e.kind] ?? { bg: 'bg-slate-100 text-slate-500', label: e.kind };
  return (
    <div className="px-5 py-2.5 flex items-start gap-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
      <span className={`px-1.5 py-0.5 rounded text-xs font-medium shrink-0 mt-0.5 ${k.bg}`}>
        {k.label}
      </span>
      <div className="flex-1 min-w-0">
        {e.platformSlug && (
          <div className="text-xs font-medium text-slate-700 truncate">{e.platformSlug}</div>
        )}
        {!e.platformSlug && e.vehicleId && (
          <div className="text-xs font-mono text-slate-400 truncate">vehicle:{e.vehicleId.slice(-8)}</div>
        )}
      </div>
      <time className="text-xs text-slate-300 shrink-0 whitespace-nowrap font-mono" title={e.createdAt}>
        {relativeTime(e.createdAt)}
      </time>
    </div>
  );
}
