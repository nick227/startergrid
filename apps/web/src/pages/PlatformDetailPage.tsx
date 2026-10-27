import { useMemo } from 'react';
import { fetchPublishStatus, fetchAccounts, fetchPlatformPerformance } from '@/lib/api/sdk.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { useOperatorRoute } from '@/hooks/useOperatorRoute.ts';
import { OperatorPage, ErrorState, PanelSkeleton } from '@/components/operator';
import { PlatformLogo } from '@/components/platforms/PlatformLogo.tsx';
import { oauthProviderDisplayName } from '@/lib/platformPresentation.ts';
import { platformOutcomeMeta } from '@/lib/syncPresentation.ts';
import { platformDisplayName } from '@/lib/marketplaceBrand.ts';
import { DestinationPrimarySetup } from '@/components/platforms/DestinationPrimarySetup.tsx';
import { ChannelSetupGuide } from '@/components/platforms/ChannelSetupGuide.tsx';
import { AccountEditForm } from '@/components/platforms/AccountEditForm.tsx';
import { PlatformQueueSummaryCard } from '@/components/platforms/PlatformQueueSummaryCard.tsx';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { isInternalSupportRole } from '@/lib/operatorAccess.ts';
import { channelHash, type ChannelView } from '@/lib/routes.ts';
import { ActivityTab, FeedTab, NotesTab } from '@/components/platforms/PlatformDetailTabs.tsx';
import { CatalogSyncPanel } from '@/components/platforms/CatalogSyncPanel.tsx';
import { LeadSyncPanel } from '@/components/platforms/LeadSyncPanel.tsx';
import { MarketplaceListingPanel } from '@/components/platforms/MarketplaceListingPanel.tsx';
import { SocialPageSelector, SocialPostsTab } from '@/components/social/index.ts';
import { CAPABILITY_LABEL, STATUS_LABEL, fetchChannelOverview, waitingLabel, type ChannelDisplayStatus } from '@/lib/api/channelOverviewApi.ts';

type ExternalLink = { label: string; url: string };
type OperatorSetupGuide = {
  shortBlurb: string;
  connectionLabel: string;
  steps: string[];
  dealerPortalUrl?: string | null;
  validationNote: string;
};
type RichPlatformAccount = {
  description?: string | null;
  externalLinks?: ExternalLink[] | null;
  operatorSetup?: OperatorSetupGuide | null;
  [key: string]: unknown;
};

