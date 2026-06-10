import type { PlatformPublishResult, PlatformAccountDetail, PlatformPerformanceItem, SelectedSocialPage } from '@/lib/types.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { OpsRowCard } from '@/components/layout/OpsRowCard.tsx';
import { PanelSkeleton } from '@/components/operator';
import { PlatformDetailDrawer } from './PlatformDetailDrawer.tsx';
import { PlatformLogo } from './PlatformLogo.tsx';
import { OAuthConnectButton } from './OAuthConnectButton.tsx';
import {
  platformConnectionWithAccount,
  oauthProviderDisplayName,
  platformBenefitLine,
  effortBadge,
  feedHealthLine,
  type PlatformConnection,
} from '@/lib/platformPresentation.ts';
import { socialRowSubtitle } from '@/lib/platformPanelGuards.ts';
import {
  channelSecondaryMeta,
  channelDesktopFields,
  channelRowSurface,
} from '@/lib/channelRowPresentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';


type Props = {
  platforms: PlatformPublishResult[];
  perfBySlug: Map<string, PlatformPerformanceItem>;
  accountBySlug: Map<string, PlatformAccountDetail>;
  socialPageBySlug?: Map<string, SelectedSocialPage>;
  dealerId: string;
  nav: OperatorNavHandlers;
  selectedSlug: string | null;
  onSelectSlug: (slug: string | null) => void;
  onAccountSaved: () => void;
  loading?: boolean;
  emptyMessage: string;
};

type Group = { key: string; label: string; items: PlatformPublishResult[] };

function groupOrder(conn: PlatformConnection): number {
  if (conn === 'blocked') return 0;
  if (conn === 'needs_oauth') return 1;
  if (conn === 'partner_pending') return 2;
  if (conn === 'inactive') return 3;
  if (conn === 'updating') return 4;
  return 5; // connected
}

const GROUP_LABELS: Record<string, string> = {
  blocked: 'Needs attention',
  needs_oauth: 'Quick connects',
  partner_pending: 'Partner approval pending',
  inactive: 'Setup needed',
  updating: 'Syncing',
  connected: 'Active',
};

function buildGroups(
  platforms: PlatformPublishResult[],
  accountBySlug: Map<string, PlatformAccountDetail>
): Group[] {
  const buckets = new Map<string, PlatformPublishResult[]>();
  for (const p of platforms) {
    const account = accountBySlug.get(p.platformSlug);
    const conn = platformConnectionWithAccount(p, account);
    const key = conn.connection === 'connected' ? 'connected'
      : conn.connection === 'updating' ? 'updating'
      : conn.connection === 'needs_oauth' ? 'needs_oauth'
      : conn.connection === 'partner_pending' ? 'partner_pending'
      : conn.connection === 'blocked' ? 'blocked'
      : 'inactive';
    const list = buckets.get(key) ?? [];
    list.push(p);
    buckets.set(key, list);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => groupOrder(a as PlatformConnection) - groupOrder(b as PlatformConnection))
    .map(([key, items]) => ({ key, label: GROUP_LABELS[key] ?? key, items }));
}

export function PlatformChannelList({
  platforms,
  perfBySlug,
  accountBySlug,
  socialPageBySlug,
  dealerId,
  nav,
  selectedSlug,
  onSelectSlug,
  onAccountSaved,
  loading,
  emptyMessage,
}: Props) {
  if (loading) return <PanelSkeleton rows={6} />;
  if (!platforms.length) {
    return <p className="text-sm text-ink-muted py-8 text-center">{emptyMessage}</p>;
  }

  const selected = selectedSlug
    ? platforms.find(p => p.platformSlug === selectedSlug) ?? null
    : null;

  const groups = buildGroups(platforms, accountBySlug);
  const useGroups = groups.length > 1;

  const renderRow = (platform: PlatformPublishResult) => {
    const account = accountBySlug.get(platform.platformSlug);
    const conn = platformConnectionWithAccount(platform, account);
    const perf = perfBySlug.get(platform.platformSlug);
    const badge = effortBadge(account);

    const socialSubtitle = socialRowSubtitle(
      platform.socialPosting,
      conn.connection === 'connected',
      socialPageBySlug?.get(platform.platformSlug)?.name,
    );

    return (
      <OpsRowCard
        key={platform.platformSlug}
        title={platform.platformName}
        statusLabel={conn.label}
        statusClassName={conn.pill}
        secondaryMeta={channelSecondaryMeta(platform)}
        desktopFields={channelDesktopFields(platform, perf)}
        detailOpen={selectedSlug === platform.platformSlug}
        surfaceClassName={channelRowSurface(conn.connection)}
        logoNode={<PlatformLogo slug={platform.platformSlug} name={platform.platformName} />}
        subtitleLine={socialSubtitle ?? platformBenefitLine(platform.platformSlug)}
        effortNode={badge ? (
          <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-semibold border ${badge.pill}`}>
            {badge.label}
          </span>
        ) : undefined}
        healthLine={feedHealthLine(perf, conn.connection)}
        ctaNode={
          conn.connection === 'needs_oauth' && account?.oauthProvider ? (
            <OAuthConnectButton
              dealerId={dealerId}
              platformSlug={platform.platformSlug}
              providerDisplayName={oauthProviderDisplayName(account.oauthProvider)}
              isReconnect={account.oauthExpired}
              onDone={onAccountSaved}
            />
          ) : undefined
        }
        actions={[
          {
            label: operatorCopy.channels.rowActions.details,
            onClick: () => onSelectSlug(platform.platformSlug),
          },
          {
            label: operatorCopy.channels.rowActions.queue,
            onClick: () => nav.goToPlatformQueue(platform.platformSlug),
          },
          {
            label: operatorCopy.channels.rowActions.history,
            onClick: () => nav.goToPlatformHistory(platform.platformSlug),
          },
        ]}
      />
    );
  };

  return (
    <div className={`${selected ? 'lg:grid lg:grid-cols-[1fr_min(22rem,38%)] lg:gap-4 lg:items-start' : ''}`}>
      <div className="space-y-3">
        {useGroups ? (
          groups.map(group => (
            <div key={group.key}>
              <p className="text-[10px] font-bold uppercase tracking-widest text-ink-faint mb-2 mt-4 first:mt-0">
                {group.label} <span className="ml-1 font-normal normal-case tracking-normal text-ink-faint/60">{group.items.length}</span>
              </p>
              <div className="space-y-2">
                {group.items.map(renderRow)}
              </div>
            </div>
          ))
        ) : (
          platforms.map(renderRow)
        )}
      </div>

      {selected && (
        <PlatformDetailDrawer
          platform={selected}
          account={accountBySlug.get(selected.platformSlug) ?? null}
          perf={perfBySlug.get(selected.platformSlug) ?? null}
          dealerId={dealerId}
          nav={nav}
          open
          onClose={() => onSelectSlug(null)}
          onSaved={onAccountSaved}
        />
      )}
    </div>
  );
}
