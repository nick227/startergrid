import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { OperatorPage } from '@/components/operator';
import { PageSituation } from '@/components/layout';

type Props = OperatorPageBaseProps;

export default function QueuePage({ dealerId, nav, activeTab }: Props) {
  return (
    <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} hideDealerId>
      <PageSituation
        title="Queue"
        line="Pending posts, updates, and removals across all listing sites."
      />
      <p className="text-sm text-ink-muted">
        Site queue is next — connect to the publish queue API.{' '}
        <button type="button" onClick={nav.goToPlatforms} className="text-orange-600 font-semibold hover:underline">
          Back to Platforms
        </button>
      </p>
    </OperatorPage>
  );
}
