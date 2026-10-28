import AccountSetupPage from './pages/AccountSetupPage.tsx';
import InternalWorkspace from './pages/InternalWorkspace.tsx';
import { lazy, Suspense, useEffect } from 'react';
import DealerPicker from './pages/DealerPicker.tsx';
import LoginPage from './pages/LoginPage.tsx';
import PlatformsPage from './pages/PlatformsPage.tsx';
import SettingsPage from './pages/SettingsPage.tsx';
import QueuePage from './pages/QueuePage.tsx';
import HistoryPage from './pages/HistoryPage.tsx';
import PlatformQueuePage from './pages/PlatformQueuePage.tsx';
import PlatformHistoryPage from './pages/PlatformHistoryPage.tsx';
import InventoryPage from './pages/InventoryPage.tsx';
import KnowledgeBasePage from './pages/KnowledgeBasePage.tsx';
import ActivityPage from './pages/ActivityPage.tsx';
import TeamPage from './pages/TeamPage.tsx';
import RegisterPage from './pages/RegisterPage.tsx';
import { OperatorPage } from '@/components/operator';

const PlatformDetailPage = lazy(() => import('./pages/PlatformDetailPage.tsx'));
const ReportsRouter = lazy(() => import('./pages/ReportsRouter.tsx'));
const AdminApp = lazy(() => import('./pages/AdminApp.tsx'));
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen.tsx';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { useOperatorRoute } from '@/hooks/useOperatorRoute.ts';
import { useDealerCategorySchema } from '@/hooks/useDealerCategorySchema.ts';
import { CategoryProvider } from '@/contexts/CategoryContext.tsx';
import { DocReaderProvider } from '@/components/docs';
import { canAccessDealer } from '@/lib/operatorAccess.ts';
import type { OperatorNavHandlers, OperatorTab } from '@/lib/operatorNav.ts';

function OperatorRouteFallback({
  dealerId,
  nav,
  activeTab,
}: {
  dealerId: string;
  nav: OperatorNavHandlers;
  activeTab: OperatorTab;
}) {
  return (
    <OperatorPage dealerId={dealerId} nav={nav} activeTab={activeTab}>
      <div className="surface-card-operator p-6">
        <div className="h-4 w-40 animate-pulse rounded bg-silver-200" />
        <div className="mt-5 space-y-3">
          <div className="h-3 w-full animate-pulse rounded bg-silver-100" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-silver-100" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-silver-100" />
        </div>
      </div>
    </OperatorPage>
  );
}

