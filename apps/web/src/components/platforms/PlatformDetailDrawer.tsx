import { useState } from 'react';
import type { PlatformPublishResult, PlatformAccountDetail, PlatformPerformanceItem, SyncEvent } from '@/lib/types.ts';
import { friendlyPlatformDetail, platformOutcomeMeta } from '@/lib/syncPresentation.ts';
import { platformConnectionWithAccount } from '@/lib/platformPresentation.ts';
import { timeAgo } from '@/lib/timeAgo.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { AccountEditForm } from './AccountEditForm.tsx';
import { PlatformLogo } from './PlatformLogo.tsx';
import { CatalogSyncPanel } from './CatalogSyncPanel.tsx';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { RowDetailDrawer } from '@/components/layout';
import { fetchPublishHistory, updateAccount } from '@/lib/api/sdk.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { SocialPageSelector, SocialPostsTab } from '@/components/social/index.ts';

const SOCIAL_SLUGS = new Set(['facebook-business-page', 'google-business-profile']);
const CATALOG_SLUGS = new Set([
  'meta-automotive-ads', 'google-vehicle-ads', 'tiktok-automotive-ads',
  'microsoft-automotive-ads', 'pinterest-shopping-ads',
  'snapchat-dynamic-product-ads', 'reddit-dynamic-product-ads',
  'tiktok-shop',
]);

type Tab = 'setup' | 'feed' | 'activity' | 'notes' | 'social' | 'catalog';

type Props = {
  platform: PlatformPublishResult;
  account: PlatformAccountDetail | null;
  perf: PlatformPerformanceItem | null;
  dealerId: string;
  nav: OperatorNavHandlers;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

const EVENT_KIND_LABELS: Record<string, string> = {
  INVENTORY_CHANGE:   'Inventory updated',
  VEHICLE_SOLD:       'Vehicle sold',
  VEHICLE_REMOVED:    'Vehicle removed',
  ARTIFACT_GENERATED: 'Feed generated',
  SUBMISSION_SENT:    'Submission sent',
  ACCOUNT_UPDATED:    'Account updated',
};

function ActivityTab({ dealerId, platformSlug, nav }: { dealerId: string; platformSlug: string; nav: OperatorNavHandlers }) {
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
        <p className="text-xs text-ink-faint">No activity yet for this platform.</p>
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

function FeedTab({ perf, platform }: { perf: PlatformPerformanceItem | null; platform: PlatformPublishResult }) {
  if (!perf || perf.vehiclesListed === 0) {
    return (
      <div className="text-center py-6">
        <p className="text-xs text-ink-faint">
          {platform.state === 'Active'
            ? 'No feed data yet — performance data is computed on a daily schedule.'
            : 'Connect this platform to start seeing feed health data.'}
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
    <div className="space-y-3">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
        {stats.map(s => (
          <div key={s.label}>
            <dt className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">{s.label}</dt>
            <dd className="text-sm font-semibold text-ink-heading tabular-nums">{s.value}</dd>
          </div>
        ))}
      </dl>
      {perf.channelMetrics && Object.keys(perf.channelMetrics).length > 0 && (
        <div className="border-t border-silver-100 pt-3">
          <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint mb-2">Channel signals</p>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
            {Object.entries(perf.channelMetrics).map(([key, m]) => m && (
              <div key={key}>
                <dt className="text-[10px] text-ink-faint capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</dt>
                <dd className="text-xs font-medium text-ink-body">{m.count.toLocaleString()}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </div>
  );
}

function NotesTab({ account, dealerId, onSaved }: { account: PlatformAccountDetail; dealerId: string; onSaved: () => void }) {
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
    <div className="space-y-3">
      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        rows={6}
        placeholder="Internal notes about this platform…"
        className="field-input resize-y w-full"
      />
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={saving}
          onClick={() => void handleSave()}
          className="px-3 py-1.5 text-xs font-bold rounded-md bg-navy-600 text-white hover:bg-navy-700 disabled:opacity-50"
        >
          {saving ? 'Saving…' : 'Save notes'}
        </button>
        {saved && <span className="text-xs text-green-600 font-medium">Saved ✓</span>}
      </div>
    </div>
  );
}

function buildTabs(platformSlug: string): Array<{ key: Tab; label: string }> {
  const tabs: Array<{ key: Tab; label: string }> = [
    { key: 'setup', label: 'Setup' },
    { key: 'feed', label: 'Feed' },
    { key: 'activity', label: 'Activity' },
    { key: 'notes', label: 'Notes' },
  ];
  if (SOCIAL_SLUGS.has(platformSlug)) {
    tabs.splice(1, 0, { key: 'social', label: 'Social' });
  }
  if (CATALOG_SLUGS.has(platformSlug)) {
    tabs.splice(tabs.length - 1, 0, { key: 'catalog', label: 'Catalog' });
  }
  return tabs;
}

export function PlatformDetailDrawer({
  platform,
  account,
  perf,
  dealerId,
  nav,
  open,
  onClose,
  onSaved,
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('setup');
  const tabs = buildTabs(platform.platformSlug);
  const conn = platformConnectionWithAccount(platform, account);
  const publish = platformOutcomeMeta(platform);
  const detail = friendlyPlatformDetail(platform);

  return (
    <RowDetailDrawer open={open} title={platform.platformName} onClose={onClose}>
      <div className="space-y-4">

        {/* Header summary */}
        <div className="flex items-center gap-3">
          <PlatformLogo slug={platform.platformSlug} name={platform.platformName} size="sm" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${conn.pill}`}>
                {conn.label}
              </span>
              <span className="text-[10px] text-ink-faint">{publish.label}</span>
            </div>
            {detail && <p className="text-[11px] text-ink-faint mt-0.5 truncate">{detail}</p>}
          </div>
        </div>

        {/* Tab strip */}
        <div className="flex border-b border-silver-200">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
                activeTab === tab.key
                  ? 'border-navy-600 text-navy-700'
                  : 'border-transparent text-ink-muted hover:text-ink-body'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'setup' && (
          account ? (
            <AccountEditForm
              account={account}
              dealerId={dealerId}
              onSaved={onSaved}
            />
          ) : (
            <p className="text-xs text-ink-muted">{operatorCopy.drawer.accountLoading}</p>
          )
        )}

        {activeTab === 'feed' && (
          <FeedTab perf={perf} platform={platform} />
        )}

        {activeTab === 'activity' && (
          <ActivityTab dealerId={dealerId} platformSlug={platform.platformSlug} nav={nav} />
        )}

        {activeTab === 'notes' && account && (
          <NotesTab account={account} dealerId={dealerId} onSaved={onSaved} />
        )}
        {activeTab === 'notes' && !account && (
          <p className="text-xs text-ink-muted">{operatorCopy.drawer.accountLoading}</p>
        )}

        {activeTab === 'social' && (
          <div className="space-y-6">
            <SocialPageSelector
              dealerId={dealerId}
              platformSlug={platform.platformSlug}
              platformName={platform.platformName}
              onPageSelected={onSaved}
            />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wide text-ink-faint mb-3">Post history</p>
              <SocialPostsTab dealerId={dealerId} platformSlug={platform.platformSlug} />
            </div>
          </div>
        )}

        {activeTab === 'catalog' && (
          <CatalogSyncPanel dealerId={dealerId} platformSlug={platform.platformSlug} />
        )}

      </div>
    </RowDetailDrawer>
  );
}
