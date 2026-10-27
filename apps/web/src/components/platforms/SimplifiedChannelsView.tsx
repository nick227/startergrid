import { useMemo, useState } from 'react';
import { DealershipAutopilot } from '@/components/guidance/DealershipAutopilot.tsx';
import { PagePrimaryState } from '@/components/guidance/PagePrimaryState.tsx';
import type {
  PlatformPublishResult,
  PlatformAccountDetail,
  PlatformPerformanceItem,
} from '@/lib/types.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { channelExperience, platformLooksConnected } from '@/lib/pagePrimaryState.ts';
import { AUTO_MARKETPLACE_SLUG, platformDisplayName } from '@/lib/marketplaceBrand.ts';
import { getSetupReadiness } from '@/lib/setupReadiness.ts';
import { channelListGroup, visibleIdleChannels } from '@/lib/destinationPrimary.ts';
import { PlatformDetailDrawer } from './PlatformDetailDrawer.tsx';
import { ChannelDestinationGrid, type ChannelRow } from './ChannelDestinationGrid.tsx';
import { SyndicationSentryCard } from './SyndicationSentryCard.tsx';

type Props = {
  platforms: PlatformPublishResult[];
  perfBySlug: Map<string, PlatformPerformanceItem>;
  accountBySlug: Map<string, PlatformAccountDetail>;
  dealerId: string;
  nav: OperatorNavHandlers;
  selectedSlug: string | null;
  onSelectSlug: (slug: string | null) => void;
  onAccountSaved: () => void;
  loading?: boolean;
  emptyMessage: string;
  storefrontHref?: string;
};

function nameOf(row: ChannelRow): string {
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
  const [showIdle, setShowIdle] = useState(false);
  const [showRest, setShowRest] = useState(false);

  const grouped = useMemo(() => {
    const attention: ChannelRow[] = [];
    const inUse: ChannelRow[] = [];
    const idle: ChannelRow[] = [];
    const available: ChannelRow[] = [];
    for (const platform of platforms) {
      const account = accountBySlug.get(platform.platformSlug) ?? null;
      const readiness = getSetupReadiness(platform, account);
      const row = { platform, account };
      const group = channelListGroup({
        connected: platformLooksConnected(platform),
        hasErrors: readiness.severity === 'critical' || platform.accountState === 'ERROR',
        sentCount: perfBySlug.get(platform.platformSlug)?.vehiclesListed ?? 0,
        firstParty: platform.platformSlug === AUTO_MARKETPLACE_SLUG,
      });
      if (group === 'attention') attention.push(row);
      else if (group === 'inUse') inUse.push(row);
      else if (group === 'idle') idle.push(row);
      else available.push(row);
    }
    inUse.sort((a, b) => {
      if (a.platform.platformSlug === AUTO_MARKETPLACE_SLUG) return -1;
      if (b.platform.platformSlug === AUTO_MARKETPLACE_SLUG) return 1;
      return 0;
    });
    return { attention, inUse, idle, available };
  }, [platforms, accountBySlug, perfBySlug]);

  const { attention, inUse, idle, available } = grouped;
  const connectedCount = inUse.length + idle.length;
  const experience = channelExperience({
    connected: connectedCount,
    attention: attention.length,
    setup: available.length,
    total: platforms.length,
  });
  const visibleIdle = visibleIdleChannels(idle, inUse.length, showIdle);
  const hiddenIdle = idle.length - visibleIdle.length;
  const starter = (experience === 'attention' ? attention[0] : inUse[0] ?? idle[0] ?? available[0]) ?? null;
  const starterName = starter ? nameOf(starter) : 'a destination';
  const selectedPlatform = platforms.find(p => p.platformSlug === selectedSlug) ?? null;
  const grid = { perfBySlug, dealerId, storefrontHref, onOpen: onSelectSlug };

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
            connectedCount === 1
              ? `${nameOf((inUse[0] ?? idle[0])!)} is connected`
              : `${connectedCount} destinations are connected`
          }
          why="Connected means we can send vehicles there. Add another destination only if you advertise on it. Connected does not mean listings are already on the site."
        />
      )}
      {experience === 'running' && (
        <PagePrimaryState
          kind="running"
          title={
            connectedCount === 1
              ? `${nameOf((inUse[0] ?? idle[0])!)} is connected`
              : `${connectedCount} destinations are connected`
          }
          why="Ready vehicles can be sent to these destinations. Connected does not mean a listing is already on the site."
        />
      )}

      {connectedCount > 0 && (
        <DealershipAutopilot dealerId={dealerId} connectedChannelCount={connectedCount} hideWhenUnavailable />
      )}

      <SyndicationSentryCard dealerId={dealerId} hideWhenClean />

      {loading && <p className="text-sm text-ink-muted">Loading destinations…</p>}

      {inUse.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-ink-heading">In use ({inUse.length})</h2>
            <span className="text-xs text-ink-muted">Vehicles have been sent, or this is your storefront</span>
          </div>
          <ChannelDestinationGrid rows={inUse} {...grid} />
        </section>
      )}

      {attention.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-sm font-bold text-status-warning-text">Needs a fix ({attention.length})</h2>
          <ChannelDestinationGrid rows={attention} {...grid} />
        </section>
      )}

      {idle.length > 0 && (
        <section className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <div>
              <h2 className="text-sm font-bold text-ink-heading">Connected, not sending yet ({idle.length})</h2>
              <p className="text-xs text-ink-muted">We can send vehicles here. Nothing has been sent yet.</p>
            </div>
            {hiddenIdle > 0 && (
              <button
                type="button"
                onClick={() => setShowIdle(true)}
                className="text-xs font-semibold text-navy-700 hover:underline shrink-0"
              >
                Show {hiddenIdle} more
              </button>
            )}
          </div>
          {visibleIdle.length > 0 && <ChannelDestinationGrid rows={visibleIdle} {...grid} />}
        </section>
      )}

      {available.length > 0 && (
        <section className="space-y-3 pt-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-t border-silver-200 pt-4">
            <div>
              <h2 className="text-sm font-bold text-ink-heading">Available to connect ({available.length})</h2>
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
                Show {available.length} more destinations
              </button>
            )}
          </div>
          {(showRest || connectedCount === 0) && (
            <ChannelDestinationGrid rows={available} {...grid} />
          )}
        </section>
      )}

      {!loading && platforms.length === 0 && (
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
