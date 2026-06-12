import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { ErrorState } from '@/components/operator/index.ts';
import type { AdminDashboardResponse } from '@/lib/api/admin.ts';
import type { DealerSummary } from '@/lib/types.ts';
import { SystemStatusTab } from '@/features/adminOverview/tabs/system/index.ts';
import { DealershipsTab } from '@/features/adminOverview/tabs/dealerships/index.ts';
import { PlatformsTab } from '@/features/adminOverview/tabs/platforms/index.ts';
import { TriageTab } from '@/features/adminOverview/tabs/triage/index.ts';
import { AuditLogTab } from '@/features/adminOverview/tabs/audit/index.ts';
import { AdminInsightsTab } from '@/features/adminOverview/tabs/insights/index.ts';
import { UsersTab } from '@/features/adminOverview/tabs/users/index.ts';

type AdminOverviewTab = 'system' | 'dealers' | 'platforms' | 'triage' | 'audit' | 'insights' | 'users';

type Props = {
  activeTab: AdminOverviewTab;
  data: AdminDashboardResponse | null;
  loading: boolean;
  error: string | null;
  dealersData: { dealers: DealerSummary[] } | null;
  dealersLoading: boolean;
  dealersError: string | null;
  onDealersChanged?: () => void;
  onUsersChanged?: () => void;
};

export default function AdminOverviewPage({
  activeTab,
  data,
  loading,
  error,
  dealersData,
  dealersLoading,
  dealersError,
  onDealersChanged,
  onUsersChanged,
}: Props) {
  if (activeTab === 'users') {
    return (
      <UsersTab
        dealersData={dealersData}
        onDealersChanged={onDealersChanged}
        onUsersChanged={onUsersChanged}
      />
    );
  }

  if (loading && !data) {
    return <div className="surface-card-operator p-6"><Skeleton rows={12} /></div>;
  }

  if (error) {
    return <ErrorState message={error} />;
  }

  if (!data) {
    return null;
  }

  if (activeTab === 'system') {
    return (
      <SystemStatusTab
        health={data.health}
        readiness={data.readiness}
        queueSnapshot={data.queueSnapshot}
      />
    );
  }

  if (activeTab === 'dealers') {
    return (
      <DealershipsTab
        dealersData={dealersData}
        dealersLoading={dealersLoading}
        dealersError={dealersError}
        dealerAttention={data.dealerAttention ?? []}
        onDealersChanged={onDealersChanged}
      />
    );
  }

  if (activeTab === 'platforms') {
    return <PlatformsTab platformOverview={data.platformOverview ?? []} />;
  }

  if (activeTab === 'triage') {
    return <TriageTab />;
  }

  if (activeTab === 'audit') {
    return <AuditLogTab recentEvents={data.recentEvents ?? []} />;
  }

  if (activeTab === 'insights') {
    return <AdminInsightsTab />;
  }

  return null;
}
