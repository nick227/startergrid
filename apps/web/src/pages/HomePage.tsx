import { OperatorPage } from '@/components/operator';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { DealerHomeDashboard } from '@/components/home/DealerHomeDashboard.tsx';

type Props = OperatorPageBaseProps;

export default function HomePage({ dealerId, nav, activeTab }: Props) {
  return (
    <OperatorPage dealerId={dealerId} nav={nav} activeTab={activeTab} sectionLabel="Home">
      <DealerHomeDashboard dealerId={dealerId} nav={nav} />
    </OperatorPage>
  );
}
