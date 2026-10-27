import { useMemo, useState } from 'react';
import { DealershipAutopilot } from '@/components/guidance/DealershipAutopilot.tsx';
import { PagePrimaryState } from '@/components/guidance/PagePrimaryState.tsx';
import type {
  PlatformPublishResult,
  PlatformAccountDetail,
  PlatformPerformanceItem,
  SelectedSocialPage,
  PlatformQueueStats,
} from '@/lib/types.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { channelExperience } from '@/lib/pagePrimaryState.ts';
import { AUTO_MARKETPLACE_SLUG, platformDisplayName } from '@/lib/marketplaceBrand.ts';
import { getSetupReadiness } from '@/lib/setupReadiness.ts';
import { PlatformDetailDrawer } from './PlatformDetailDrawer.tsx';
import { ChannelDestinationCard } from './ChannelDestinationCard.tsx';
import { SyndicationSentryCard } from './SyndicationSentryCard.tsx';

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

type Row = {
  platform: PlatformPublishResult;
  account: PlatformAccountDetail | null;
  isConnected: boolean;
  hasErrors: boolean;
};

function nameOf(row: Row): string {
  return platformDisplayName(row.platform.platformSlug, row.platform.platformName);
}

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
  const [showRest, setShowRest] = useState(false);

  const rows = useMemo<Row[]>(() => platforms.map(platform => {
    const account = accountBySlug.get(platform.platformSlug) ?? null;
    const readiness = getSetupReadiness(platform, account);
    const isConnected =
      platform.accountState === 'ACTIVE' ||
      platform.state === 'Active' ||
      platform.state === 'Ready' ||
      platform.state === 'Scheduled';
    return {
      platform,
      account,
      isConnected,
      hasErrors: readiness.severity === 'critical' || platform.accountState === 'ERROR',
    };
  }), [platforms, accountBySlug]);

  const connected = rows.filter(r => r.isConnected);
  const attention = rows.filter(r => r.hasErrors);
  const setup = rows.filter(r => !r.isConnected && !r.hasErrors);
  const experience = channelExperience({
    connected: connected.length,
    attention: attention.length,
    setup: setup.length,
    total: rows.length,
  });

  const sortedConnected = [...connected].sort((a, b) => {
    if (a.platform.platformSlug === AUTO_MARKETPLACE_SLUG) return -1;
    if (b.platform.platformSlug === AUTO_MARKETPLACE_SLUG) return 1;
    return 0;
  });

  const starter = (experience === 'attention' ? attention[0] : sortedConnected[0]) ?? rows[0];
  const starterName = starter ? nameOf(starter) : 'a destination';
  const selectedPlatform = platforms.find(p => p.platformSlug === selectedSlug) ?? null;

  return (
    <div className="space-y-5">
      {experience === 'empty' && (
        <PagePrimaryState
          kind="empty"
          title="Connect a place shoppers look"
          why="Vehicles stay on your lot until a destination is connected. Start with one. You can add more later."
          next={`Connect ${starterName}.`}
          ownerKind="YOU"
          actionLabel={`Connect ${starterName}`}
          onAction={() => starter && onSelectSlug(starter.platform.platformSlug)}
        />
      )}
      {attention.length > 0 && (
        <PagePrimaryState
          kind="attention"
          title={attention.length === 1 ? `${nameOf(attention[0]!)} needs a fix` : `${attention.length} destinations need a fix`}
          why="Until this is fixed, vehicles will not update there."
          next={getSetupReadiness(attention[0]!.platform, attention[0]!.account).nextAction ?? `Fix ${starterName}`}
          ownerKind="YOU"
          actionLabel={`Fix ${starterName}`}
          onAction={() => starter && onSelectSlug(starter.platform.platformSlug)}
        />
      )}
      {experience === 'setup' && (
        <PagePrimaryState
          kind="setup"
          title={
            connected.length === 1
              ? `${nameOf(connected[0]!)} is connected`
              : `${connected.length} destinations are connected`
          }
          why="Connected means we can send vehicles there. Add another destination only if you advertise on it. Connected does not mean listings are already on the site."
        />
      )}
      {experience === 'running' && (
        <PagePrimaryState
          kind="running"
          title={
            connected.length === 1
              ? `${nameOf(connected[0]!)} is connected`
              : `${connected.length} destinations are connected`
          }
          why="Ready vehicles can be sent to these destinations. Connected does not mean a listing is already on the site."
        />
      )}

      {connected.length > 0 && (
        <DealershipAutopilot dealerId={dealerId} connectedChannelCount={connected.length} hideWhenUnavailable />
      )}

      <SyndicationSentryCard dealerId={dealerId} hideWhenClean />

      {loading && <p className="text-sm text-ink-muted">Loading destinations…</p>}

      {sortedConnected.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink-heading">In use ({sortedConnected.length})</h2>
            <span className="text-xs text-ink-muted">We can send vehicles here</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedConnected.map(({ platform, account }) => (
              <ChannelDestinationCard
                key={platform.platformSlug}
                platform={platform}
                account={account}
                perf={perfBySlug.get(platform.platformSlug) ?? null}
                dealerId={dealerId}
                storefrontHref={storefrontHref}
                onOpen={() => onSelectSlug(platform.platformSlug)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Attention Channels */}
      {attention.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-status-warning-text">Needs a fix ({attention.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attention.map(({ platform, account }) => (
              <ChannelDestinationCard
                key={platform.platformSlug}
                platform={platform}
                account={account}
                perf={perfBySlug.get(platform.platformSlug) ?? null}
                dealerId={dealerId}
                storefrontHref={storefrontHref}
                onOpen={() => onSelectSlug(platform.platformSlug)}
              />
            ))}
          </div>
        </section>
      )}

      {setup.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-t border-silver-200 pt-4">
            <div>
              <h2 className="text-sm font-bold text-ink-heading">Available to connect ({setup.length})</h2>
              <p className="text-xs text-ink-muted">
                Only set these up if you advertise there. They are not required.
              </p>
            </div>
            {!showRest && (
              <button
                type="button"
                onClick={() => setShowRest(true)}
                className="text-xs font-semibold text-navy-700 hover:underline shrink-0"
              >
                Show {setup.length} more destinations
              </button>
            )}
          </div>
          {(showRest || connected.length === 0) && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {setup.map(({ platform, account }) => (
                <ChannelDestinationCard
                  key={platform.platformSlug}
                  platform={platform}
                  account={account}
                  perf={perfBySlug.get(platform.platformSlug) ?? null}
                  dealerId={dealerId}
                  storefrontHref={storefrontHref}
                  onOpen={() => onSelectSlug(platform.platformSlug)}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {!loading && rows.length === 0 && (
        <div className="p-12 text-center bg-white rounded-xl border border-silver-200">
          <p className="text-sm font-semibold text-ink-heading">No destinations yet</p>
          <p className="text-xs text-ink-muted mt-1">{emptyMessage}</p>
        </div>
      )}

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
