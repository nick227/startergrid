import { useMemo } from 'react';
import { fetchDealers } from '@/lib/api/sdk.ts';
import { fetchAdminDashboard, fetchBlockedDealers } from '@/lib/api/admin.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { ErrorState, OperatorPage } from '@/components/operator/index.ts';
import { DealershipProfilePanel } from '@/components/dealers/DealershipProfilePanel.tsx';
import type { OperatorNavHandlers, OperatorTab } from '@/lib/operatorNav.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { PublishingFlowComic } from '@/components/publishing/PublishingFlowComic.tsx';

import { ActivityIssuesSurface } from '@/features/operations/ActivityIssuesSurface.tsx';

type Props = {
  dealerId: string;
  nav: OperatorNavHandlers;
  activeTab: OperatorTab;
};

export default function AdminDealerPage({ dealerId, nav, activeTab }: Props) {

  const { data: dealersData, loading: dealersLoading, error: dealersError, reload: reloadDealers } =
    useAsyncQuery(() => fetchDealers(), []);

  const { loading: dashLoading, error: dashError, reload: reloadDash } =
    useAsyncQuery(() => fetchAdminDashboard(), []);

  const { loading: blockersLoading, error: blockersError, reload: reloadBlockers } =
    useAsyncQuery(() => fetchBlockedDealers({ dealerId, limit: 50 }), [dealerId]);

  const dealer = useMemo(
    () => dealersData?.dealers.find(d => d.id === dealerId) ?? null,
    [dealersData, dealerId],
  );

  const loading = dealersLoading || dashLoading || blockersLoading;
  const error   = dealersError || dashError || blockersError;
  const reload  = () => { reloadDealers(); reloadDash(); reloadBlockers(); };

  if (loading) {
    return <div className="surface-card-operator p-6"><Skeleton rows={6} /></div>;
  }

  if (error) {
    return <ErrorState message={error} onRetry={reload} />;
  }

  if (!dealer) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
        <div className="text-4xl font-black text-silver-300 select-none">404</div>
        <h2 className="text-lg font-bold text-ink-heading">Dealer not found</h2>
        <p className="text-sm text-ink-muted max-w-sm">
          No dealer with ID{' '}
          <span className="font-mono bg-surface-inset border border-silver-200 px-1.5 py-0.5 rounded text-xs text-ink-heading">
            {dealerId}
          </span>{' '}
          exists in the system. Use the Dealers tab to navigate back.
        </p>
      </div>
    );
  }

  return (
    <OperatorPage
      dealerId={dealerId}
      dealerName={dealer.legalName}
      activeTab={activeTab}
      nav={nav}
      sectionLabel="Overview"
    >
      {/* Secondary internal navigation */}
      {/* Scoped Dealer Actionable View */}
      <div className="space-y-6">
        <PublishingFlowComic variant="operator" nav={nav} />
        <DealershipProfilePanel dealerId={dealerId} mode="admin" onDealersChanged={reloadDealers} />
        <ActivityIssuesSurface scope={{ type: 'dealer', dealerId: dealerId }} />
      </div>
    </OperatorPage>
  );
}
