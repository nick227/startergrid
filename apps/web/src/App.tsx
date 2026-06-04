import DealerPicker from './pages/DealerPicker.tsx';
import SyncPage from './pages/SyncPage.tsx';
import InventoryPage from './pages/InventoryPage.tsx';
import AccountManagementPage from './pages/AccountManagementPage.tsx';
import { useOperatorRoute } from '@/hooks/useOperatorRoute.ts';

export default function App() {
  const { route, nav, activeTab, selectDealer } = useOperatorRoute();
  const { dealerId, page } = route;

  if (!dealerId || !nav) {
    return <DealerPicker onSelect={selectDealer} />;
  }

  if (page === 'inventory') {
    return <InventoryPage dealerId={dealerId} nav={nav} activeTab={activeTab} />;
  }

  if (page === 'accounts') {
    return <AccountManagementPage dealerId={dealerId} nav={nav} activeTab={activeTab} />;
  }

  return <SyncPage dealerId={dealerId} nav={nav} activeTab={activeTab} />;
}
