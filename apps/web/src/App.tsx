import DealerPicker from './pages/DealerPicker.tsx';
import PlatformsPage from './pages/PlatformsPage.tsx';
import QueuePage from './pages/QueuePage.tsx';
import HistoryPage from './pages/HistoryPage.tsx';
import PlatformQueuePage from './pages/PlatformQueuePage.tsx';
import PlatformHistoryPage from './pages/PlatformHistoryPage.tsx';
import InventoryPage from './pages/InventoryPage.tsx';
import InsightsPage from './pages/InsightsPage.tsx';
import KnowledgeBasePage from './pages/KnowledgeBasePage.tsx';
import { useOperatorRoute } from '@/hooks/useOperatorRoute.ts';
import { useDealerCategorySchema } from '@/hooks/useDealerCategorySchema.ts';
import { CategoryProvider } from '@/contexts/CategoryContext.tsx';
import { DocReaderProvider, DocReaderSheet } from '@/components/docs';

export default function App() {
  const { route, nav, activeTab, selectDealer } = useOperatorRoute();
  const { dealerId, page, platformSlug, platformView } = route;
  const categorySchema = useDealerCategorySchema(dealerId ?? null);

  const helpStandalone = (page === 'help' || page === 'knowledge') && !dealerId;

  return (
    <DocReaderProvider>
    <CategoryProvider schema={categorySchema}>
      {helpStandalone ? (
        <KnowledgeBasePage onBack={() => { window.location.hash = '#/help'; }} />
      ) : !dealerId || !nav ? (
        <DealerPicker onSelect={selectDealer} />
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
        <InsightsPage dealerId={dealerId} nav={nav} activeTab={activeTab} />
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
    </DocReaderProvider>
  );
}
