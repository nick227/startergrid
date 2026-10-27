import { useState } from 'react';
import { OperatorPage } from '@/components/operator';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { DealershipProfilePanel } from '@/components/dealers/DealershipProfilePanel.tsx';
import { PeoplePanel } from '@/components/people/PeoplePanel.tsx';
import { PagePrimaryState } from '@/components/guidance/PagePrimaryState.tsx';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchDealershipProfile } from '@/lib/api/sdk.ts';

type Props = OperatorPageBaseProps;

const isInternalStaff = (role?: string) => role === 'SUPER_ADMIN' || role === 'INTERNAL_SUPPORT' || role === 'OPERATOR';
type SettingsSection = 'profile' | 'team';

export default function SettingsPage({ dealerId, nav, activeTab }: Props) {
  const [section, setSection] = useState<SettingsSection>('profile');
  const { user } = useAuth();
  const { data: profile } = useAsyncQuery(() => fetchDealershipProfile(dealerId), [dealerId]);
  const dealershipName = profile?.dbaName || profile?.legalName || 'this dealership';
  const criticalWarning = profile?.publishingWarnings.find(w => w.severity === 'critical');

  const tab = (id: SettingsSection, label: string) => (
    <button
      type="button"
      onClick={() => setSection(id)}
      aria-current={section === id ? 'page' : undefined}
      className={`pb-3 text-sm font-semibold border-b-2 transition-colors ${
        section === id ? 'border-navy-900 text-navy-900' : 'border-transparent text-ink-muted hover:text-ink-body'
      }`}
    >
      {label}
    </button>
  );

  return (
    <OperatorPage dealerId={dealerId} nav={nav} activeTab={activeTab} sectionLabel="Settings">
      <div className="max-w-4xl space-y-6">
        <div className="border-b border-silver-200">
          <nav className="flex gap-4">
            {tab('profile', 'Dealership')}
            {tab('team', 'Team')}
          </nav>
        </div>

        {section === 'profile' && (
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

        {section === 'team' && (
          <PeoplePanel
            dealerId={dealerId}
            dealershipName={dealershipName}
            viewer={{
              kind: isInternalStaff(user?.role) ? 'internal' : 'dealer',
              userId: user?.id,
              isSiteAdmin: user?.role === 'SUPER_ADMIN',
            }}
          />
        )}
      </div>
    </OperatorPage>
  );
}
