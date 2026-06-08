import { lazy, Suspense, useEffect, useState } from 'react';
import { categorySlugToId, isConsumerMarketplaceLive, resolveCategorySchema } from '@auto-dealer/category-schemas';
import { parseRoute } from './lib/routes.ts';
import { resetPageMeta } from './lib/pageMeta.ts';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { CategoryProvider } from './contexts/CategoryContext.tsx';
import { CategoryFavoritesSync } from './contexts/CategoryFavoritesSync.tsx';
import { LoginModal } from './components/ui/LoginModal.tsx';
import SitesIndexPage from './pages/SitesIndexPage.tsx';
const VehicleListPage = lazy(() => import('./pages/VehicleListPage.tsx'));
import VehicleDetailPage from './pages/VehicleDetailPage.tsx';
import SellerDetailPage from './pages/SellerDetailPage.tsx';
import FavoritesPage from './pages/FavoritesPage.tsx';
import { PageShell } from './components/layout/PageShell.tsx';
import { NotFoundState } from './components/ui/NotFoundState.tsx';
import { sitesHref } from './lib/routes.ts';

export default function App() {
  const [route, setRoute] = useState(parseRoute);

  useEffect(() => {
    resetPageMeta();
    const handler = () => setRoute(parseRoute());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  useEffect(() => {
    if (route.page !== 'redirect') return;
    window.location.replace(route.href);
  }, [route]);

  if (route.page === 'redirect') return null;

  const shell = (
    <>
      <LoginModal />
    </>
  );

  if (route.page === 'sites') {
    return (
      <AuthProvider>
        <SitesIndexPage />
        {shell}
      </AuthProvider>
    );
  }

  const categoryId = categorySlugToId(route.slug);
  if (!categoryId) {
    return (
      <AuthProvider>
        <PageShell showCategoryNav={false}>
          <NotFoundState
            title="Marketplace not found"
            description="That category site does not exist."
            backHref={sitesHref()}
            backLabel="All marketplaces"
          />
        </PageShell>
        {shell}
      </AuthProvider>
    );
  }

  const categorySchema = resolveCategorySchema(categoryId);
  if (!isConsumerMarketplaceLive(categorySchema)) {
    return (
      <AuthProvider>
        <PageShell showCategoryNav={false}>
          <NotFoundState
            title="Marketplace unavailable"
            description={`The ${categorySchema.label.toLowerCase()} marketplace is not open to consumers yet.`}
            backHref={sitesHref()}
            backLabel="All marketplaces"
          />
        </PageShell>
        {shell}
      </AuthProvider>
    );
  }

  return (
    <AuthProvider>
      <CategoryProvider categoryId={categoryId} slug={route.slug}>
        <CategoryFavoritesSync />
        {route.page === 'listing' && <VehicleDetailPage listingId={route.listingId} />}
        {route.page === 'seller' && <SellerDetailPage sellerId={route.sellerId} />}
        {route.page === 'favorites' && <FavoritesPage />}
        {route.page === 'list' && (
          <Suspense fallback={<PageShell><p className="p-6 text-sm text-ink-muted">Loading inventory…</p></PageShell>}>
            <VehicleListPage initialQuery={route.query} />
          </Suspense>
        )}
      </CategoryProvider>
      {shell}
    </AuthProvider>
  );
}
