import { OperatorPage } from '@/components/operator';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { DealershipProfilePanel } from '@/components/dealers/DealershipProfilePanel.tsx';
import { PublishingFlowComic } from '@/components/publishing/PublishingFlowComic.tsx';

type Props = OperatorPageBaseProps;

export default function HomePage({ dealerId, nav, activeTab }: Props) {
  return (
    <OperatorPage dealerId={dealerId} nav={nav} activeTab={activeTab} sectionLabel="Home">
      <PublishingFlowComic variant="operator" nav={nav} />
      <DealershipProfilePanel dealerId={dealerId} nav={nav} mode="operator" />
    </OperatorPage>
  );
}
