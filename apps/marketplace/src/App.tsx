import { useState, useEffect } from 'react';
import { parseRoute } from './lib/routes.ts';
import VehicleListPage   from './pages/VehicleListPage.tsx';
import VehicleDetailPage from './pages/VehicleDetailPage.tsx';
import DealerDetailPage  from './pages/DealerDetailPage.tsx';

export default function App() {
  const [route, setRoute] = useState(parseRoute);

  useEffect(() => {
    const handler = () => setRoute(parseRoute());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  if (route.page === 'listing') return <VehicleDetailPage listingId={route.listingId} />;
  if (route.page === 'dealer')  return <DealerDetailPage  dealerId={route.dealerId} />;
  return <VehicleListPage initialQuery={route.query} />;
}
