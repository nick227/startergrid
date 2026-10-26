import { useState, useMemo } from 'react';
import { DealershipAutopilot } from '@/components/guidance/DealershipAutopilot.tsx';
import { OwnershipLine } from '@/components/guidance/OwnershipLine.tsx';
import { GuidanceNote } from '@/components/guidance/GuidanceNote.tsx';
import type {
  PlatformPublishResult,
  PlatformAccountDetail,
  PlatformPerformanceItem,
  SelectedSocialPage,
  PlatformQueueStats,
} from '@/lib/types.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { PlatformLogo } from './PlatformLogo.tsx';
import { PlatformDetailDrawer } from './PlatformDetailDrawer.tsx';
import { platformDisplayName, AUTO_MARKETPLACE_SLUG } from '@/lib/marketplaceBrand.ts';
import { getSetupReadiness } from '@/lib/setupReadiness.ts';

type Props = {
  platforms: PlatformPublishResult[];
  perfBySlug: Map<string, PlatformPerformanceItem>;
  accountBySlug: Map<string, PlatformAccountDetail>;
  socialPageBySlug?: Map<string, SelectedSocialPage>;
  queueStatsBySlug?: Map<string, PlatformQueueStats>;
  dealerId: string;
  nav: OperatorNavHandlers;
  selectedSlug: string | null;
  onSelectSlug: (slug: string | null) => void;
  onAccountSaved: () => void;
  onPlatformConnected?: (platformSlug: string) => void;
  loading?: boolean;
  emptyMessage: string;
};

type ChannelFilter = 'all' | 'active' | 'setup' | 'attention';

