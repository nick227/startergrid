import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { QueueListPanel } from '@/components/queue/QueueListPanel.tsx';
import { useOperatorRoute } from '@/hooks/useOperatorRoute.ts';

type Props = OperatorPageBaseProps;

export default function QueuePage({ dealerId, nav, activeTab }: Props) {
  const { route } = useOperatorRoute();
  return (
    <QueueListPanel
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      initialAssetRef={route.assetRef ?? undefined}
    />
  );
}
