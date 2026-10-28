import { OperatorPage } from '@/components/operator';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { DealershipProfilePanel } from '@/components/dealers/DealershipProfilePanel.tsx';
import { PagePrimaryState } from '@/components/guidance/PagePrimaryState.tsx';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchDealershipProfile } from '@/lib/api/sdk.ts';

type Props = OperatorPageBaseProps;


export default function SettingsPage({ dealerId, nav, activeTab }: Props) {
  const { data: profile } = useAsyncQuery(() => fetchDealershipProfile(dealerId), [dealerId]);
  const criticalWarning = profile?.publishingWarnings.find(w => w.severity === 'critical');

  return (
    <OperatorPage dealerId={dealerId} nav={nav} activeTab={activeTab} sectionLabel="Settings">
      <div className="max-w-4xl space-y-6">
        {(
          <div className="max-w-3xl space-y-5">
            <PagePrimaryState
              kind={criticalWarning ? 'attention' : 'running'}
              title={criticalWarning ? `Add ${criticalWarning.label}` : 'Dealership details'}
              why={
                criticalWarning
                  ? criticalWarning.message
                  : 'Name, address, and contact that buyers and destinations use. Inquiries go to the primary email unless you add another method below.'
              }
              ownerKind={criticalWarning ? 'YOU' : undefined}
            />
            <DealershipProfilePanel dealerId={dealerId} mode="operator" />
          </div>
        )}

      </div>
    </OperatorPage>
  );
}
