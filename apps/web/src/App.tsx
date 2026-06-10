import { lazy, Suspense, useEffect } from 'react';
import DealerPicker from './pages/DealerPicker.tsx';
import LoginPage from './pages/LoginPage.tsx';
import PlatformsPage from './pages/PlatformsPage.tsx';
import QueuePage from './pages/QueuePage.tsx';
import HistoryPage from './pages/HistoryPage.tsx';
import PlatformQueuePage from './pages/PlatformQueuePage.tsx';
import PlatformHistoryPage from './pages/PlatformHistoryPage.tsx';
import InventoryPage from './pages/InventoryPage.tsx';
import KnowledgeBasePage from './pages/KnowledgeBasePage.tsx';

const ReportsRouter = lazy(() => import('./pages/ReportsRouter.tsx'));
const AdminCredentialsPage = lazy(() => import('./pages/AdminCredentialsPage.tsx'));
const AdminOverviewPage = lazy(() => import('./pages/AdminOverviewPage.tsx'));
import { AuthLoadingScreen } from '@/components/auth/AuthLoadingScreen.tsx';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { useOperatorRoute } from '@/hooks/useOperatorRoute.ts';
import { useDealerCategorySchema } from '@/hooks/useDealerCategorySchema.ts';
import { CategoryProvider } from '@/contexts/CategoryContext.tsx';
import { DocReaderProvider, DocReaderSheet } from '@/components/docs';
import { canAccessDealer } from '@/lib/operatorAccess.ts';

function OperatorApp() {
  const { user, authReady } = useAuth();
  const { route, nav, activeTab, selectDealer } = useOperatorRoute();
  const { dealerId, page, platformSlug, platformView, reportSlug, reportRange } = route;
  const categorySchema = useDealerCategorySchema(dealerId ?? null);

  const helpStandalone = (page === 'help' || page === 'knowledge') && !dealerId;
  const adminStandalone = page === 'admin' && !dealerId;

  useEffect(() => {
    if (!user || !dealerId || canAccessDealer(user, dealerId)) return;
    window.location.hash = '#/';
  }, [user, dealerId]);

  // Site administration is SUPER_ADMIN only.
  useEffect(() => {
    if (!user || page !== 'admin' || user.role === 'SUPER_ADMIN') return;
    window.location.hash = '#/';
  }, [user, page]);

  if (!authReady) return <AuthLoadingScreen />;
  if (!user) return <LoginPage />;

  return (
    <CategoryProvider schema={categorySchema}>
      {adminStandalone && user.role === 'SUPER_ADMIN' ? (
        <Suspense fallback={null}>
          {platformSlug === 'platform-credentials' ? (
            <AdminCredentialsPage />
          ) : (
            <AdminOverviewPage />
          )}
        </Suspense>
      ) : helpStandalone ? (
        <KnowledgeBasePage onBack={() => { window.location.hash = '#/help'; }} />
      ) : !dealerId || !nav ? (
        <DealerPicker onSelect={selectDealer} />
      ) : !canAccessDealer(user, dealerId) ? (
        <DealerPicker onSelect={selectDealer} forbiddenDealerId={dealerId} />
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
        <Suspense fallback={null}>
          <ReportsRouter dealerId={dealerId} nav={nav} activeTab={activeTab} reportSlug={reportSlug} reportRange={reportRange} />
        </Suspense>
      ) : page === 'inventory' ? (
        <InventoryPage dealerId={dealerId} nav={nav} activeTab={activeTab} />
      ) : (
        <PlatformsPage
          dealerId={dealerId}
          nav={nav}
          activeTab={activeTab}
          initialPlatformSlug={platformSlug}
        />
      )}
      <DocReaderSheet />
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
