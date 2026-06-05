import DealerPicker from './pages/DealerPicker.tsx';
import SyncPage from './pages/SyncPage.tsx';
import InventoryPage from './pages/InventoryPage.tsx';
import AccountManagementPage from './pages/AccountManagementPage.tsx';
import InsightsPage from './pages/InsightsPage.tsx';
import KnowledgeBasePage from './pages/KnowledgeBasePage.tsx';
import { useOperatorRoute } from '@/hooks/useOperatorRoute.ts';
import { DocReaderProvider, DocReaderSheet } from '@/components/docs';

export default function App() {
  const { route, nav, activeTab, selectDealer } = useOperatorRoute();
  const { dealerId, page } = route;

  return (
    <DocReaderProvider>
      {page === 'knowledge' && !dealerId ? (
        <KnowledgeBasePage onBack={() => { window.location.hash = ''; }} />
      ) : !dealerId || !nav ? (
        <DealerPicker onSelect={selectDealer} />
      ) : page === 'knowledge' ? (
        <KnowledgeBasePage dealerId={dealerId} nav={nav} activeTab={activeTab} />
      ) : page === 'inventory' ? (
        <InventoryPage dealerId={dealerId} nav={nav} activeTab={activeTab} />
      ) : page === 'accounts' ? (
        <AccountManagementPage dealerId={dealerId} nav={nav} activeTab={activeTab} />
      ) : page === 'insights' ? (
        <InsightsPage dealerId={dealerId} nav={nav} activeTab={activeTab} />
      ) : (
        <SyncPage dealerId={dealerId} nav={nav} activeTab={activeTab} />
      )}
      <DocReaderSheet />
    </DocReaderProvider>
  );
}
