import { OperatorPage, PageHeader } from '@/components/operator';
import { WorkspaceTabs } from '@/components/operator/WorkspaceTabs.tsx';
import { DealershipProfilePanel } from '@/components/dealers/DealershipProfilePanel.tsx';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { workspaceRequest } from '@/lib/api/workspaces.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { useCategorySchema } from '@/contexts/CategoryContext.tsx';
import { inventoryWorkspaceLabel, usesVehicleIdentifier } from '@/lib/categoryPresentation.ts';

const tabs = [
  { id: 'identity', label: 'Identity' },
  { id: 'email', label: 'Email & Contacts' },
  { id: 'preferences', label: 'Preferences' },
  { id: 'integrations', label: 'Integrations' },
];

type InboundStatus = {
  address: string;
  mailboxConfigured: boolean;
  lastReceivedAt: string | null;
  lastStatus: string | null;
  lastFailureReason: string | null;
  recentProblemCount: number;
};

export default function SettingsPage(props: OperatorPageBaseProps & { view?: string }) {
  const view = tabs.some(tab => tab.id === props.view) ? props.view! : 'identity';
  const viewLabel = tabs.find(tab => tab.id === view)?.label ?? 'Company';
  return (
    <OperatorPage dealerId={props.dealerId} nav={props.nav} activeTab="settings" sectionLabel={view === 'identity' ? 'Company' : `Company · ${viewLabel}`}>
      <PageHeader title="Company" />
      <WorkspaceTabs dealerId={props.dealerId} workspace="company" active={view} tabs={tabs} />
      {view === 'identity' && <DealershipProfilePanel dealerId={props.dealerId} section="identity" />}
      {view === 'email' && (
        <div className="space-y-5">
          <DealershipProfilePanel dealerId={props.dealerId} section="email" />
          <InboundEmailCard dealerId={props.dealerId} />
        </div>
      )}
      {view === 'preferences' && <DealershipProfilePanel dealerId={props.dealerId} section="preferences" />}
      {view === 'integrations' && <CompanyIntegrations nav={props.nav} />}
    </OperatorPage>
  );
}

function InboundEmailCard({ dealerId }: { dealerId: string }) {
  const automotiveLeads = usesVehicleIdentifier(useCategorySchema());
  const query = useAsyncQuery(() => workspaceRequest<InboundStatus>(dealerId, 'inbound-email'), [dealerId]);
  const status = query.data;
  return (
    <section className="surface-card-operator p-5 space-y-3" aria-label="Marketplace lead email">
      <h2 className="text-lg font-semibold text-ink-heading">Marketplace lead email</h2>
      <p className="text-sm text-ink-muted">{automotiveLeads ? 'Forward Cars.com, Autotrader, and CarGurus inquiries to this address. The token is private to this dealership.' : 'Forward marketplace inquiries to this address. The token is private to this business. Automotive classifieds are not part of this category.'}</p>
      {query.error && <p role="alert" className="text-sm text-red-700">{query.error}</p>}
      {status && (
        <>
          <p className="font-mono text-sm break-all">{status.address}</p>
          <button type="button" className="btn-secondary-operator" onClick={() => void navigator.clipboard.writeText(status.address)}>Copy address</button>
          <p className="text-sm text-ink-muted">
            {status.mailboxConfigured ? 'The intake mailbox is configured.' : `The intake mailbox is not connected yet. The address is reserved for this ${automotiveLeads ? 'dealership' : 'business'}.`}
            {status.lastReceivedAt ? ` Last message ${new Date(status.lastReceivedAt).toLocaleString()}.` : ' No message has arrived yet.'}
            {status.recentProblemCount > 0 ? ` ${status.recentProblemCount} messages in the last 30 days need review.` : ''}
          </p>
          <p className="text-sm text-ink-muted">{automotiveLeads ? "A lead forwarded through the dealership's own mailbox is still accepted. It stays marked as dealership-reported until that forwarding path is confirmed, so it is not counted as a verified marketplace." : 'A lead forwarded through this business mailbox is still accepted. It stays marked as business-reported until that forwarding path is confirmed, so it is not counted as a verified marketplace.'}</p>
        </>
      )}
    </section>
  );
}

function CompanyIntegrations({ nav }: { nav: OperatorPageBaseProps['nav'] }) {
  const workspace = inventoryWorkspaceLabel(useCategorySchema());
  return (
    <section className="space-y-4" aria-label="Company integrations">
      <p className="text-sm text-ink-muted max-w-2xl">Company holds shared business configuration. Day-to-day platform connections stay in Channels, and inventory import sources stay in {workspace}.</p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="btn-secondary-operator" onClick={() => nav.goToPlatforms()}>Open Channels</button>
        <button type="button" className="btn-secondary-operator" onClick={() => nav.goToInventory()}>Open {workspace}</button>
      </div>
    </section>
  );
}
