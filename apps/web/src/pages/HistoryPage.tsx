import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { HistoryListPanel } from '@/components/history/HistoryListPanel.tsx';

type Props = OperatorPageBaseProps;

export default function HistoryPage({ dealerId, nav, activeTab }: Props) {
  return <HistoryListPanel dealerId={dealerId} activeTab={activeTab} nav={nav} />;
}
