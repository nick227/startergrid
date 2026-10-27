import { useState } from 'react';
import { SimplifiedChannelsView } from '@/components/platforms/SimplifiedChannelsView.tsx';
import { useChannelWorkspace } from '@/hooks/useChannelWorkspace.ts';
import { ErrorState } from '@/components/operator';
import { adminDealerHash, buildOperatorNav, dealerViewHash } from '@/lib/routes.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';

function recordChannelNav(dealerId: string): OperatorNavHandlers {
  const dealer = buildOperatorNav(dealerId);
  return {
    ...dealer,
    goToHome: () => { window.location.hash = adminDealerHash(dealerId); },
    goToPlatforms: () => { window.location.hash = adminDealerHash(dealerId, 'destinations'); },
    goToChannels: () => { window.location.hash = adminDealerHash(dealerId, 'destinations'); },
    goToInventory: () => { window.location.hash = dealerViewHash(dealerId, 'inventory'); },
    goToLeads: () => { window.location.hash = dealerViewHash(dealerId, 'leads'); },
    changeDealer: () => { window.location.hash = '#/admin/dealers'; },
  };
}

export function DealershipDestinationsPanel({ dealerId }: { dealerId: string }) {
  const workspace = useChannelWorkspace(dealerId);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const nav = recordChannelNav(dealerId);

  if (workspace.error && workspace.platforms.length === 0) {
    return <ErrorState message={workspace.error} onRetry={workspace.reload} />;
  }

  return (
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
  );
}
