import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchAdminDashboard } from '@/lib/api/admin.ts';
import { fetchDealers } from '@/lib/api/sdk.ts';
import { AdminShell } from '@/components/operator/AdminShell.tsx';
import { AdminViewContext } from '@/contexts/AdminViewContext.tsx';
import { CategoryProvider } from '@/contexts/CategoryContext.tsx';
import { useDealerCategorySchema } from '@/hooks/useDealerCategorySchema.ts';
import { appendRowNavScope } from '@/lib/rowNavScope.ts';
import type { OperatorNavHandlers } from '@/lib/operatorNav.ts';
import type { ReportRangePreset } from '@/lib/reportsCatalog.ts';
import AdminOverviewPage from './AdminOverviewPage.tsx';
import AdminDealerPage from './AdminDealerPage.tsx';
import PlatformsPage from './PlatformsPage.tsx';
import QueuePage from './QueuePage.tsx';
import HistoryPage from './HistoryPage.tsx';
import InventoryPage from './InventoryPage.tsx';
import KnowledgeBasePage from './KnowledgeBasePage.tsx';
import { Skeleton } from '@/components/ui/Skeleton.tsx';

const AdminCredentialsPage  = lazy(() => import('./AdminCredentialsPage.tsx'));
const AdminBlockedDealersPage = lazy(() => import('./AdminBlockedDealersPage.tsx'));
const PlatformDetailPage    = lazy(() => import('./PlatformDetailPage.tsx'));
const PlatformQueuePage     = lazy(() => import('./PlatformQueuePage.tsx'));
const PlatformHistoryPage   = lazy(() => import('./PlatformHistoryPage.tsx'));
const ReportsRouter         = lazy(() => import('./ReportsRouter.tsx'));

const LAZY_FALLBACK = <div className="surface-card-operator p-6"><Skeleton rows={6} /></div>;

type AdminSection = 'system' | 'dealers' | 'platforms' | 'triage' | 'blocked' | 'audit' | 'credentials' | 'insights';
type OverviewTab = 'system' | 'dealers' | 'platforms' | 'triage' | 'audit' | 'insights';

const SECTION_HASHES: Record<AdminSection, string> = {
  system:      '#/admin',
  dealers:     '#/admin/dealers',
  platforms:   '#/admin/platforms',
  triage:      '#/admin/triage',
  insights:    '#/admin/insights',
  blocked:     '#/admin/blocked-dealers',
  audit:       '#/admin/audit',
  credentials: '#/admin/platform-credentials',
};

function routeToSection(adminDealerId: string | null, platformSlug: string | null): AdminSection {
  if (platformSlug === 'platform-credentials') return 'credentials';
  if (platformSlug === 'blocked-dealers')       return 'blocked';
  if (platformSlug === 'insights')              return 'insights';
  if (platformSlug === 'dealers' || adminDealerId) return 'dealers';
  if (platformSlug === 'platforms') return 'platforms';
  if (platformSlug === 'triage')    return 'triage';
  if (platformSlug === 'audit')     return 'audit';
  return 'system';
}

function isOverviewTab(s: AdminSection): s is OverviewTab {
  return s === 'system' || s === 'dealers' || s === 'platforms' || s === 'triage' || s === 'audit' || s === 'insights';
}

function buildAdminDealerNav(dealerId: string): OperatorNavHandlers {
  const base = `#/admin/dealers/${dealerId}`;
  return {
    goToHome:           ()           => { window.location.hash = base; },
    goToPlatforms:      ()           => { window.location.hash = `${base}/platforms`; },
    goToQueue:          (scope)      => { window.location.hash = appendRowNavScope(`${base}/queue`, scope); },
    goToHistory:        (scope)      => { window.location.hash = appendRowNavScope(`${base}/history`, scope); },
    goToReports:        ()           => { window.location.hash = `${base}/reports`; },
    goToInventory:      (scope)      => { window.location.hash = appendRowNavScope(`${base}/inventory`, scope); },
    goToHelp:           ()           => { window.location.hash = `${base}/help`; },
    goToPlatformDetail: (slug, scope) => { window.location.hash = appendRowNavScope(`${base}/platforms/${slug}`, scope); },
    goToPlatformQueue:  (slug, scope) => { window.location.hash = appendRowNavScope(`${base}/platforms/${slug}/queue`, scope); },
    goToPlatformHistory:(slug, scope) => { window.location.hash = appendRowNavScope(`${base}/platforms/${slug}/history`, scope); },
    goToSync:           ()           => { window.location.hash = `${base}/platforms`; },
    goToAccounts:       ()           => { window.location.hash = `${base}/platforms`; },
    goToInsights:       ()           => { window.location.hash = `${base}/reports`; },
    goToKnowledge:      ()           => { window.location.hash = `${base}/help`; },
    goToLeads:          ()           => { window.location.hash = `${base}/leads`; },
    changeDealer:       ()           => { window.location.hash = '#/admin/dealers'; },
  };
}

