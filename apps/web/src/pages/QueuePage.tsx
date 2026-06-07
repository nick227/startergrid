import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { QueueListPanel } from '@/components/queue/QueueListPanel.tsx';

type Props = OperatorPageBaseProps;

export default function QueuePage({ dealerId, nav, activeTab }: Props) {
  return <QueueListPanel dealerId={dealerId} activeTab={activeTab} nav={nav} />;
}
