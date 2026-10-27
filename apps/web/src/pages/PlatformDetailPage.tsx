import { useMemo } from 'react';
import { fetchPublishStatus, fetchAccounts } from '@/lib/api/sdk.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { OperatorPage, ErrorState, PanelSkeleton } from '@/components/operator';
import { PlatformLogo } from '@/components/platforms/PlatformLogo.tsx';
import { oauthProviderDisplayName } from '@/lib/platformPresentation.ts';
import { getSetupReadiness, severityToPill } from '@/lib/setupReadiness.ts';
import { platformOutcomeMeta } from '@/lib/syncPresentation.ts';
import { platformDisplayName } from '@/lib/marketplaceBrand.ts';
import { DestinationPrimarySetup } from '@/components/platforms/DestinationPrimarySetup.tsx';
import { AccountEditForm } from '@/components/platforms/AccountEditForm.tsx';
import { PlatformQueueSummaryCard } from '@/components/platforms/PlatformQueueSummaryCard.tsx';
import { PagePrimaryState } from '@/components/guidance/PagePrimaryState.tsx';
import { destinationExperience, destinationWhy } from '@/lib/destinationPrimary.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { isInternalSupportRole } from '@/lib/operatorAccess.ts';

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

export default function PlatformDetailPage({ dealerId, nav, activeTab, platformSlug }: Props) {
  const { data: statusData, loading: statusLoading, error: statusError, reload: reloadStatus } = useAsyncQuery(
    () => fetchPublishStatus(dealerId),
    [dealerId]
  );
  const { data: accountsData, loading: accountsLoading, error: accountsError, reload: reloadAccounts } = useAsyncQuery(
    () => fetchAccounts(dealerId),
    [dealerId]
  );

  const platform = useMemo(
    () => statusData?.platforms?.find(p => p.platformSlug === platformSlug),
    [statusData, platformSlug]
  );
  
  const account = useMemo(
    () => accountsData?.accounts?.find(a => a.platformSlug === platformSlug) ?? null,
    [accountsData, platformSlug]
  );
  const richAccount = account as (typeof account & RichPlatformAccount) | null;

  const loading = statusLoading || accountsLoading;
  const error = statusError || accountsError;

  const handleRefresh = () => {
    reloadStatus();
    reloadAccounts();
  };

  if (error && !platform) {
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} onRefresh={handleRefresh}>
        <div className="mb-4">
          <button onClick={() => nav.goToPlatforms()} className="text-sm text-ink-faint hover:text-ink-body">
            ← Back to Channels
          </button>
        </div>
        <ErrorState message={error} onRetry={handleRefresh} />
      </OperatorPage>
    );
  }

  if (loading && !platform) {
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} onRefresh={handleRefresh} refreshing={true}>
        <div className="mb-4">
          <button onClick={() => nav.goToPlatforms()} className="text-sm text-ink-faint hover:text-ink-body">
            ← Back to Channels
          </button>
        </div>
        <PanelSkeleton rows={6} />
      </OperatorPage>
    );
  }

  if (!platform) {
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} onRefresh={handleRefresh}>
        <div className="mb-4">
          <button onClick={() => nav.goToPlatforms()} className="text-sm text-ink-faint hover:text-ink-body">
            ← Back to Channels
          </button>
        </div>
        <div className="p-8 text-center text-ink-faint border border-silver-200 border-dashed rounded-xl">
          This destination is not available for this dealership.
        </div>
      </OperatorPage>
    );
  }

  const { user } = useAuth();
  const isInternal = isInternalSupportRole(user?.role ?? '');
  const publishMeta = platformOutcomeMeta(platform);
  const readiness = getSetupReadiness(platform, account || null);
  const ownedState = platform.integrationClass === 'OWNED' ? ownedMarketplaceStateCopy(platform) : null;
  const displayName = platformDisplayName(platform.platformSlug, platform.platformName);

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
      <div className="mb-6">
        <button onClick={() => nav.goToPlatforms()} className="text-sm font-semibold text-ink-faint hover:text-ink-body transition-colors">
          ← Back to Channels
        </button>
      </div>

      <div className="mb-6">
        <PagePrimaryState
          kind={destinationExperience(readiness)}
          title={readiness.statusLabel === 'Connected' || readiness.statusLabel === 'Ready to send'
            ? `${displayName} is ${readiness.statusLabel.toLowerCase()}`
            : readiness.statusLabel}
          why={destinationWhy(readiness, displayName)}
          next={readiness.nextAction ?? undefined}
          ownerKind={readiness.nextAction ? 'YOU' : undefined}
        />
      </div>

      <div className="bg-white border border-silver-200 rounded-xl shadow-sm mb-6 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <PlatformLogo slug={platform.platformSlug} name={displayName} size="md" />
          <div>
            <h1 className="text-2xl font-bold text-ink-heading">{displayName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-2">
              <span className={`px-2 py-0.5 rounded text-xs font-bold border ${severityToPill(readiness.severity)}`}>
                {readiness.statusLabel}
              </span>
              <span className="text-xs text-ink-faint bg-silver-50 px-2 py-0.5 rounded-md border border-silver-100">
                {publishMeta.label}
              </span>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => nav.goToPlatforms()}
            className="px-4 py-2 text-sm font-bold bg-white border border-silver-200 text-ink-body rounded-lg hover:bg-silver-50 transition-colors"
          >
            All channels
          </button>
        </div>
      </div>

      <PlatformIntroCard
        description={richAccount?.description}
        externalLinks={richAccount?.externalLinks}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">

          <DestinationPrimarySetup
            dealerId={dealerId}
            platform={platform}
            account={account}
            onRefresh={handleRefresh}
          />

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

        {/* Right Column */}
        <div className="space-y-6">

          <PlatformQueueSummaryCard dealerId={dealerId} platformSlug={platform.platformSlug} nav={nav} />

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
    </OperatorPage>
  );
}
