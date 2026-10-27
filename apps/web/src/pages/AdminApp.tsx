import { useMemo, lazy, Suspense } from 'react';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchAdminDashboard } from '@/lib/api/admin.ts';
import { fetchDealers } from '@/lib/api/sdk.ts';
import { AdminShell } from '@/components/operator/AdminShell.tsx';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { DealershipDirectory } from '@/components/dealers/DealershipDirectory.tsx';
import { DealershipRecordView, recordTabFromRoute } from '@/components/dealers/DealershipRecordView.tsx';
import AdminOverviewPage from './AdminOverviewPage.tsx';
import { AdminSettingsIndex, SettingsJobFrame } from './AdminSettingsIndex.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { adminDealerHash, dealerViewHash } from '@/lib/routes.ts';
import {
  ADMIN_PRIMARY_HASH,
  adminPrimaryFromRoute,
  settingsJobFromSlug,
  type AdminPrimary,
} from '@/lib/adminConsole.ts';

const AdminPlatformDetailPage = lazy(() => import('./AdminPlatformDetailPage.tsx'));
const OperationsPage = lazy(() => import('./OperationsPage.tsx'));

const LAZY_FALLBACK = <div className="surface-card-operator p-6"><Skeleton rows={6} /></div>;

const PRIMARY: Array<{ id: AdminPrimary; label: string }> = [
  { id: 'dealers', label: 'Dealerships' },
  { id: 'problems', label: 'Problems' },
  { id: 'settings', label: 'Settings' },
];

type Props = {
  adminDealerId: string | null;
  platformSlug: string | null;
  adminDealerPage: string | null;
  platformView: 'queue' | 'history' | null;
  reportSlug: string | null;
  reportRange: import('@/lib/reportsCatalog.ts').ReportRangePreset;
  adminPlatformSlug: string | null;
};

export default function AdminApp({
  adminDealerId,
  platformSlug,
  adminDealerPage,
  adminPlatformSlug,
}: Props) {
  const { user } = useAuth();
  const primary = useMemo(
    () => adminPrimaryFromRoute(adminDealerId, platformSlug),
    [adminDealerId, platformSlug],
  );
  const settingsJob = settingsJobFromSlug(platformSlug);
  const needsDashboard = primary === 'settings' && (settingsJob === 'platforms' || settingsJob === 'system' || settingsJob === 'audit');
  const { data, loading, error } = useAsyncQuery(
    () => (needsDashboard ? fetchAdminDashboard() : Promise.resolve(null)),
    [needsDashboard],
  );
  const { data: dealersData, loading: dealersLoading, error: dealersError, reload: reloadDealers } =
    useAsyncQuery(() => (settingsJob === 'users' ? fetchDealers() : Promise.resolve(null)), [settingsJob]);

  const tabNav = (
    <nav className="flex items-center gap-1 py-1" aria-label="Admin destinations">
      {PRIMARY.map(t => {
        const isActive = primary === t.id;
        return (
          <button
            key={t.id}
            type="button"
            onClick={() => { window.location.assign(ADMIN_PRIMARY_HASH[t.id]); }}
            aria-current={isActive ? 'page' : undefined}
            className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${
              isActive ? 'bg-navy-800 text-white shadow-elevation-1' : 'text-silver-300 hover:text-white hover:bg-navy-800/50'
            }`}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );

  const overviewProps = {
    data, loading, error,
    dealersData, dealersLoading, dealersError,
    onDealersChanged: reloadDealers,
  };

  return (
    <AdminShell nav={tabNav} helpTopic={primary === 'problems' ? 'staff-problems' : primary === 'settings' ? (settingsJob === 'platforms' ? 'staff-integration-setup' : 'staff-settings') : 'staff-dealership-assistance'}>
      {primary === 'dealers' && !adminDealerId && (
        <DealershipDirectory
          currentUserId={user?.id}
          includeChannelIssues
          onOpenDealership={(id) => { window.location.hash = adminDealerHash(id); }}
        />
      )}

      {primary === 'dealers' && adminDealerId && (
        <DealershipRecordView
          key={adminDealerId}
          dealerId={adminDealerId}
          initialTab={recordTabFromRoute(adminDealerPage)}
          viewer={{ userId: user?.id, isSiteAdmin: true }}
          onOpenDealerView={(id, page) => { window.location.hash = dealerViewHash(id, page); }}
          onBackToDirectory={() => { window.location.hash = ADMIN_PRIMARY_HASH.dealers; }}
        />
      )}

      {primary === 'problems' && (
        <Suspense fallback={LAZY_FALLBACK}>
          <OperationsPage />
        </Suspense>
      )}

      {primary === 'settings' && settingsJob === 'index' && <AdminSettingsIndex />}

      {primary === 'settings' && settingsJob === 'platforms' && !adminPlatformSlug && (
        <SettingsJobFrame job="platforms">
          <AdminOverviewPage activeTab="platforms" {...overviewProps} />
        </SettingsJobFrame>
      )}

      {primary === 'settings' && settingsJob === 'platforms' && adminPlatformSlug && (
        <SettingsJobFrame job="platforms">
          <Suspense fallback={LAZY_FALLBACK}>
            <AdminPlatformDetailPage
              slug={adminPlatformSlug}
              platformOverview={data?.platformOverview ?? []}
              dealerAttention={data?.dealerAttention ?? []}
              recentEvents={data?.recentEvents ?? []}
              queueSnapshot={data?.queueSnapshot ?? null}
              loading={loading}
            />
          </Suspense>
        </SettingsJobFrame>
      )}

      {primary === 'settings' && settingsJob !== 'index' && settingsJob !== 'platforms' && (
        <SettingsJobFrame job={settingsJob}>
          <AdminOverviewPage activeTab={settingsJob} {...overviewProps} />
        </SettingsJobFrame>
      )}
    </AdminShell>
  );
}
