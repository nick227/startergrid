import { OperatorPage } from '@/components/operator';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { DealershipProfilePanel } from '@/components/dealers/DealershipProfilePanel.tsx';

type Props = OperatorPageBaseProps;

export default function HomePage({ dealerId, nav, activeTab }: Props) {
  return (
    <OperatorPage dealerId={dealerId} nav={nav} activeTab={activeTab} sectionLabel="Profile">
      <DealershipProfilePanel dealerId={dealerId} nav={nav} mode="operator" />
    </OperatorPage>
  );
}
