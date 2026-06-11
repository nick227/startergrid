import { useMemo } from 'react';
import { fetchPublishStatus, fetchAccounts } from '@/lib/api/sdk.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { OperatorPage, ErrorState, PanelSkeleton } from '@/components/operator';
import { PlatformLogo } from '@/components/platforms/PlatformLogo.tsx';
import { oauthProviderDisplayName } from '@/lib/platformPresentation.ts';
import { getSetupReadiness, severityToPill } from '@/lib/setupReadiness.ts';
import { platformOutcomeMeta } from '@/lib/syncPresentation.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { ConnectionSetupPanel } from '@/components/platforms/ConnectionSetupPanel.tsx';

type Props = OperatorPageBaseProps & {
  platformSlug: string;
};

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
            ← Back to platforms
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
            ← Back to platforms
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
            ← Back to platforms
          </button>
        </div>
        <div className="p-8 text-center text-ink-faint border border-silver-200 border-dashed rounded-xl">
          Platform not found or unsupported for this dealer's category.
        </div>
      </OperatorPage>
    );
  }

  const publishMeta = platformOutcomeMeta(platform);
  const readiness = getSetupReadiness(platform, account || null);

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
          ← Back to platforms
        </button>
      </div>

      <div className="bg-white border border-silver-200 rounded-xl shadow-sm mb-6 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <PlatformLogo slug={platform.platformSlug} name={platform.platformName} size="md" />
          <div>
            <h1 className="text-2xl font-bold text-ink-heading">{platform.platformName}</h1>
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
            onClick={() => nav.goToPlatformQueue(platform.platformSlug)}
            className="px-4 py-2 text-sm font-bold bg-white border border-silver-200 text-ink-body rounded-lg hover:bg-silver-50 transition-colors"
          >
            {operatorCopy.channels.rowActions.queue}
          </button>
          <button
            type="button"
            onClick={() => nav.goToPlatformHistory(platform.platformSlug)}
            className="px-4 py-2 text-sm font-bold bg-white border border-silver-200 text-ink-body rounded-lg hover:bg-silver-50 transition-colors"
          >
            {operatorCopy.channels.rowActions.history}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Capabilities Card */}
          <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-5">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint mb-4">Capabilities</h2>
            <div className="flex flex-wrap gap-2">
              {platform.catalogSync && <span className="px-2 py-1 bg-teal-50 text-teal-800 border border-teal-200 rounded text-xs font-semibold">Catalog Sync</span>}
              {platform.socialPosting && <span className="px-2 py-1 bg-indigo-50 text-indigo-800 border border-indigo-200 rounded text-xs font-semibold">Social Posting</span>}
              {platform.marketplaceListing && <span className="px-2 py-1 bg-sky-50 text-sky-800 border border-sky-200 rounded text-xs font-semibold">Marketplace Listing</span>}
              {platform.partnerFeed && <span className="px-2 py-1 bg-purple-50 text-purple-800 border border-purple-200 rounded text-xs font-semibold">Partner Feed</span>}
              {platform.leadSync && <span className="px-2 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-xs font-semibold">Lead Sync</span>}
              {!platform.catalogSync && !platform.socialPosting && !platform.marketplaceListing && !platform.partnerFeed && !platform.leadSync && (
                <span className="text-sm text-ink-muted">No specific capabilities advertised.</span>
              )}
            </div>
          </div>

          {/* Validation Readiness Card */}
          <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint mb-2">Validation Readiness</h2>
            
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

            {account?.liveValidationNote && (
              <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-xs font-bold text-amber-800 mb-1">Live Validation Blocked</p>
                <p className="text-xs text-amber-900/80">{account.liveValidationNote}</p>
              </div>
            )}
            {platform.detail && (
              <div className="mt-2 text-sm text-ink-muted">
                {platform.detail}
              </div>
            )}
          </div>

          {/* Data-Driven Setup Engine */}
          <ConnectionSetupPanel
            dealerId={dealerId!}
            platform={platform}
            account={account || undefined}
            onRefresh={reloadAccounts}
          />

          {/* Required Fields Card */}
          {(account?.requiredDealershipFields?.length || account?.requiredVehicleFields?.length) ? (
            <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-5">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint mb-4">Required Data Fields</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {account?.requiredDealershipFields && account.requiredDealershipFields.length > 0 && (
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-wider text-ink-muted mb-2">Dealership</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {account.requiredDealershipFields.map(f => (
                        <span key={f} className="px-2 py-0.5 bg-silver-50 border border-silver-200 rounded-md text-[11px] text-ink-body font-mono">
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
                        <span key={f} className="px-2 py-0.5 bg-silver-50 border border-silver-200 rounded-md text-[11px] text-ink-body font-mono">
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

        {/* Right Column */}
        <div className="space-y-6">
          
          {/* Connection Method Card */}
          <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-5">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint mb-4">Connection Method</h2>
            <div className="mb-4 flex flex-col gap-1">
              <span className="text-xs text-ink-muted uppercase font-bold tracking-wide">Integration Class</span>
              <span className="text-sm font-semibold text-ink-body">{account?.integrationClass || platform.integrationClass}</span>
            </div>
            {platform.connectionType === 'OAUTH' && account?.oauthProvider ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-sky-50 flex items-center justify-center text-sky-600 font-bold">O</div>
                  <div>
                    <div className="text-sm font-bold text-ink-body">OAuth 2.0</div>
                    <div className="text-xs text-ink-muted">via {oauthProviderDisplayName(account.oauthProvider)}</div>
                  </div>
                </div>
              </div>
            ) : platform.connectionType === 'PARTNER_FEED' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-purple-50 flex items-center justify-center text-purple-600 font-bold">F</div>
                  <div>
                    <div className="text-sm font-bold text-ink-body">Partner Feed</div>
                    <div className="text-xs text-ink-muted">Assisted transmission</div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded bg-silver-100 flex items-center justify-center text-ink-muted font-bold">N</div>
                  <div>
                    <div className="text-sm font-bold text-ink-body">None / API</div>
                    <div className="text-xs text-ink-muted">First-party or direct integration</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Documentation Links */}
          <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-5">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint mb-4">Resources</h2>
            <ul className="space-y-3">
              {account?.integrationUrls?.partnerPortalUrl && (
                <li>
                  <a href={account.integrationUrls.partnerPortalUrl} target="_blank" rel="noreferrer" className="text-sm text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1.5">
                    <span className="text-lg leading-none">↗</span> Partner Portal
                  </a>
                </li>
              )}
              {account?.integrationUrls?.developerDocsUrl && (
                <li>
                  <a href={account.integrationUrls.developerDocsUrl} target="_blank" rel="noreferrer" className="text-sm text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1.5">
                    <span className="text-lg leading-none">↗</span> Developer API Docs
                  </a>
                </li>
              )}
              {account?.integrationUrls?.feedSpecUrl && (
                <li>
                  <a href={account.integrationUrls.feedSpecUrl} target="_blank" rel="noreferrer" className="text-sm text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1.5">
                    <span className="text-lg leading-none">↗</span> Feed Specification
                  </a>
                </li>
              )}
              {account?.integrationUrls?.supportUrl && (
                <li>
                  <a href={account.integrationUrls.supportUrl} target="_blank" rel="noreferrer" className="text-sm text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1.5">
                    <span className="text-lg leading-none">↗</span> Platform Support
                  </a>
                </li>
              )}
              {!account?.integrationUrls && account?.connectionFields?.find(f => f.helpUrl) && (
                <li>
                  <a href={account.connectionFields.find(f => f.helpUrl)?.helpUrl} target="_blank" rel="noreferrer" className="text-sm text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1.5">
                    <span className="text-lg leading-none">↗</span> Platform setup guide
                  </a>
                </li>
              )}
              {!account?.integrationUrls && !account?.connectionFields?.find(f => f.helpUrl) && (
                <li>
                  <span className="text-sm text-ink-muted">No external docs available</span>
                </li>
              )}
              <li>
                <button type="button" onClick={() => nav.goToHelp()} className="text-sm text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1.5">
                  <span className="text-lg leading-none">📚</span> Internal knowledge base
                </button>
              </li>
            </ul>
          </div>

          {/* Profile Confidence Card */}
          <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-5">
            <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint mb-4">Profile Confidence</h2>
            <div className="space-y-4">
              <div>
                <div className="text-[10px] text-ink-muted uppercase font-bold tracking-wide">Data Confidence</div>
                <div className="font-semibold text-ink-body mt-0.5">{account?.profileConfidence || 'UNKNOWN'}</div>
              </div>
              <div>
                <div className="text-[10px] text-ink-muted uppercase font-bold tracking-wide">Requirements Confidence</div>
                <div className="font-semibold text-ink-body mt-0.5">{account?.requirementsConfidence || 'UNKNOWN'}</div>
              </div>
              {account?.requirementsConfidence === 'UNKNOWN' && (
                <div className="text-xs text-amber-600 mt-2 bg-amber-50 p-2 rounded border border-amber-200">
                  Requirements are still being confirmed for this platform.
                </div>
              )}
            </div>
          </div>
          
        </div>
      </div>
    </OperatorPage>
  );
}
