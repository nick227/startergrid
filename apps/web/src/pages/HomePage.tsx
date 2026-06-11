import { OperatorPage } from '@/components/operator';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { DealerDashboard } from '@/components/dashboard';

type Props = OperatorPageBaseProps;

export default function HomePage({ dealerId, nav, activeTab }: Props) {
  return (
    <OperatorPage dealerId={dealerId} nav={nav} activeTab={activeTab}>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-ink-heading">Dashboard</h1>
        <p className="text-sm text-ink-muted mt-1">Overview of your sales, platforms, and inventory performance.</p>
      </div>
      <DealerDashboard dealerId={dealerId} nav={nav} />
    </OperatorPage>
  );
}
