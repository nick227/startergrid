import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { HistoryListPanel } from '@/components/history/HistoryListPanel.tsx';
import { useOperatorRoute } from '@/hooks/useOperatorRoute.ts';

type Props = OperatorPageBaseProps;

export default function HistoryPage({ dealerId, nav, activeTab }: Props) {
  const { route } = useOperatorRoute();
  return (
    <HistoryListPanel
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      initialAssetRef={route.assetRef ?? undefined}
    />
  );
}
