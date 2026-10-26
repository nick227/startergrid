import { useState, useMemo } from 'react';
import { DealershipAutopilot } from '@/components/guidance/DealershipAutopilot.tsx';
import { GuidanceNote } from '@/components/guidance/GuidanceNote.tsx';
import type {
  PlatformPublishResult,
  PlatformAccountDetail,
  PlatformPerformanceItem,
  SelectedSocialPage,
  PlatformQueueStats,
} from '@/lib/types.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { PlatformDetailDrawer } from './PlatformDetailDrawer.tsx';
import { ChannelDestinationCard } from './ChannelDestinationCard.tsx';
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
  storefrontHref?: string;
};

type ChannelFilter = 'all' | 'connected' | 'setup' | 'attention';

export function SimplifiedChannelsView({
  platforms,
  perfBySlug,
  accountBySlug,
  dealerId,
  nav,
  selectedSlug,
  onSelectSlug,
  onAccountSaved,
  loading,
  emptyMessage,
  storefrontHref,
}: Props) {
  const [filter, setFilter] = useState<ChannelFilter>('all');
  const [search, setSearch] = useState('');

  const channelList = useMemo(() => {
    return platforms.map(platform => {
      const account = accountBySlug.get(platform.platformSlug) ?? null;
      const readiness = getSetupReadiness(platform, account);
      const isConnected =
        platform.accountState === 'ACTIVE' ||
        platform.state === 'Active' ||
        platform.state === 'Ready' ||
        platform.state === 'Scheduled';
      const hasErrors = readiness.severity === 'critical' || platform.accountState === 'ERROR';
      return { platform, account, isConnected, hasErrors };
    });
  }, [platforms, accountBySlug]);

  const connectedCount = channelList.filter(c => c.isConnected).length;
  const attentionCount = channelList.filter(c => c.hasErrors).length;
  const setupCount = channelList.filter(c => !c.isConnected && !c.hasErrors).length;

  const filteredChannels = useMemo(() => {
    let list = channelList;
    if (filter === 'connected') list = list.filter(c => c.isConnected);
    else if (filter === 'attention') list = list.filter(c => c.hasErrors);
    else if (filter === 'setup') list = list.filter(c => !c.isConnected && !c.hasErrors);

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
  const firstTime = !loading && platforms.length > 0 && connectedCount === 0;

  return (
    <div className="space-y-6">
      <DealershipAutopilot dealerId={dealerId} connectedChannelCount={connectedCount} />

      {firstTime && (
        <GuidanceNote>
          A channel is a place shoppers can see your vehicles, such as Google or Facebook. Connect one to get started. Autopilot stays off until our team turns it on after that destination qualifies.
        </GuidanceNote>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="Channel filters">
          {[
            { id: 'all' as ChannelFilter, label: 'All', count: platforms.length },
            { id: 'connected' as ChannelFilter, label: 'Connected', count: connectedCount },
            { id: 'attention' as ChannelFilter, label: 'Needs a fix', count: attentionCount },
            { id: 'setup' as ChannelFilter, label: 'Not connected', count: setupCount },
          ].map(f => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                filter === f.id
                  ? 'bg-navy-900 text-white shadow-sm'
                  : 'bg-silver-100 text-ink-muted hover:text-ink-heading hover:bg-silver-200'
              }`}
            >
              <span>{f.label}</span>
              <span className={`px-1.5 rounded-full text-[10px] font-mono ${
                filter === f.id ? 'bg-navy-800 text-silver-300' : 'bg-silver-200 text-ink-faint'
              }`}>
                {f.count}
              </span>
            </button>
          ))}
        </div>

        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Find a destination…"
          className="px-3 py-1.5 text-xs border border-silver-300 rounded-md focus:outline-none focus:ring-2 focus:ring-navy-500 w-52 bg-white"
        />
      </div>

      {loading && (
        <p className="text-sm text-ink-muted">Loading destinations…</p>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredChannels.map(({ platform, account }) => (
          <ChannelDestinationCard
            key={platform.platformSlug}
            platform={platform}
            account={account}
            dealerId={dealerId}
            storefrontHref={storefrontHref}
            onOpen={() => onSelectSlug(platform.platformSlug)}
          />
        ))}

        {!loading && filteredChannels.length === 0 && (
          <div className="col-span-2 p-12 text-center bg-white rounded-xl border border-silver-200">
            <p className="text-sm font-semibold text-ink-heading">No destinations in this list</p>
            <p className="text-xs text-ink-muted mt-1">{emptyMessage}</p>
          </div>
        )}
      </div>

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
