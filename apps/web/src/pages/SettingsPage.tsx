import { OperatorPage } from '@/components/operator';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { DealershipProfilePanel } from '@/components/dealers/DealershipProfilePanel.tsx';

type Props = OperatorPageBaseProps;

export default function SettingsPage({ dealerId, nav, activeTab }: Props) {
  return (
    <OperatorPage dealerId={dealerId} nav={nav} activeTab={activeTab} sectionLabel="Settings">
      <div className="max-w-3xl">
        <DealershipProfilePanel dealerId={dealerId} mode="operator" />
      </div>
    </OperatorPage>
  );
}
