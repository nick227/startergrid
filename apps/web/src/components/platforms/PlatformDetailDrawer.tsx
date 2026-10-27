import { useState, useEffect } from 'react';
import type { PlatformPublishResult, PlatformAccountDetail, PlatformPerformanceItem } from '@/lib/types.ts';
import { getSetupReadiness, severityToPill } from '@/lib/setupReadiness.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import { buildTabs, type Tab } from '@/lib/platformDrawerTabs.ts';
import { PlatformLogo } from './PlatformLogo.tsx';
import { DestinationPrimarySetup } from './DestinationPrimarySetup.tsx';
import { PagePrimaryState } from '@/components/guidance/PagePrimaryState.tsx';
import { destinationExperience, destinationWhy } from '@/lib/destinationPrimary.ts';
import { CatalogSyncPanel } from './CatalogSyncPanel.tsx';
import { LeadSyncPanel } from './LeadSyncPanel.tsx';
import { MarketplaceListingPanel } from './MarketplaceListingPanel.tsx';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { platformDisplayName } from '@/lib/marketplaceBrand.ts';
import { RowDetailDrawer } from '@/components/layout';
import { SocialPageSelector, SocialPostsTab } from '@/components/social/index.ts';

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

import { ActivityTab, FeedTab, NotesTab } from './PlatformDetailTabs.tsx';

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
  // Reset to Setup whenever the operator opens a different platform.
  useEffect(() => { setActiveTab('setup'); }, [platform.platformSlug]);
  const tabs = buildTabs(platform);
  const readiness = getSetupReadiness(platform, account || null);
  const displayName = platformDisplayName(platform.platformSlug, platform.platformName);

  return (
    <RowDetailDrawer open={open} title={displayName} onClose={onClose}>
      <div className="space-y-4">

        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <PlatformLogo slug={platform.platformSlug} name={displayName} size="sm" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-heading truncate">{displayName}</p>
              <span className={`inline-flex mt-1 px-1.5 py-0.5 rounded text-[10px] font-bold border ${severityToPill(readiness.severity)}`}>
                {readiness.statusLabel}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => nav.goToPlatformDetail(platform.platformSlug)}
            className="shrink-0 px-2.5 py-1 text-[11px] font-semibold bg-silver-50 text-ink-body rounded-md hover:bg-silver-100 transition-colors"
          >
            Open full page
          </button>
        </div>

        {/* Tab strip — scrollable on narrow viewports */}
        <div className="flex border-b border-silver-200 overflow-x-auto gap-0 no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 px-3 py-2 text-xs font-semibold border-b-2 -mb-px transition-colors ${
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
          <div className="space-y-4">
            <PagePrimaryState
              kind={destinationExperience(readiness)}
              title={readiness.statusLabel === 'Connected' || readiness.statusLabel === 'Ready to send'
                ? `${displayName} is ${readiness.statusLabel.toLowerCase()}`
                : readiness.statusLabel}
              why={destinationWhy(readiness, displayName)}
              next={readiness.nextAction ?? undefined}
              ownerKind={readiness.nextAction ? 'YOU' : undefined}
            />
            {account ? (
              <DestinationPrimarySetup
                dealerId={dealerId}
                platform={platform}
                account={account}
                onRefresh={onSaved}
              />
            ) : (
              <p className="text-xs text-ink-muted">{operatorCopy.drawer.accountLoading}</p>
            )}
          </div>
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

        {activeTab === 'listing' && (
          <MarketplaceListingPanel platformSlug={platform.platformSlug} account={account} />
        )}

        {activeTab === 'leads' && (
          <LeadSyncPanel dealerId={dealerId} platformSlug={platform.platformSlug} account={account} />
        )}

      </div>
    </RowDetailDrawer>
  );
}
