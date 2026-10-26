import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchAdminDashboard, fetchAdminUsers, fetchBlockedDealers } from '@/lib/api/admin.ts';
import { fetchDealers } from '@/lib/api/sdk.ts';
import { AdminShell } from '@/components/operator/AdminShell.tsx';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { AdminWorkTab } from '@/features/adminOverview/tabs/work/AdminWorkTab.tsx';
import { DealershipRecordView } from '@/components/dealers/DealershipRecordView.tsx';
import AdminOverviewPage from './AdminOverviewPage.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';

const AdminPlatformDetailPage = lazy(() => import('./AdminPlatformDetailPage.tsx'));
const OperationsPage           = lazy(() => import('./OperationsPage.tsx'));

const LAZY_FALLBACK = <div className="surface-card-operator p-6"><Skeleton rows={6} /></div>;

type AdminSection = 'work' | 'dealers' | 'platforms' | 'system' | 'audit' | 'users' | 'operations';

const SECTION_HASHES: Record<AdminSection, string> = {
  work:       '#/admin/work',
  dealers:    '#/admin/dealers',
  platforms:  '#/admin/platforms',
  system:     '#/admin/system',
  audit:      '#/admin/audit',
  users:      '#/admin/users',
  operations: '#/admin/operations',
};

function routeToSection(adminDealerId: string | null, platformSlug: string | null): AdminSection {
  if (platformSlug === 'dealers' || adminDealerId) return 'dealers';
  if (platformSlug === 'platforms' || platformSlug === 'integrations') return 'platforms';
  if (platformSlug === 'system') return 'system';
  if (platformSlug === 'audit') return 'audit';
  if (platformSlug === 'users') return 'users';
  if (platformSlug === 'operations' || platformSlug === 'insights') return 'operations';
  // 'work', 'blockers', 'triage', 'blocked-dealers', or default root '#/admin' route to 'work'
  return 'work';
}

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
  const routeSection = useMemo(
    () => routeToSection(adminDealerId, platformSlug),
    [adminDealerId, platformSlug],
  );

  const [section, setSection] = useState<AdminSection>(routeSection);
  useEffect(() => { setSection(routeSection); }, [routeSection]);

  function navigate(s: AdminSection) {
    setSection(s);
    window.location.assign(SECTION_HASHES[s]);
  }

  const showDealerDetail   = section === 'dealers' && adminDealerId !== null;
  const showPlatformDetail = section === 'platforms' && !!adminPlatformSlug;

  // Data fetching
  const { data, loading, error }                     = useAsyncQuery(() => fetchAdminDashboard(), []);
  const { data: dealersData, loading: dealersLoading, error: dealersError, reload: reloadDealers } = useAsyncQuery(() => fetchDealers(), []);
  const { data: usersData, reload: reloadUsers }     = useAsyncQuery(() => fetchAdminUsers({ limit: 1 }), []);
  const { data: blockersData }                       = useAsyncQuery(() => fetchBlockedDealers({ limit: 1 }), []);

  const allDealers       = dealersData?.dealers ?? [];
  const platformOverview = data?.platformOverview ?? [];
  const dealerAttention  = data?.dealerAttention ?? [];
  const recentEvents     = data?.recentEvents ?? [];
  const blockerCount     = blockersData?.summary.total ?? null;
  const userCount        = usersData?.pagination.total ?? null;

  // Active primary tab
  const activePrimaryTab = showDealerDetail ? 'dealers' : section;

  const PRIMARY_TABS: Array<{ id: AdminSection; label: string; count: number | null }> = [
    { id: 'work',      label: 'Work',         count: blockerCount },
    { id: 'dealers',   label: 'Dealerships',  count: allDealers.length || null },
    { id: 'platforms', label: 'Integrations', count: platformOverview.length || null },
  ];

  const SECONDARY_TABS: Array<{ id: AdminSection; label: string; count?: number | null }> = [
    { id: 'system',     label: 'System Status' },
    { id: 'audit',      label: 'Audit Log' },
    { id: 'users',      label: 'Users', count: userCount },
    { id: 'operations', label: 'Operations' },
  ];

  const tabNav = (
    <div className="flex items-center justify-between gap-4 overflow-x-auto">
      <nav className="flex items-center gap-1 py-1" aria-label="Primary destinations">
        {PRIMARY_TABS.map(t => {
          const isActive = activePrimaryTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => navigate(t.id)}
              className={`px-4 py-2.5 text-xs font-semibold rounded-lg transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-navy-800 text-white shadow-elevation-1'
                  : 'text-silver-300 hover:text-white hover:bg-navy-800/50'
              }`}
            >
              <span>{t.label}</span>
              {t.count !== null && (
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
                  isActive ? 'bg-navy-700 text-silver-100' : 'bg-navy-900 text-silver-400'
                }`}>
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="flex items-center gap-2 py-1 border-l border-navy-800/80 pl-3">
        <span className="text-[10px] uppercase font-bold tracking-wider text-silver-400 hidden xl:inline">
          Admin:
        </span>
        {SECONDARY_TABS.map(t => {
          const isActive = activePrimaryTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => navigate(t.id)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
                isActive
                  ? 'text-white bg-navy-800 font-semibold'
                  : 'text-silver-300 hover:text-white hover:bg-navy-900/60'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <AdminShell nav={tabNav}>
      {/* 1. WORK HUB */}
      {section === 'work' && (
        <AdminWorkTab
          dealers={allDealers as any}
          blockedData={blockersData}
          dashboardData={data}
          currentUserEmail={user?.email}
          onSelectDealer={(dealerId, subTab) => {
            window.location.hash = subTab ? `#/admin/dealers/${dealerId}/${subTab}` : `#/admin/dealers/${dealerId}`;
          }}
        />
      )}

      {/* 2. DEALERSHIP DIRECTORY & CENTRAL DEALERSHIP RECORD */}
      {section === 'dealers' && !showDealerDetail && (
        <AdminOverviewPage
          activeTab="dealers"
          data={data}
          loading={loading}
          error={error}
          dealersData={dealersData}
          dealersLoading={dealersLoading}
          dealersError={dealersError}
          onDealersChanged={reloadDealers}
          onUsersChanged={reloadUsers}
        />
      )}

      {section === 'dealers' && showDealerDetail && adminDealerId && (
        <DealershipRecordView
          dealerId={adminDealerId}
          initialSubTab={
            adminDealerPage === 'platforms' || adminDealerPage === 'channels' ? 'channels' :
            adminDealerPage === 'inventory' || adminDealerPage === 'vehicles' ? 'vehicles' :
            adminDealerPage === 'setup' ? 'setup' :
            adminDealerPage === 'people' ? 'people' :
            adminDealerPage === 'activity' ? 'activity' :
            'overview'
          }
          onOpenDealerView={(id) => {
            window.location.hash = `#/${id}?support=true`;
          }}
          onBackToDirectory={() => navigate('dealers')}
          onRefreshDealers={reloadDealers}
        />
      )}

      {/* 3. INTEGRATIONS / PLATFORMS DIRECTORY & DETAIL */}
      {section === 'platforms' && !showPlatformDetail && (
        <AdminOverviewPage
          activeTab="platforms"
          data={data}
          loading={loading}
          error={error}
          dealersData={dealersData}
          dealersLoading={dealersLoading}
          dealersError={dealersError}
          onDealersChanged={reloadDealers}
          onUsersChanged={reloadUsers}
        />
      )}

      {section === 'platforms' && showPlatformDetail && adminPlatformSlug && (
        <Suspense fallback={LAZY_FALLBACK}>
          <AdminPlatformDetailPage
            slug={adminPlatformSlug}
            platformOverview={platformOverview}
            dealerAttention={dealerAttention}
            recentEvents={recentEvents}
            queueSnapshot={data?.queueSnapshot ?? null}
            loading={loading}
          />
        </Suspense>
      )}

      {/* 4. SECONDARY ADMINISTRATION TABS */}
      {(section === 'system' || section === 'audit' || section === 'users') && (
        <AdminOverviewPage
          activeTab={section}
          data={data}
          loading={loading}
          error={error}
          dealersData={dealersData}
          dealersLoading={dealersLoading}
          dealersError={dealersError}
          onDealersChanged={reloadDealers}
          onUsersChanged={reloadUsers}
        />
      )}

      {section === 'operations' && (
        <Suspense fallback={LAZY_FALLBACK}>
          <OperationsPage />
        </Suspense>
      )}
    </AdminShell>
  );
}