export function SimplifiedChannelsView({
  platforms,
  perfBySlug,
  accountBySlug,
  socialPageBySlug: _socialPageBySlug,
  queueStatsBySlug: _queueStatsBySlug,
  dealerId,
  nav,
  selectedSlug,
  onSelectSlug,
  onAccountSaved,
  onPlatformConnected: _onPlatformConnected,
  emptyMessage,
}: Props) {
  const [filter, setFilter] = useState<ChannelFilter>('all');
  const [search, setSearch] = useState('');
  const [expandedAdvanced, setExpandedAdvanced] = useState<Record<string, boolean>>({});

  // Toggle advanced drawer per channel
  const toggleAdvanced = (slug: string) => {
    setExpandedAdvanced(prev => ({ ...prev, [slug]: !prev[slug] }));
  };

  // Channel classification and active checks
  const channelList = useMemo(() => {
    return platforms.map(p => {
      const account = accountBySlug.get(p.platformSlug) ?? null;
      const readiness = getSetupReadiness(p, account);
      const isConnected =
        p.accountState === 'ACTIVE' ||
        p.state === 'Active' ||
        p.state === 'Ready' ||
        p.state === 'Scheduled';
      const hasErrors = readiness.severity === 'critical' || p.accountState === 'ERROR';
      const isFirstParty = p.platformSlug === AUTO_MARKETPLACE_SLUG;

      let statusCategory: 'active' | 'setup' | 'attention' = 'setup';
      if (hasErrors) statusCategory = 'attention';
      else if (isConnected) statusCategory = 'active';

      return {
        platform: p,
        account,
        readiness,
        isConnected,
        hasErrors,
        isFirstParty,
        statusCategory,
      };
    });
  }, [platforms, accountBySlug]);

  const activeCount = channelList.filter(c => c.isConnected).length;
  const attentionCount = channelList.filter(c => c.hasErrors).length;
  const setupCount = channelList.filter(c => !c.isConnected && !c.hasErrors).length;

  const filteredChannels = useMemo(() => {
    let list = channelList;
    if (filter === 'active') list = list.filter(c => c.isConnected);
    else if (filter === 'attention') list = list.filter(c => c.hasErrors);
    else if (filter === 'setup') list = list.filter(c => !c.isConnected);

    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        c =>
          c.platform.platformName.toLowerCase().includes(q) ||
          c.platform.platformSlug.toLowerCase().includes(q),
      );
    }
    return list;
  }, [channelList, filter, search]);

  const selectedPlatform = platforms.find(p => p.platformSlug === selectedSlug) ?? null;

  return (
    <div className="space-y-6">
      <DealershipAutopilot dealerId={dealerId} connectedChannelCount={activeCount} />

      {/* 2. Filter Pills & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { id: 'all' as ChannelFilter, label: 'All Channels', count: platforms.length },
            { id: 'active' as ChannelFilter, label: 'Active & Synced', count: activeCount },
            { id: 'attention' as ChannelFilter, label: 'Needs Attention', count: attentionCount },
            { id: 'setup' as ChannelFilter, label: 'Setup Needed', count: setupCount },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                filter === f.id
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'bg-silver-100 text-ink-muted hover:text-ink-heading hover:bg-silver-200'
              }`}
            >
              <span>{f.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                  filter === f.id ? 'bg-navy-800 text-silver-300' : 'bg-silver-200 text-ink-faint'
                }`}
              >
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search channels..."
          className="px-3 py-1.5 text-xs border border-silver-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-500 w-52 bg-white"
        />
      </div>

      {/* 3. Destination Channel Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredChannels.map(({ platform, isConnected, hasErrors, isFirstParty }) => {
          const isAdvancedOpen = expandedAdvanced[platform.platformSlug] ?? false;

          return (
            <div
              key={platform.platformSlug}
              className={`p-5 rounded-xl border transition-all ${
                hasErrors
                  ? 'border-amber-300 bg-amber-50/20'
                  : isConnected
                  ? 'border-silver-200 bg-white hover:border-silver-300 shadow-elevation-1'
                  : 'border-silver-200 bg-silver-50/60'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="pt-0.5 shrink-0">
                    <PlatformLogo slug={platform.platformSlug} name={platform.platformName} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-sm font-bold text-ink-heading">
                        {platformDisplayName(platform.platformSlug, platform.platformName)}
                      </h3>
                      {isFirstParty && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold uppercase bg-blue-100 text-blue-800 border border-blue-200">
                          1st Party
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-ink-muted mt-0.5 line-clamp-2">
                      {isFirstParty
                        ? 'First-party Auto Marketplace listing destination'
                        : isConnected
                        ? 'Connected. Connected is not the same as live.'
                        : 'Our team turns this on after it qualifies.'}
                    </p>
                  </div>
                </div>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                    hasErrors
                      ? 'bg-status-warning-bg text-status-warning-text border-status-warning-border'
                      : isConnected
                      ? 'bg-status-success-bg text-status-success-text border-status-success-border'
                      : 'bg-silver-100 text-ink-muted border-silver-300'
                  }`}
                >
                  {hasErrors ? 'Action Needed' : isConnected ? '● Active' : '○ Setup Needed'}
                </span>
              </div>

              {hasErrors && (
                <div className="mt-3">
                  <OwnershipLine
                    action={`Fix ${platformDisplayName(platform.platformSlug, platform.platformName)}`}
                    ownerKind="YOU"
                    due="today"
                  />
                </div>
              )}

              <div className="mt-4 pt-3 border-t border-silver-200/70 flex items-center justify-between text-xs">
                <GuidanceNote>Connection status only. Publication needs a verified result.</GuidanceNote>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleAdvanced(platform.platformSlug)}
                    className="text-[11px] font-semibold text-ink-muted hover:text-ink-heading flex items-center gap-1"
                  >
                    <span>{isAdvancedOpen ? 'Hide Advanced ▲' : 'Advanced ▾'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectSlug(platform.platformSlug)}
                    className="px-3 py-1 text-xs font-bold rounded-md bg-navy-900 hover:bg-navy-800 text-white shadow-sm"
                  >
                    Manage →
                  </button>
                </div>
              </div>

              {/* Contextual Advanced Settings Drawer (Progressively Disclosed) */}
              {isAdvancedOpen && (
                <div className="mt-3 pt-3 border-t border-silver-200 bg-silver-50 -mx-5 -mb-5 p-4 rounded-b-xl space-y-2 text-xs">
                  <div className="flex items-center justify-between font-mono text-[11px] text-ink-faint">
                    <span>Slug: {platform.platformSlug}</span>
                    <span>State: {platform.state || 'Active'}</span>
                  </div>
                  <div className="p-2 bg-white rounded border border-silver-200 font-mono text-[11px] text-ink-body break-all">
                    Feed Endpoint: /api/dealers/{dealerId}/platforms/{platform.platformSlug}/feed
                  </div>
                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => nav.goToPlatformDetail(platform.platformSlug)}
                      className="px-2.5 py-1 text-[11px] font-semibold rounded border border-silver-300 bg-white text-ink-heading hover:bg-silver-100"
                    >
                      Channel details
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredChannels.length === 0 && (
          <div className="col-span-2 p-12 text-center bg-white rounded-xl border border-silver-200">
            <p className="text-sm font-semibold text-ink-heading">No channels found</p>
            <p className="text-xs text-ink-muted mt-1">{emptyMessage}</p>
          </div>
        )}
      </div>

      {/* Platform Detail Drawer (preserved from original working implementation) */}
      {selectedPlatform && (
        <PlatformDetailDrawer
          platform={selectedPlatform}
          account={accountBySlug.get(selectedPlatform.platformSlug) ?? null}
          perf={perfBySlug.get(selectedPlatform.platformSlug) ?? null}
          dealerId={dealerId}
          nav={nav}
          open={Boolean(selectedPlatform)}
          onClose={() => onSelectSlug(null)}
          onSaved={onAccountSaved}
        />
      )}
    </div>
  );
}
