import { DealerDashboard } from '@/components/dashboard';
import { buildAdminOverviewNav } from '@/features/adminOverview/utils/adminOverviewNav.ts';

export function AdminInsightsTab() {
  return (
    <div className="space-y-4">
      <DealerDashboard
        isAdmin={true}
        nav={buildAdminOverviewNav()}
      />
    </div>
  );
}
