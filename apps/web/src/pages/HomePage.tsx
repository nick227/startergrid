import { OperatorPage } from '@/components/operator';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { ActivityIssuesSurface } from '@/features/operations/ActivityIssuesSurface.tsx';
import { PublishingFlowComic } from '@/components/publishing/PublishingFlowComic.tsx';
import { GettingStartedChecklist } from '@/components/home/GettingStartedChecklist.tsx';

type Props = OperatorPageBaseProps;

export default function HomePage({ dealerId, nav, activeTab }: Props) {
  return (
    <OperatorPage dealerId={dealerId} nav={nav} activeTab={activeTab} sectionLabel="Home">
      <GettingStartedChecklist dealerId={dealerId} nav={nav} />
      <PublishingFlowComic variant="operator" nav={nav} />
      <div className="mt-8">
        <ActivityIssuesSurface scope={{ type: 'dealer', dealerId }} hideAuditLog />
      </div>
    </OperatorPage>
  );
}
