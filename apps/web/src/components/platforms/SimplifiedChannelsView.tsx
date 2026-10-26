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

  const focus = experience === 'attention'
    ? attention
    : experience === 'empty'
      ? rows.filter(r => r.platform.platformSlug === AUTO_MARKETPLACE_SLUG).slice(0, 1).concat(setup).slice(0, 1)
      : experience === 'setup'
        ? setup
        : connected;

  const visible = showRest ? rows : focus;
  const hiddenCount = Math.max(0, rows.length - focus.length);
  const starter = (experience === 'attention' ? attention[0] : focus[0]) ?? rows[0];
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
      {experience === 'setup' && (
        <PagePrimaryState
          kind="setup"
          title="Finish connecting destinations"
          why={`${connected.length} connected. ${setup.length} still need a connection from you.`}
          next={`Continue with ${starterName}.`}
          ownerKind="YOU"
          actionLabel={`Continue with ${starterName}`}
          onAction={() => starter && onSelectSlug(starter.platform.platformSlug)}
        />
      )}
      {experience === 'attention' && (
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
      {experience === 'running' && (
        <PagePrimaryState
          kind="running"
          title={`Shoppers can find you on ${connected.length} destination${connected.length === 1 ? '' : 's'}`}
          why="Ready vehicles can be sent to connected destinations. Connected does not mean a listing is live yet."
          secondaryLabel={hiddenCount > 0 ? 'Add another destination' : undefined}
          onSecondary={hiddenCount > 0 ? () => setShowRest(true) : undefined}
        />
      )}

      {experience === 'running' && (
        <DealershipAutopilot dealerId={dealerId} connectedChannelCount={connected.length} />
      )}

      {loading && <p className="text-sm text-ink-muted">Loading destinations…</p>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visible.map(({ platform, account }) => (
          <ChannelDestinationCard
            key={platform.platformSlug}
            platform={platform}
            account={account}
            dealerId={dealerId}
            storefrontHref={storefrontHref}
            onOpen={() => onSelectSlug(platform.platformSlug)}
          />
        ))}
        {!loading && visible.length === 0 && (
          <div className="col-span-2 p-12 text-center bg-white rounded-xl border border-silver-200">
            <p className="text-sm font-semibold text-ink-heading">No destinations yet</p>
            <p className="text-xs text-ink-muted mt-1">{emptyMessage}</p>
          </div>
        )}
      </div>

      {!showRest && hiddenCount > 0 && experience !== 'running' && (
        <button type="button" onClick={() => setShowRest(true)} className="text-sm font-semibold text-navy-700 hover:underline">
          See {hiddenCount} other destination{hiddenCount === 1 ? '' : 's'}
        </button>
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
