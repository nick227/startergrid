import { useState, useEffect } from 'react';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { OperatorPage, ErrorState, PageHeader } from '@/components/operator';
import { SimplifiedChannelsView } from '@/components/platforms/SimplifiedChannelsView.tsx';
import { OAuthConnectBanner } from '@/components/platforms/OAuthConnectBanner.tsx';
import { platformDisplayName } from '@/lib/marketplaceBrand.ts';
import { PlatformConnectBanner } from '@/components/platforms/PlatformConnectBanner.tsx';
import { useChannelWorkspace } from '@/hooks/useChannelWorkspace.ts';

type Props = OperatorPageBaseProps & {
  initialPlatformSlug?: string | null;
};

export default function PlatformsPage({ dealerId, nav, activeTab, initialPlatformSlug }: Props) {
  const workspace = useChannelWorkspace(dealerId);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialPlatformSlug ?? null);
  const [connectedSlug, setConnectedSlug] = useState<string | null>(null);

  useEffect(() => {
    if (initialPlatformSlug) setSelectedSlug(initialPlatformSlug);
  }, [initialPlatformSlug]);

  if (workspace.error && !workspace.platforms.length) {
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} onRefresh={workspace.reload}>
        <ErrorState message={workspace.error} onRetry={workspace.reload} />
      </OperatorPage>
    );
  }

  return (
    <OperatorPage
      dealerId={dealerId}
      dealerName={workspace.dealerName}
      activeTab={activeTab}
      nav={nav}
      onRefresh={workspace.reload}
      refreshing={workspace.loading}
      lastRefresh={workspace.lastRefresh ?? undefined}
      hideDealerId
    >
      <PageHeader title="Channels" />

      {connectedSlug && (
        <PlatformConnectBanner
          platformName={platformDisplayName(
            connectedSlug,
            workspace.platforms.find(p => p.platformSlug === connectedSlug)?.platformName ?? connectedSlug,
          )}
          platformSlug={connectedSlug}
          stats={workspace.queueStatsBySlug.get(connectedSlug) ?? null}
          readyVehicleCount={workspace.readyVehicleCount}
          nav={nav}
          onDismiss={() => setConnectedSlug(null)}
        />
      )}

      <OAuthConnectBanner
        platforms={workspace.platforms}
        accountBySlug={workspace.accountBySlug}
        dealerId={dealerId}
        onDone={() => {
          workspace.reloadAccounts();
          workspace.reloadStatus();
          workspace.reloadQueue();
        }}
      />

      <SimplifiedChannelsView
        platforms={workspace.platforms}
        perfBySlug={workspace.perfBySlug}
        accountBySlug={workspace.accountBySlug}
        dealerId={dealerId}
        nav={nav}
        selectedSlug={selectedSlug}
        onSelectSlug={setSelectedSlug}
        onAccountSaved={() => {
          workspace.reloadAccounts();
          workspace.reloadSocial();
          workspace.reloadStatus();
          workspace.reloadQueue();
        }}
        loading={workspace.loading}
        emptyMessage={workspace.emptyMessage}
        storefrontHref={workspace.storefrontHref}
      />
    </OperatorPage>
  );
}