function PlatformIntroCard({ description, externalLinks }: {
  description?: string | null;
  externalLinks?: ExternalLink[] | null;
}) {
  if (!description && (!externalLinks || externalLinks.length === 0)) return null;
  return (
    <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-5 space-y-4">
      {description && (
        <p className="text-sm text-ink-body leading-relaxed">{description}</p>
      )}
      {externalLinks && externalLinks.length > 0 && (
        <div className="flex flex-wrap gap-3 pt-1 border-t border-silver-100">
          {externalLinks.map(link => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-semibold text-navy-600 hover:text-navy-800 flex items-center gap-1"
            >
              <span className="text-sm leading-none">↗</span> {link.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

type Props = OperatorPageBaseProps & {
  platformSlug: string;
};

function ownedMarketplaceStateCopy(platform: { state: string; detail?: string | null }) {
  if (platform.state === 'Blocked') {
    return {
      label: 'Some vehicles cannot be listed here yet',
      detail: platform.detail || 'Usually a missing price or photos.',
      tone: 'text-status-error-text',
    };
  }
  if (platform.state === 'Failed') {
    return {
      label: 'Last update did not go through',
      detail: platform.detail || 'Try sending again from Vehicles.',
      tone: 'text-status-error-text',
    };
  }
  return {
    label: platform.state === 'Active' ? 'Your storefront is ready' : 'Your storefront is set up',
    detail: platform.detail || 'A listing here is not verified live until a send succeeds.',
    tone: 'text-ink-muted',
  };
}

type FocusedView = 'social' | 'catalog' | 'listings' | 'leads';
const FOCUSED: Record<FocusedView, { title: string; blurb: string; flag: 'socialPosting' | 'catalogSync' | 'marketplaceListing' | 'leadSync' }> = {
  social: { title: 'Social posts', blurb: 'Choose the page to post to and see what was posted.', flag: 'socialPosting' },
  catalog: { title: 'Catalog', blurb: 'The product catalog this channel reads your vehicles from.', flag: 'catalogSync' },
  listings: { title: 'Listings', blurb: 'Listings StarterGrid manages on this channel.', flag: 'marketplaceListing' },
  leads: { title: 'Leads', blurb: 'Inquiries this channel sends back to StarterGrid.', flag: 'leadSync' },
};

const STATUS_PILL: Record<ChannelDisplayStatus, string> = {
  NEEDS_ATTENTION: 'bg-amber-50 text-amber-800 border-amber-200',
  SETTING_UP: 'bg-navy-50 text-navy-800 border-navy-200',
  CONNECTED: 'bg-status-success-bg text-status-success-text border-status-success-border',
  NOT_SET_UP: 'bg-silver-50 text-ink-muted border-silver-200',
};

/**
 * One page per channel. Overview leads with the setup wizard until the channel is connected,
 * then with its status; Activity and Settings are always reachable, including mid-setup.
 */
export default function PlatformDetailPage({ dealerId, nav, activeTab, platformSlug }: Props) {
  const { route } = useOperatorRoute();
  const requested: ChannelView = route.channelView ?? 'overview';
  const { user } = useAuth();
  const isInternal = isInternalSupportRole(user?.role ?? '');

  const { data: statusData, loading: statusLoading, error: statusError, reload: reloadStatus } = useAsyncQuery(
    () => fetchPublishStatus(dealerId),
    [dealerId]
  );
  const { data: accountsData, loading: accountsLoading, error: accountsError, reload: reloadAccounts } = useAsyncQuery(
    () => fetchAccounts(dealerId),
    [dealerId]
  );
  const { data: perfData, reload: reloadPerf } = useAsyncQuery(
    () => fetchPlatformPerformance(dealerId),
    [dealerId]
  );
  const { data: overview, reload: reloadOverview } = useAsyncQuery(
    () => fetchChannelOverview(dealerId, platformSlug),
    [dealerId, platformSlug]
  );

  const platform = useMemo(
    () => statusData?.platforms?.find(p => p.platformSlug === platformSlug),
    [statusData, platformSlug]
  );
  const account = useMemo(
    () => accountsData?.accounts?.find(a => a.platformSlug === platformSlug) ?? null,
    [accountsData, platformSlug]
  );
  const perf = useMemo(
    () => perfData?.platforms?.find(p => p.platformSlug === platformSlug) ?? null,
    [perfData, platformSlug]
  );
  const item = overview?.channels[0] ?? null;

  const loading = statusLoading || accountsLoading;
  const error = statusError || accountsError;

  const handleRefresh = () => {
    reloadStatus();
    reloadAccounts();
    reloadPerf();
    reloadOverview();
  };
  const backToChannels = (
    <div className="mb-4">
      <button onClick={() => nav.goToPlatforms()} className="text-sm font-semibold text-ink-faint hover:text-ink-body transition-colors">
        ← Back to Channels
      </button>
    </div>
  );

  if (error && !platform) {
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} onRefresh={handleRefresh}>
        {backToChannels}
        <ErrorState message={error} onRetry={handleRefresh} />
      </OperatorPage>
    );
  }
  if (loading && !platform) {
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} onRefresh={handleRefresh} refreshing={true}>
        {backToChannels}
        <PanelSkeleton rows={6} />
      </OperatorPage>
    );
  }
  if (!platform) {
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} onRefresh={handleRefresh}>
        {backToChannels}
        <div className="p-8 text-center text-ink-faint border border-silver-200 border-dashed rounded-xl">
          This destination is not available for this dealership.
        </div>
      </OperatorPage>
    );
  }

  const richAccount = account as (typeof account & RichPlatformAccount) | null;
  const publishMeta = platformOutcomeMeta(platform);
  const ownedState = platform.integrationClass === 'OWNED' ? ownedMarketplaceStateCopy(platform) : null;
  const displayName = platformDisplayName(platform.platformSlug, platform.platformName);
  // Only a passed connection check counts as verified; an account marked ACTIVE by hand does not.
  const connectionVerified = account?.state === 'READY' || account?.highestConfirmedLevel === 'CONNECTION_TESTED';
  const focusedViews = (Object.keys(FOCUSED) as FocusedView[]).filter(v => platform[FOCUSED[v].flag]);
  // A capability view the channel does not have falls back to Overview.
  const view: ChannelView = (requested in FOCUSED && !focusedViews.includes(requested as FocusedView)) ? 'overview' : requested;
  const section = view === 'activity' || view === 'settings' ? view : 'overview';
  const setupFirst = item ? item.displayStatus !== 'CONNECTED' : platform.integrationClass !== 'OWNED';
  const href = (v?: ChannelView) => `${channelHash(dealerId, platform.platformSlug, v)}${window.location.hash.includes('support=true') ? '?support=true' : ''}`;
  const waiting = item?.displayStatus === 'SETTING_UP' ? waitingLabel(item) : null;

  return (
    <OperatorPage
      dealerId={dealerId}
      dealerName={statusData?.dealerName}
      activeTab={activeTab}
      nav={nav}
      onRefresh={handleRefresh}
      refreshing={loading}
      hideDealerId
    >
      {backToChannels}

      <header className="bg-white border border-silver-200 rounded-xl shadow-sm p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <PlatformLogo slug={platform.platformSlug} name={displayName} size="md" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-ink-heading">{item?.name ?? displayName}</h1>
            {item && item.name !== displayName && <p className="text-xs text-ink-muted">{displayName}</p>}
            {item && (
              <>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded border px-2 py-0.5 text-xs font-bold ${STATUS_PILL[item.displayStatus]}`}>
                    {STATUS_LABEL[item.displayStatus]}{waiting ? ` · waiting on ${waiting}` : ''}
                  </span>
                  <span className="text-xs text-ink-muted">{overview?.purposes.find(p => p.purpose === item.purpose)?.label}</span>
                  {item.capabilities.filter(c => c !== 'PARTNER_FEED').map(c => (
                    <span key={c} className="rounded bg-silver-50 px-1.5 py-0.5 text-[10px] font-semibold text-ink-muted">{CAPABILITY_LABEL[c]}</span>
                  ))}
                </div>
                {item.displayStatus !== 'NOT_SET_UP' && <p className="mt-2 text-sm text-ink-body">{item.displayReason}</p>}
              </>
            )}
          </div>
        </div>
      </header>

      <nav aria-label="Channel sections" className="mt-6 flex border-b border-silver-200 bg-white rounded-t-xl px-2 overflow-x-auto no-scrollbar">
        {(['overview', 'activity', 'settings'] as const).map(v => (
          <a key={v} href={href(v)} aria-current={section === v ? 'page' : undefined}
            className={`shrink-0 px-4 py-2.5 text-xs font-bold border-b-2 -mb-px transition-colors ${
              section === v ? 'border-navy-600 text-navy-700' : 'border-transparent text-ink-muted hover:text-ink-body'
            }`}>
            {v === 'overview' ? 'Overview' : v === 'activity' ? 'Activity' : 'Settings'}
          </a>
        ))}
      </nav>

      {view in FOCUSED && (
        <div className="mt-6 space-y-4">
          <a href={href()} className="text-xs font-semibold text-navy-700 hover:underline">← Overview</a>
          <div>
            <h2 className="text-lg font-bold text-ink-heading">{FOCUSED[view as FocusedView].title}</h2>
            <p className="text-sm text-ink-muted">{FOCUSED[view as FocusedView].blurb}</p>
          </div>
          {view === 'social' && (
            <div className="space-y-6">
              <SocialPageSelector
                dealerId={dealerId}
                platformSlug={platform.platformSlug}
                platformName={platform.platformName}
                onPageSelected={handleRefresh}
              />
              <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-6">
                <h3 className="text-sm font-bold text-ink-heading border-b border-silver-100 pb-2 mb-4">Post history</h3>
                <SocialPostsTab dealerId={dealerId} platformSlug={platform.platformSlug} />
              </div>
            </div>
          )}
          {view === 'catalog' && (
            <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-6">
              <CatalogSyncPanel dealerId={dealerId} platformSlug={platform.platformSlug} />
            </div>
          )}
          {view === 'listings' && (
            <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-6">
              <MarketplaceListingPanel platformSlug={platform.platformSlug} account={account} />
            </div>
          )}
          {view === 'leads' && (
            <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-6">
              <LeadSyncPanel dealerId={dealerId} platformSlug={platform.platformSlug} account={account} />
            </div>
          )}
        </div>
      )}

      {(view === 'overview' || view === 'setup') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-6">
            {(setupFirst || view === 'setup') && platform.integrationClass !== 'OWNED' && (
              <>
                <ChannelSetupGuide
                  dealerId={dealerId}
                  channel={platform.platformSlug}
                  account={account}
                  connectionVerified={connectionVerified}
                  listingOutcome={publishMeta.outcome}
                  onChanged={handleRefresh}
                />
                {item?.displayStatus === 'SETTING_UP' && item.waitingOn !== 'DEALERSHIP' && (
                  <p className="text-xs text-ink-muted">
                    You can leave this page. Channels shows {displayName} as Setting up until it is ready.{' '}
                    <button type="button" onClick={() => nav.goToPlatforms()} className="font-semibold text-navy-700 hover:underline">Back to Channels</button>
                  </p>
                )}
              </>
            )}

            {item && !setupFirst && view !== 'setup' && (
              <section aria-label="Status" className="bg-white border border-silver-200 rounded-xl shadow-sm p-5">
                <dl className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Setup</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-ink-body">Done</dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Connection</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-ink-body">
                      {item.connection.state === 'VERIFIED' ? 'Checked by StarterGrid' : item.connection.state === 'FAILED' ? 'Failed' : item.connection.state === 'NOT_APPLICABLE' ? 'Built in' : 'Not checked yet'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">Confirmed live</dt>
                    <dd className="mt-0.5 text-sm font-semibold text-ink-body">
                      {item.distribution.verifiedLive} vehicle{item.distribution.verifiedLive === 1 ? '' : 's'}
                      {item.distribution.inProgress > 0 && <span className="block text-xs font-normal text-ink-muted">{item.distribution.inProgress} still sending</span>}
                      {item.distribution.problems > 0 && <span className="block text-xs font-normal text-amber-800">{item.distribution.problems} not confirmed</span>}
                    </dd>
                  </div>
                </dl>
                {platform.integrationClass !== 'OWNED' && (
                  <a href={href('setup')} className="mt-4 inline-block text-xs font-semibold text-navy-700 hover:underline">See setup steps</a>
                )}
              </section>
            )}

            {focusedViews.length > 0 && (
              <section aria-label="What this channel does" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {focusedViews.map(v => (
                  <a key={v} href={href(v)} className="rounded-xl border border-silver-200 bg-white p-4 hover:border-navy-300">
                    <span className="block text-sm font-bold text-ink-heading">{FOCUSED[v].title}</span>
                    <span className="mt-1 block text-xs text-ink-muted">{FOCUSED[v].blurb}</span>
                  </a>
                ))}
              </section>
            )}

            {platform.integrationClass === 'OWNED' && (
              <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-5">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint mb-3">Your StarterGrid storefront</h2>
                <p className="text-sm text-ink-body leading-relaxed">
                  This is your own storefront. You do not sign in to another company. Ready vehicles can appear here; that is not a verified-live confirmation until a send succeeds.
                </p>
                {platform.state === 'Active' ? (
                  <p className="mt-3 text-xs font-semibold text-status-success-text">Storefront is on.</p>
                ) : (
                  ownedState && (
                    <div className="mt-3 rounded-lg border border-silver-200 bg-silver-50 px-3 py-2">
                      <p className={`text-xs font-semibold ${ownedState.tone}`}>{ownedState.label}</p>
                      {ownedState.detail && <p className="mt-1 text-xs text-ink-muted">{ownedState.detail}</p>}
                    </div>
                  )
                )}
              </div>
            )}


          </div>
          <div className="space-y-6">
            <PlatformQueueSummaryCard dealerId={dealerId} platformSlug={platform.platformSlug} nav={nav} />
          </div>
        </div>
      )}

      {view === 'activity' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-6">
            <FeedTab perf={perf} platform={platform} />
            <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-6">
              <h3 className="text-sm font-bold text-ink-heading border-b border-silver-100 pb-2 mb-4">Recent activity</h3>
              <ActivityTab dealerId={dealerId} platformSlug={platform.platformSlug} nav={nav} />
            </div>
          </div>
          <div className="space-y-6">
            <PlatformQueueSummaryCard dealerId={dealerId} platformSlug={platform.platformSlug} nav={nav} />
            <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-5 space-y-2">
              <button type="button" onClick={() => nav.goToPlatformQueue(platform.platformSlug)} className="block text-sm font-medium text-navy-600 hover:text-navy-800">Sending queue</button>
              <button type="button" onClick={() => nav.goToPlatformHistory(platform.platformSlug)} className="block text-sm font-medium text-navy-600 hover:text-navy-800">Full history</button>
            </div>
          </div>
        </div>
      )}

      {view === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <div className="lg:col-span-2 space-y-6">
            <PlatformIntroCard
              description={richAccount?.description}
              externalLinks={richAccount?.externalLinks}
            />
            <DestinationPrimarySetup
              dealerId={dealerId}
              platform={platform}
              account={account}
              onRefresh={handleRefresh}
            />
            {account && <NotesTab account={account} dealerId={dealerId} onSaved={handleRefresh} />}
            <details className="bg-white border border-silver-200 rounded-xl shadow-sm">
              <summary className="px-5 py-4 cursor-pointer text-sm font-semibold text-ink-heading">
                How this destination works
                <span className="block text-xs font-normal text-ink-muted mt-0.5">What you send here, and what they need from a vehicle.</span>
              </summary>
              <div className="px-5 pb-5 space-y-6">
            <p className="text-sm text-ink-body leading-relaxed">
              After you connect, ready vehicles can be sent here. Sent is not the same as already showing on their site.
            </p>
            <div>
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint mb-4">What you can send</h2>
              <div className="flex flex-wrap gap-2">
                {platform.catalogSync && <span className="px-2 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded text-xs font-semibold">Inventory</span>}
                {platform.socialPosting && <span className="px-2 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded text-xs font-semibold">Social posts</span>}
                {platform.marketplaceListing && <span className="px-2 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded text-xs font-semibold">Listings</span>}
                {platform.partnerFeed && <span className="px-2 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded text-xs font-semibold">Partner listing</span>}
                {platform.leadSync && <span className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold">Inquiries</span>}
                {!platform.catalogSync && !platform.socialPosting && !platform.marketplaceListing && !platform.partnerFeed && !platform.leadSync && (
                  <span className="text-sm text-ink-muted">No extra capabilities listed.</span>
                )}
              </div>
            </div>

            {isInternal && platform.integrationClass !== 'OWNED' && (
              <div className="space-y-4">
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint mb-2">Connection checks</h2>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4 pb-4 border-b border-silver-100">
                  <div>
                    <div className="text-[10px] text-ink-muted uppercase font-bold tracking-wide">Sync State</div>
                    <div className="font-semibold text-ink-body mt-0.5">{platform.state}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-muted uppercase font-bold tracking-wide">Account State</div>
                    <div className="font-semibold text-ink-body mt-0.5">{account?.state || 'Unknown'}</div>
                  </div>
                  <div>
                    <div className="text-[10px] text-ink-muted uppercase font-bold tracking-wide">Membership</div>
                    <div className="font-semibold text-ink-body mt-0.5">{account?.membershipStatus || 'Unknown'}</div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-body">Config Present</span>
                    {account?.connectionConfig && Object.keys(account.connectionConfig).length > 0 ? (
                      <span className="text-[10px] font-bold text-status-success-text bg-status-success-bg px-2 py-0.5 rounded border border-status-success-border">YES</span>
                    ) : (
                      <span className="text-[10px] font-bold text-ink-muted bg-silver-100 px-2 py-0.5 rounded border border-silver-200">NO</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-body">Secret Present</span>
                    {account?.state !== 'ACCOUNT_NEEDED' && account?.state !== 'CREDENTIALS_NEEDED' && account?.state !== 'NOT_STARTED' ? (
                      <span className="text-[10px] font-bold text-status-success-text bg-status-success-bg px-2 py-0.5 rounded border border-status-success-border">YES</span>
                    ) : (
                      <span className="text-[10px] font-bold text-ink-muted bg-silver-100 px-2 py-0.5 rounded border border-silver-200">NO</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-body">Connection Tested</span>
                    {account?.state && account.state !== 'ACCOUNT_NEEDED' && account.state !== 'CREDENTIALS_NEEDED' && account.state !== 'FAILED' ? (
                      <span className="text-[10px] font-bold text-status-success-text bg-status-success-bg px-2 py-0.5 rounded border border-status-success-border">YES</span>
                    ) : (
                      <span className="text-[10px] font-bold text-ink-muted bg-silver-100 px-2 py-0.5 rounded border border-silver-200">NO</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-body">Feed Accepted</span>
                    {platform.state === 'Active' ? (
                      <span className="text-[10px] font-bold text-status-success-text bg-status-success-bg px-2 py-0.5 rounded border border-status-success-border">YES</span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">PENDING</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-body">Listings Confirmed</span>
                    {platform.state === 'Active' ? (
                      <span className="text-[10px] font-bold text-status-success-text bg-status-success-bg px-2 py-0.5 rounded border border-status-success-border">YES</span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">PENDING</span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink-body">Status Sync Confirmed</span>
                    {platform.state === 'Active' ? (
                      <span className="text-[10px] font-bold text-status-success-text bg-status-success-bg px-2 py-0.5 rounded border border-status-success-border">YES</span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded border border-amber-200">PENDING</span>
                    )}
                  </div>
                </div>

                {isInternal && account?.liveValidationNote && (
                  <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-bold text-amber-800 mb-1">Partner confirmation note</p>
                    <p className="text-xs text-amber-900/80">{account.liveValidationNote}</p>
                  </div>
                )}
                {platform.detail && (
                  <div className="mt-2 text-sm text-ink-muted">
                    {platform.detail}
                  </div>
                )}
              </div>
            )}

            {(account?.requiredDealershipFields?.length || account?.requiredVehicleFields?.length) ? (
              <div>
                <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint mb-4">Fields they need</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {account?.requiredDealershipFields && account.requiredDealershipFields.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-2">Dealership</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {account.requiredDealershipFields.map(f => (
                          <span key={f} className="px-2 py-0.5 bg-silver-50 border border-silver-200 rounded-md text-[11px] text-ink-body">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {account?.requiredVehicleFields && account.requiredVehicleFields.length > 0 && (
                    <div>
                      <h3 className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-2">Vehicle</h3>
                      <div className="flex flex-wrap gap-1.5">
                        {account.requiredVehicleFields.map(f => (
                          <span key={f} className="px-2 py-0.5 bg-silver-50 border border-silver-200 rounded-md text-[11px] text-ink-body">
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : null}
              </div>
            </details>


            {isInternal && account && (
              <details className="bg-white border border-silver-200 rounded-xl shadow-sm">
                <summary className="px-5 py-4 cursor-pointer text-sm font-semibold text-ink-heading">
                  Account record
                  <span className="block text-xs font-normal text-ink-muted mt-0.5">Internal state, owner, and notes.</span>
                </summary>
                <div className="px-5 pb-5">
                  <AccountEditForm account={account} dealerId={dealerId} onSaved={handleRefresh} />
                </div>
              </details>
            )}


          </div>
          <div className="space-y-6">
            <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-5">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint mb-4">Help</h2>
              <ul className="space-y-3">
                {account?.integrationUrls?.partnerPortalUrl && (
                  <li>
                    <a href={account.integrationUrls.partnerPortalUrl} target="_blank" rel="noreferrer" className="text-sm text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1.5">
                      <span className="text-lg leading-none">↗</span> Their dealer website
                    </a>
                  </li>
                )}
                {account?.integrationUrls?.supportUrl && (
                  <li>
                    <a href={account.integrationUrls.supportUrl} target="_blank" rel="noreferrer" className="text-sm text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1.5">
                      <span className="text-lg leading-none">↗</span> Their support
                    </a>
                  </li>
                )}
                {!account?.integrationUrls && account?.connectionFields?.find(f => f.helpUrl) && (
                  <li>
                    <a href={account.connectionFields.find(f => f.helpUrl)?.helpUrl} target="_blank" rel="noreferrer" className="text-sm text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1.5">
                      <span className="text-lg leading-none">↗</span> Setup guide
                    </a>
                  </li>
                )}
                <li>
                  <button type="button" onClick={() => nav.goToHelp()} className="text-sm text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1.5">
                    Help in StarterGrid
                  </button>
                </li>
              </ul>
            </div>


            <details className="bg-white border border-silver-200 rounded-xl shadow-sm">
              <summary className="px-5 py-4 cursor-pointer text-sm font-semibold text-ink-heading">
                How this connection works
                <span className="block text-xs font-normal text-ink-muted mt-0.5">Sign-in method and technical notes.</span>
              </summary>
              <div className="px-5 pb-5 space-y-4">
                {platform.connectionType === 'OAUTH' && account?.oauthProvider ? (
                  <p className="text-sm text-ink-body">Sign in with {oauthProviderDisplayName(account.oauthProvider)}. StarterGrid never sees your password.</p>
                ) : platform.connectionType === 'PARTNER_FEED' ? (
                  <p className="text-sm text-ink-body">They receive listings from us after you add the details they need.</p>
                ) : (
                  <p className="text-sm text-ink-body">We send listings directly. You usually do not sign in to another website.</p>
                )}
                {account?.integrationUrls?.developerDocsUrl && (
                  <a href={account.integrationUrls.developerDocsUrl} target="_blank" rel="noreferrer" className="block text-xs text-navy-600">Developer docs</a>
                )}
                {account?.integrationUrls?.feedSpecUrl && (
                  <a href={account.integrationUrls.feedSpecUrl} target="_blank" rel="noreferrer" className="block text-xs text-navy-600">Listing file spec</a>
                )}
                {(account?.profileConfidence || account?.requirementsConfidence) && (
                  <p className="text-xs text-ink-muted">
                    Setup notes: {account?.profileConfidence ?? 'unknown'} data · {account?.requirementsConfidence ?? 'unknown'} requirements.
                  </p>
                )}
              </div>
            </details>
            

          </div>
        </div>
      )}
    </OperatorPage>
  );
}