type Props = {
  adminDealerId: string | null;
  platformSlug: string | null;
  adminDealerPage: string | null;
  platformView: 'queue' | 'history' | null;
  reportSlug: string | null;
  reportRange: ReportRangePreset;
};

export default function AdminApp({
  adminDealerId,
  platformSlug,
  adminDealerPage,
  platformView,
  reportSlug,
  reportRange,
}: Props) {
  const routeSection = useMemo(
    () => routeToSection(adminDealerId, platformSlug),
    [adminDealerId, platformSlug],
  );

  const [section, setSection] = useState<AdminSection>(routeSection);
  useEffect(() => { setSection(routeSection); }, [routeSection]);

  function navigate(s: AdminSection) {
    setSection(s);
    window.location.hash = SECTION_HASHES[s];
  }

  const showDealerDetail = section === 'dealers' && adminDealerId !== null;
  const showOverview     = isOverviewTab(section) && !showDealerDetail;

  const adminNav = useMemo(
    () => adminDealerId ? buildAdminDealerNav(adminDealerId) : null,
    [adminDealerId],
  );

  const dealerCategorySchema = useDealerCategorySchema(showDealerDetail ? adminDealerId : null);

  const activeOperatorTab =
    !adminDealerPage                ? 'home'
    : adminDealerPage === 'queue'     ? 'queue'
    : adminDealerPage === 'history' ? 'history'
    : adminDealerPage === 'reports' ? 'reports'
    : adminDealerPage === 'inventory' ? 'inventory'
    : adminDealerPage === 'help'    ? 'help'
    : 'platforms';

  // Data fetching
  const { data, loading, error, reload }             = useAsyncQuery(() => fetchAdminDashboard(), []);
  const { data: dealersData, loading: dealersLoading, error: dealersError } = useAsyncQuery(() => fetchDealers(), []);

  const meta             = data?.meta;
  const allDealers       = dealersData?.dealers ?? [];
  const platformOverview = data?.platformOverview ?? [];
  const dealerAttention  = data?.dealerAttention ?? [];
  const recentEvents     = data?.recentEvents ?? [];
  const criticalCount    = dealerAttention.filter(d => d.severity === 'critical').length;

  const adminAction = (
    <>
      {meta && (
        <span className="text-[10px] text-ink-faint font-mono hidden md:block">
          {meta.cached ? 'cached' : 'live'} · {meta.durationMs}ms
        </span>
      )}
      <a
        href="#/help"
        className="px-3 py-1.5 text-xs font-medium text-ink-faint hover:text-white border border-navy-700 hover:border-navy-600 rounded-md transition-all"
      >
        Knowledge Base
      </a>
      <button
        type="button"
        onClick={() => { window.location.hash = '#/admin/platform-credentials'; }}
        className="btn-primary-operator"
      >
        Credential Validation
      </button>
      <button
        type="button"
        onClick={() => void reload()}
        disabled={loading}
        className="px-3 py-1.5 text-xs font-medium bg-navy-800 hover:bg-navy-700 text-silver-100 rounded-md transition-colors disabled:opacity-40"
      >
        {loading ? 'Refreshing…' : 'Refresh'}
      </button>
    </>
  );

  const TABS = [
    { id: 'system'      as AdminSection, label: 'System Status',  count: null,                     alert: false },
    { id: 'dealers'     as AdminSection, label: 'Dealerships',    count: allDealers.length || null, alert: false },
    { id: 'platforms'   as AdminSection, label: 'Platforms',      count: platformOverview.length,   alert: false },
    { id: 'triage'      as AdminSection, label: 'Dealer Triage',  count: dealerAttention.length,    alert: criticalCount > 0 },
    { id: 'insights'    as AdminSection, label: 'Insights',       count: null,                      alert: false },
    { id: 'blocked'     as AdminSection, label: 'Blocked',        count: null,                      alert: false },
    { id: 'audit'       as AdminSection, label: 'Audit Log',      count: recentEvents.length,       alert: false },
    { id: 'credentials' as AdminSection, label: 'Credentials',    count: null,                      alert: false },
  ];

  const activeTabId = showDealerDetail ? 'dealers' : section;

  const tabNav = (
    <nav className="flex overflow-x-auto">
      {TABS.map(t => (
        <button
          key={t.id}
          type="button"
          onClick={() => navigate(t.id)}
          className={`px-5 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
            activeTabId === t.id
              ? 'border-orange-500 text-white'
              : 'border-transparent text-silver-400 hover:text-silver-200 hover:border-silver-600'
          }`}
        >
          <span className={t.alert && activeTabId !== t.id ? 'text-status-error-text' : ''}>{t.label}</span>
          {t.count !== null && (
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono ${
              t.alert
                ? 'bg-status-error-bg text-status-error-text'
                : activeTabId === t.id
                ? 'bg-navy-800 text-silver-300'
                : 'bg-navy-800 text-silver-400'
            }`}>
              {t.count}
            </span>
          )}
        </button>
      ))}
    </nav>
  );

  return (
    <AdminShell nav={tabNav} action={adminAction}>
      {showOverview && (
        <AdminOverviewPage
          activeTab={section}
          data={data}
          loading={loading}
          error={error}
          dealersData={dealersData}
          dealersLoading={dealersLoading}
          dealersError={dealersError}
        />
      )}

      {showDealerDetail && adminNav && (
        <CategoryProvider schema={dealerCategorySchema}>
          <AdminViewContext.Provider value={true}>
            {!adminDealerPage && (
              <AdminDealerPage dealerId={adminDealerId} nav={adminNav} activeTab="home" />
            )}
            {adminDealerPage === 'platforms' && !platformSlug && (
              <PlatformsPage dealerId={adminDealerId} nav={adminNav} activeTab="platforms" />
            )}
            {adminDealerPage === 'platforms' && platformSlug && !platformView && (
              <Suspense fallback={LAZY_FALLBACK}>
                <PlatformDetailPage dealerId={adminDealerId} nav={adminNav} activeTab="platforms" platformSlug={platformSlug} />
              </Suspense>
            )}
            {adminDealerPage === 'platforms' && platformSlug && platformView === 'queue' && (
              <PlatformQueuePage dealerId={adminDealerId} nav={adminNav} activeTab="platforms" platformSlug={platformSlug} />
            )}
            {adminDealerPage === 'platforms' && platformSlug && platformView === 'history' && (
              <PlatformHistoryPage dealerId={adminDealerId} nav={adminNav} activeTab="platforms" platformSlug={platformSlug} />
            )}
            {adminDealerPage === 'queue' && (
              <QueuePage dealerId={adminDealerId} nav={adminNav} activeTab="queue" />
            )}
            {adminDealerPage === 'history' && (
              <HistoryPage dealerId={adminDealerId} nav={adminNav} activeTab="history" />
            )}
            {adminDealerPage === 'reports' && (
              <Suspense fallback={LAZY_FALLBACK}>
                <ReportsRouter dealerId={adminDealerId} nav={adminNav} activeTab={activeOperatorTab} reportSlug={reportSlug} reportRange={reportRange} />
              </Suspense>
            )}
            {adminDealerPage === 'inventory' && (
              <InventoryPage dealerId={adminDealerId} nav={adminNav} activeTab="inventory" />
            )}
            {adminDealerPage === 'help' && (
              <KnowledgeBasePage dealerId={adminDealerId} nav={adminNav} activeTab="help" />
            )}
          </AdminViewContext.Provider>
        </CategoryProvider>
      )}

      {section === 'blocked' && (
        <Suspense fallback={LAZY_FALLBACK}>
          <AdminBlockedDealersPage />
        </Suspense>
      )}
      {section === 'credentials' && (
        <Suspense fallback={LAZY_FALLBACK}>
          <AdminCredentialsPage />
        </Suspense>
      )}
    </AdminShell>
  );
}
