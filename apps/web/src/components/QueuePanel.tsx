import { useState } from 'react';
import type { QueueItemView, QueueView } from '../lib/types.ts';

type Props = {
  queue: QueueView | null;
  loading: boolean;
  error: string | null;
  onRetry: () => void;
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function dueIn(iso: string): string {
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return 'overdue';
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `in ${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `in ${hrs}h`;
  return `in ${Math.floor(hrs / 24)}d`;
}

function nextDueTime(items: QueueItemView[]): string | null {
  const scheduled = items
    .filter(i => i.status === 'SCHEDULED' && i.scheduledFor)
    .sort((a, b) => new Date(a.scheduledFor!).getTime() - new Date(b.scheduledFor!).getTime());
  if (!scheduled.length) return null;
  return new Date(scheduled[0]!.scheduledFor!).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

import { queueStatusVisual } from '../lib/statusRegistry.ts';

function StatusDot({ status }: { status: string }) {
  const v = queueStatusVisual(status);
  return <span className={`w-2 h-2 rounded-full shrink-0 inline-block ${v.dot}`} />;
}

function QueueRow({ item, showAdvanced }: { item: QueueItemView; showAdvanced: boolean }) {
  const vehicle = item.vehicleTitle
    ? `${item.stockNumber} — ${item.vehicleTitle}`
    : item.stockNumber ?? '—';

  return (
    <div className="px-4 py-2.5 flex items-start gap-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
      <StatusDot status={item.status} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-800 truncate">{item.platformName}</span>
          <span className="text-xs text-slate-400">{item.triggerKind.toLowerCase().replace(/_/g, ' ')}</span>
        </div>
        {item.vehicleId && (
          <div className="text-xs text-slate-400 font-mono truncate">{vehicle}</div>
        )}
        {item.approvalRequiredReason && (
          <div className="text-xs text-amber-600 mt-0.5 truncate">{item.approvalRequiredReason}</div>
        )}
        {item.holdReason && (
          <div className="text-xs text-amber-700 mt-0.5">Hold: {item.holdReason}</div>
        )}
        {item.blockReason && (
          <div className="text-xs text-red-600 mt-0.5">{item.blockReason}</div>
        )}
        {showAdvanced && (
          <div className="text-xs text-slate-300 font-mono mt-0.5 truncate">{item.id}</div>
        )}
      </div>
      <div className="text-right shrink-0">
        {item.scheduledFor && item.status === 'SCHEDULED' && (
          <span className="text-xs text-blue-600 font-medium">{dueIn(item.scheduledFor)}</span>
        )}
        {item.status === 'READY' && (
          <span className="text-xs text-emerald-600 font-medium">next run</span>
        )}
        {item.status === 'CLAIMED' && item.claimedBy && (
          <span className="text-xs text-violet-500 font-mono truncate max-w-20 block">{item.claimedBy.slice(-8)}</span>
        )}
        {(item.status === 'SENT' || item.status === 'FAILED') && item.sentAt && (
          <span className="text-xs text-slate-300 font-mono">{relativeTime(item.sentAt)}</span>
        )}
        {showAdvanced && (
          <span className="text-xs text-slate-300 font-mono block">p{item.priority}</span>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ label, count, accent }: { label: string; count: number; accent: string }) {
  return (
    <div className={`px-4 py-1.5 flex items-center gap-2 bg-slate-50 border-b border-slate-100`}>
      <span className={`text-xs font-semibold uppercase tracking-wider ${accent}`}>{label}</span>
      <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold ${accent} bg-white border border-current opacity-60`}>
        {count}
      </span>
    </div>
  );
}

