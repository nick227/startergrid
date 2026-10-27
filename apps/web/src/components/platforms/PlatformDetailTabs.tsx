import { useState } from 'react';
import type { PlatformPublishResult, PlatformAccountDetail, PlatformPerformanceItem, SyncEvent } from '@/lib/types.ts';
import { timeAgo } from '@/lib/timeAgo.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { fetchPublishHistory, updateAccount } from '@/lib/api/sdk.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';

export const EVENT_KIND_LABELS: Record<string, string> = {
  INVENTORY_CHANGE:   'Inventory updated',
  VEHICLE_SOLD:       'Vehicle sold',
  VEHICLE_REMOVED:    'Vehicle removed',
  ARTIFACT_GENERATED: 'Feed generated',
  SUBMISSION_SENT:    'Send completed',
  DISPATCH_CLAIMED:   'Send started',
  APPROVAL_REQUESTED: 'Approval requested',
  APPROVAL_GRANTED:   'Approval approved',
  ACCOUNT_UPDATED:    'Channel settings updated',
};

export function ActivityTab({ dealerId, platformSlug, nav }: { dealerId: string; platformSlug: string; nav: OperatorNavHandlers }) {
  const { data, loading, error } = useAsyncQuery(
    () => fetchPublishHistory(dealerId, { platformSlug, limit: 15 }),
    [dealerId, platformSlug]
  );

  if (loading) return <p className="text-xs text-ink-faint py-4 text-center">Loading…</p>;
  if (error) return <p className="text-xs text-status-error-text py-4">{error}</p>;

  const events = data?.events ?? [];
  if (!events.length) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-ink-faint">No activity yet for this destination.</p>
        <button
          type="button"
          onClick={() => nav.goToPlatformHistory(platformSlug)}
          className="mt-2 text-xs text-orange-600 font-semibold hover:underline"
        >
          View full history →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {events.map((e: SyncEvent) => (
        <div key={e.id} className="flex items-start justify-between gap-2 py-1.5 border-b border-silver-100 last:border-0">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ink-body">{EVENT_KIND_LABELS[e.kind] ?? e.kind}</p>
            {e.vehicleId && (
              <p className="text-[10px] text-ink-faint truncate">vehicle {e.vehicleId.slice(-6)}</p>
            )}
          </div>
          <span className="text-[10px] text-ink-faint shrink-0 tabular-nums">{timeAgo(e.createdAt)}</span>
        </div>
      ))}
      {data?.meta.hasMore && (
        <button
          type="button"
          onClick={() => nav.goToPlatformHistory(platformSlug)}
          className="w-full text-xs text-orange-600 font-semibold hover:underline pt-2"
        >
          View full history →
        </button>
      )}
    </div>
  );
}

export function FeedTab({ perf, platform }: { perf: PlatformPerformanceItem | null; platform: PlatformPublishResult }) {
  if (!perf || perf.vehiclesListed === 0) {
    return (
      <div className="text-center py-6 bg-white border border-silver-200 rounded-xl p-6">
        <p className="text-sm text-ink-faint">
          {platform.state === 'Active'
            ? 'No results yet — these numbers update on a daily schedule.'
            : 'Connect this destination to start seeing how listings are doing.'}
        </p>
      </div>
    );
  }

  const stats: Array<{ label: string; value: string | number }> = [
    { label: 'Listings', value: perf.vehiclesListed },
    { label: 'Leads', value: perf.totalLeads },
    { label: 'Avg days listed', value: perf.avgDaysOnPlatform != null ? `${Math.round(perf.avgDaysOnPlatform)}d` : '—' },
    { label: 'Avg days to move', value: perf.avgDaysToMove != null ? `${Math.round(perf.avgDaysToMove)}d` : '—' },
    { label: 'Leads / vehicle', value: perf.leadsPerVehicle != null ? perf.leadsPerVehicle.toFixed(1) : '—' },
    { label: 'Data as of', value: timeAgo(perf.computedAt) },
  ];

  return (
    <div className="space-y-4 bg-white border border-silver-200 rounded-xl p-6">
      <h3 className="text-sm font-bold text-ink-heading border-b border-silver-100 pb-2">Listing Performance</h3>
      <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
        {stats.map(s => (
          <div key={s.label}>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{s.label}</dt>
            <dd className="text-lg font-bold text-ink-heading tabular-nums mt-0.5">{s.value}</dd>
          </div>
        ))}
      </dl>
      {perf.channelMetrics && Object.keys(perf.channelMetrics).length > 0 && (
        <div className="border-t border-silver-100 pt-4 mt-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint mb-3">Channel signals</p>
          <dl className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-2">
            {Object.entries(perf.channelMetrics).map(([key, m]) => m && (
              <div key={key}>
                <dt className="text-xs text-ink-faint capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</dt>
                <dd className="text-sm font-semibold text-ink-body">{m.count.toLocaleString()}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

export function NotesTab({ account, dealerId, onSaved }: { account: PlatformAccountDetail; dealerId: string; onSaved: () => void }) {
  const [notes, setNotes] = useState(account.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateAccount(dealerId, account.platformSlug, { notes });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 bg-white border border-silver-200 rounded-xl p-6">
      <h3 className="text-sm font-bold text-ink-heading border-b border-silver-100 pb-2">Internal Dealership Notes</h3>
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={6}
        placeholder="Internal notes about this platform account, rep contacts, or store policies…"
        className="field-input resize-y w-full"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="px-4 py-2 text-xs font-bold rounded-lg bg-navy-900 text-white hover:bg-navy-800 disabled:opacity-50 transition-colors shadow-sm"
        >
          {saving ? 'Saving…' : 'Save notes'}
        </button>
        {saved && <span className="text-xs text-green-600 font-semibold">Saved ✓</span>}
      </div>
    </div>
  );
}