function OperatorApp() {
  const { user, authReady } = useAuth();
  const { route, nav, activeTab, selectDealer } = useOperatorRoute();
  const { dealerId, page, platformSlug, platformView, reportSlug, reportRange, adminDealerId, adminDealerPage, adminPlatformSlug } = route;
  const categoryState = useDealerCategorySchema(dealerId ?? adminDealerId ?? null);
  const categorySchema = categoryState.schema;

  const helpStandalone = (page === 'help' || page === 'knowledge') && !dealerId;
  const signupStandalone = page === 'signup' && !dealerId;
  const internalStaff = user?.role === 'INTERNAL_SUPPORT' || user?.role === 'OPERATOR';
  const inviteToken = /^#\/invite\/([^/?]+)/.exec(window.location.hash)?.[1];
  const superAdminHome = !dealerId && user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (window.location.hash.startsWith('#/invite/') || !user || !dealerId || canAccessDealer(user, dealerId)) return;
    window.location.hash = '#/';
  }, [user, dealerId]);

  // Site administration is SUPER_ADMIN only — redirect anyone else away from /admin.
  useEffect(() => {
    if (!user || page !== 'admin' || user.role === 'SUPER_ADMIN' || internalStaff) return;
    window.location.hash = '#/';
  }, [user, page, internalStaff]);

  if (helpStandalone) return <KnowledgeBasePage />;
  if (!authReady) return <AuthLoadingScreen />;
  if (inviteToken) return <AccountSetupPage key={inviteToken} token={inviteToken} />;
  if (user?.mustChangePassword) return <AccountSetupPage />;
  if (signupStandalone && !user) return <RegisterPage />;
  if (!user) return <LoginPage />;
  if ((dealerId || adminDealerId) && (categoryState.pending || !categorySchema)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page p-6">
        <p role="status" className="text-sm text-ink-muted">
          {categoryState.pending ? 'Loading business…' : 'This business could not be loaded.'}
        </p>
      </div>
    );
  }
  if (internalStaff && (!dealerId || page === 'admin')) {
    const workspace = <InternalWorkspace dealerId={adminDealerId} dealerPage={adminDealerPage} />;
    return categorySchema ? <CategoryProvider schema={categorySchema}>{workspace}</CategoryProvider> : workspace;
  }

  if (!categorySchema) {
    return (
      <>
        {superAdminHome ? (
          <Suspense fallback={null}>
            <AdminApp
              adminDealerId={adminDealerId}
              platformSlug={platformSlug}
              adminDealerPage={adminDealerPage}
              platformView={platformView}
              reportSlug={reportSlug}
              reportRange={reportRange}
              adminPlatformSlug={adminPlatformSlug}
            />
          </Suspense>
        ) : !dealerId || !nav ? (
          <DealerPicker onSelect={selectDealer} />
        ) : (
          <DealerPicker onSelect={selectDealer} forbiddenDealerId={dealerId} />
        )}
      </>
    );
  }

  return (
    <CategoryProvider schema={categorySchema}>
      {superAdminHome ? (
        <Suspense fallback={null}>
          <AdminApp
            adminDealerId={adminDealerId}
            platformSlug={platformSlug}
            adminDealerPage={adminDealerPage}
            platformView={platformView}
            reportSlug={reportSlug}
            reportRange={reportRange}
            adminPlatformSlug={adminPlatformSlug}
          />
        </Suspense>
      ) : !dealerId || !nav ? (
        <DealerPicker onSelect={selectDealer} />
      ) : !canAccessDealer(user, dealerId) ? (
        <DealerPicker onSelect={selectDealer} forbiddenDealerId={dealerId} />
      ) : platformSlug && !platformView ? (
        <Suspense fallback={<OperatorRouteFallback dealerId={dealerId} nav={nav} activeTab={activeTab} />}>
          <PlatformDetailPage dealerId={dealerId} nav={nav} activeTab={activeTab} platformSlug={platformSlug} />
        </Suspense>
      ) : platformSlug && platformView === 'queue' ? (
        <PlatformQueuePage dealerId={dealerId} nav={nav} activeTab={activeTab} platformSlug={platformSlug} />
      ) : platformSlug && platformView === 'history' ? (
        <PlatformHistoryPage dealerId={dealerId} nav={nav} activeTab={activeTab} platformSlug={platformSlug} />
      ) : page === 'help' || page === 'knowledge' ? (
        <KnowledgeBasePage dealerId={dealerId} nav={nav} activeTab={activeTab} />
      ) : page === 'queue' ? (
        <QueuePage dealerId={dealerId} nav={nav} activeTab={activeTab} />
      ) : page === 'history' ? (
        <HistoryPage dealerId={dealerId} nav={nav} activeTab={activeTab} />
      ) : page === 'reports' ? (
        <Suspense fallback={<OperatorRouteFallback dealerId={dealerId} nav={nav} activeTab={activeTab} />}>
          <ReportsRouter dealerId={dealerId} nav={nav} activeTab={activeTab} reportSlug={reportSlug} reportRange={reportRange} />
        </Suspense>
      ) : page === 'inventory' ? (
        <InventoryPage dealerId={dealerId} nav={nav} activeTab={activeTab} />
      ) : page === 'team' ? (
        <TeamPage dealerId={dealerId} nav={nav} activeTab={activeTab} view={route.workspaceView} />
      ) : page === 'leads' || page === 'activity' ? (
        <ActivityPage dealerId={dealerId} nav={nav} activeTab={activeTab} view={page === 'leads' ? 'leads' : route.workspaceView} />
      ) : page === 'settings' ? (
        <SettingsPage dealerId={dealerId} nav={nav} activeTab={activeTab} view={route.workspaceView} />
      ) : page === 'platforms' ? (
        <PlatformsPage
          dealerId={dealerId}
          nav={nav}
          activeTab={activeTab}
        />
      ) : (
        <ActivityPage
          dealerId={dealerId}
          nav={nav}
          activeTab={activeTab}
        />
      )}
    </CategoryProvider>
  );
}

export default function App() {
  return (
    <DocReaderProvider>
      <OperatorApp />
    </DocReaderProvider>
  );
}
