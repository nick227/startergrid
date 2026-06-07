import { useState, useEffect } from 'react';
import { parseRoute } from './lib/routes.ts';
import { resetPageMeta } from './lib/pageMeta.ts';
import { AuthProvider } from './contexts/AuthContext.tsx';
import { LoginModal } from './components/ui/LoginModal.tsx';
import VehicleListPage   from './pages/VehicleListPage.tsx';
import VehicleDetailPage from './pages/VehicleDetailPage.tsx';
import DealerDetailPage  from './pages/DealerDetailPage.tsx';
import FavoritesPage     from './pages/FavoritesPage.tsx';

export default function App() {
  const [route, setRoute] = useState(parseRoute);

  useEffect(() => {
    resetPageMeta();
    const handler = () => setRoute(parseRoute());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  return (
    <AuthProvider>
      {route.page === 'listing'  && <VehicleDetailPage listingId={route.listingId} />}
      {route.page === 'dealer'   && <DealerDetailPage  dealerId={route.dealerId} />}
      {route.page === 'favorites' && <FavoritesPage />}
      {route.page === 'list'     && <VehicleListPage initialQuery={route.query} />}
      <LoginModal />
    </AuthProvider>
  );
}
