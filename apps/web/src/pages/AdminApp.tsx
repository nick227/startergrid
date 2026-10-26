import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchAdminDashboard } from '@/lib/api/admin.ts';
import { fetchDealers } from '@/lib/api/sdk.ts';
import { AdminShell } from '@/components/operator/AdminShell.tsx';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { DealershipDirectory } from '@/components/dealers/DealershipDirectory.tsx';
import { DealershipRecordView, recordTabFromRoute } from '@/components/dealers/DealershipRecordView.tsx';
import AdminOverviewPage from './AdminOverviewPage.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { adminDealerHash, dealerViewHash } from '@/lib/routes.ts';

const AdminPlatformDetailPage = lazy(() => import('./AdminPlatformDetailPage.tsx'));
const OperationsPage           = lazy(() => import('./OperationsPage.tsx'));

const LAZY_FALLBACK = <div className="surface-card-operator p-6"><Skeleton rows={6} /></div>;

type AdminSection = 'dealers' | 'platforms' | 'operations' | 'system' | 'audit' | 'users';

const SECTION_HASHES: Record<AdminSection, string> = {
  dealers:    '#/admin/dealers',
  platforms:  '#/admin/platforms',
  operations: '#/admin/operations',
  system:     '#/admin/system',
  audit:      '#/admin/audit',
  users:      '#/admin/users',
};

// Work, blockers and triage now live in the dealership directory ("Needs action")
// and Platform → Operations, so their old links land there.
function routeToSection(adminDealerId: string | null, platformSlug: string | null): AdminSection {
  if (adminDealerId) return 'dealers';
  if (platformSlug === 'platforms' || platformSlug === 'integrations') return 'platforms';
  if (platformSlug === 'operations' || platformSlug === 'insights' || platformSlug === 'blockers' || platformSlug === 'blocked-dealers') return 'operations';
  if (platformSlug === 'system') return 'system';
  if (platformSlug === 'audit') return 'audit';
  if (platformSlug === 'users') return 'users';
  return 'dealers';
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

const PRIMARY: Array<{ id: AdminSection; label: string }> = [
  { id: 'dealers', label: 'Dealerships' },
  { id: 'platforms', label: 'Integrations' },
];

const PLATFORM: Array<{ id: AdminSection; label: string }> = [
  { id: 'operations', label: 'Operations' },
  { id: 'system', label: 'System status' },
  { id: 'audit', label: 'Audit log' },
  { id: 'users', label: 'Internal staff' },
];

export default function AdminApp({
  adminDealerId,
  platformSlug,
  adminDealerPage,
  adminPlatformSlug,
}: Props) {
  const { user } = useAuth();
  const routeSection = useMemo(() => routeToSection(adminDealerId, platformSlug), [adminDealerId, platformSlug]);
  const [section, setSection] = useState<AdminSection>(routeSection);
  useEffect(() => { setSection(routeSection); }, [routeSection]);

  function navigate(s: AdminSection) {
    setSection(s);
    window.location.assign(SECTION_HASHES[s]);
  }

  const showPlatformDetail = section === 'platforms' && !!adminPlatformSlug;
  const needsDashboard = section === 'platforms' || section === 'system' || section === 'audit';

  // The dashboard and legacy dealer list feed only the integration and system views.
  const { data, loading, error } = useAsyncQuery(() => (needsDashboard ? fetchAdminDashboard() : Promise.resolve(null)), [needsDashboard]);
  const { data: dealersData, loading: dealersLoading, error: dealersError, reload: reloadDealers } =
    useAsyncQuery(() => (section === 'users' ? fetchDealers() : Promise.resolve(null)), [section]);

  const tabButton = (t: { id: AdminSection; label: string }, primary: boolean) => {
    const isActive = section === t.id;
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => navigate(t.id)}
        aria-current={isActive ? 'page' : undefined}
        className={primary
          ? `px-4 py-2.5 text-xs font-semibold rounded-lg transition-all ${isActive ? 'bg-navy-800 text-white shadow-elevation-1' : 'text-silver-300 hover:text-white hover:bg-navy-800/50'}`
          : `px-2.5 py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${isActive ? 'text-white bg-navy-800 font-semibold' : 'text-silver-300 hover:text-white hover:bg-navy-900/60'}`}
      >
        {t.label}
      </button>
    );
  };

  const tabNav = (
    <div className="flex items-center justify-between gap-4 overflow-x-auto">
      <nav className="flex items-center gap-1 py-1" aria-label="Primary destinations">
        {PRIMARY.map(t => tabButton(t, true))}
      </nav>
      <nav className="flex items-center gap-2 py-1 border-l border-navy-800/80 pl-3" aria-label="Platform">
        <span className="text-[10px] uppercase font-bold tracking-wider text-silver-400 hidden xl:inline">Platform</span>
        {PLATFORM.map(t => tabButton(t, false))}
      </nav>
    </div>
  );

  const overviewProps = {
    data, loading, error,
    dealersData, dealersLoading, dealersError,
    onDealersChanged: reloadDealers,
  };

  return (
    <AdminShell nav={tabNav}>
      {section === 'dealers' && !adminDealerId && (
        <DealershipDirectory
          currentUserId={user?.id}
          includeChannelIssues
          onOpenDealership={(id) => { window.location.hash = adminDealerHash(id); }}
        />
      )}

      {section === 'dealers' && adminDealerId && (
        <DealershipRecordView
          key={adminDealerId}
          dealerId={adminDealerId}
          initialTab={recordTabFromRoute(adminDealerPage)}
          viewer={{ userId: user?.id, isSiteAdmin: true }}
          onOpenDealerView={(id, page) => { window.location.hash = dealerViewHash(id, page); }}
          onBackToDirectory={() => navigate('dealers')}
        />
      )}

      {section === 'platforms' && !showPlatformDetail && <AdminOverviewPage activeTab="platforms" {...overviewProps} />}

      {section === 'platforms' && showPlatformDetail && adminPlatformSlug && (
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
      )}

      {(section === 'system' || section === 'audit' || section === 'users') && (
        <AdminOverviewPage activeTab={section} {...overviewProps} />
      )}

      {section === 'operations' && (
        <Suspense fallback={LAZY_FALLBACK}>
          <OperationsPage />
        </Suspense>
      )}
    </AdminShell>
  );
}