export default function QueuePanel({ queue, loading, error, onRetry }: Props) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const attentionItems = queue
    ? [...queue.overdue, ...queue.pending.filter(i => i.status === 'NEEDS_APPROVAL' || i.status === 'HELD')]
    : [];
  const inProgressItems = queue?.claimed ?? [];
  const upcomingItems = queue
    ? [...queue.pending.filter(i => i.status === 'READY'), ...queue.pending.filter(i => i.status === 'SCHEDULED').sort((a, b) => new Date(a.scheduledFor ?? 0).getTime() - new Date(b.scheduledFor ?? 0).getTime())]
    : [];
  const recentItems = queue
    ? queue.terminal.filter(i => i.status === 'SENT' || i.status === 'FAILED').slice(0, 5)
    : [];

  const totalPending = queue ? queue.pending.length + queue.claimed.length + queue.overdue.length + queue.retryPending.length : 0;
  const nextDue = queue ? nextDueTime(queue.pending) : null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Queue & Scheduler</h2>
          {queue && totalPending > 0 && (
            <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-semibold rounded-full">
              {totalPending}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdvanced(v => !v)}
          className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
        >
          {showAdvanced ? 'Hide advanced' : 'Show advanced'}
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="px-5 py-4 flex items-center justify-between bg-red-50 border-b border-red-100">
          <span className="text-xs text-red-600">Could not load queue — {error}</span>
          <button onClick={onRetry} className="text-xs text-red-600 underline">Retry</button>
        </div>
      )}

      {/* Skeleton */}
      {loading && !queue && (
        <div className="p-4 space-y-2">
          {[80, 60, 90, 70].map((w, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-slate-200 animate-pulse shrink-0" />
              <div className={`h-3 bg-slate-100 rounded animate-pulse`} style={{ width: `${w}%` }} />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && queue && totalPending === 0 && (
        <div className="px-5 py-8 text-center">
          <div className="text-2xl mb-2">✓</div>
          <div className="text-sm font-medium text-slate-600">Queue is clean</div>
          <div className="text-xs text-slate-400 mt-1">
            {queue.summary.sent > 0
              ? `${queue.summary.sent} item${queue.summary.sent !== 1 ? 's' : ''} dispatched`
              : 'Nothing pending dispatch'}
          </div>
        </div>
      )}

      {/* Content */}
      {queue && totalPending > 0 && (
        <div className="divide-y divide-slate-50">
          {/* Section A: Needs attention */}
          {attentionItems.length > 0 && (
            <div>
              <SectionHeader label="Needs attention" count={attentionItems.length} accent="text-amber-600" />
              {attentionItems.map(item => (
                <QueueRow key={item.id} item={item} showAdvanced={showAdvanced} />
              ))}
            </div>
          )}

          {/* Section B: In progress */}
          {inProgressItems.length > 0 && (
            <div>
              <SectionHeader label="In progress" count={inProgressItems.length} accent="text-violet-600" />
              {inProgressItems.map(item => (
                <QueueRow key={item.id} item={item} showAdvanced={showAdvanced} />
              ))}
            </div>
          )}

          {/* Section C: Upcoming */}
          {upcomingItems.length > 0 && (
            <div>
              <SectionHeader label="Upcoming" count={upcomingItems.length} accent="text-blue-600" />
              {upcomingItems.map(item => (
                <QueueRow key={item.id} item={item} showAdvanced={showAdvanced} />
              ))}
            </div>
          )}

          {/* Section D: Recent (only if nothing in attention/in-progress to avoid noise) */}
          {attentionItems.length === 0 && inProgressItems.length === 0 && recentItems.length > 0 && (
            <div>
              <SectionHeader label="Recently dispatched" count={recentItems.length} accent="text-slate-500" />
              {recentItems.map(item => (
                <QueueRow key={item.id} item={item} showAdvanced={showAdvanced} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Footer summary */}
      {queue && (totalPending > 0 || queue.summary.sent > 0) && (
        <div className="px-5 py-2.5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {totalPending > 0 ? `${totalPending} pending` : 'Queue clear'}
            {nextDue && ` · next dispatch ${nextDue}`}
          </span>
          {queue.retryPending.length > 0 && (
            <span className="text-xs text-amber-600">
              {queue.retryPending.length} retry eligible
            </span>
          )}
        </div>
      )}
    </div>
  );
}
