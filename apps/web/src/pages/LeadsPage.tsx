import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchDealerLeads, type DealerLead } from '@/lib/api/sdk.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { OperatorPage, PageHeader } from '@/components/operator';
import { Banner } from '@/components/ui';

type Props = OperatorPageBaseProps;

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

function platformLabel(slug: string): string {
  if (slug === 'consumer-marketplace') return 'Marketplace';
  return slug;
}

function LeadRow({ lead }: { lead: DealerLead }) {
  const vehicle = lead.vehicle;
  const title = vehicle
    ? `${vehicle.year} ${vehicle.make} ${vehicle.model}`
    : 'Unknown vehicle';

  return (
    <div className="grid grid-cols-[1fr_1fr_auto] gap-x-4 gap-y-0.5 px-4 py-3 border-b border-silver-100 last:border-0 hover:bg-silver-50 transition-colors">
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink-heading truncate">{lead.contactName ?? 'Anonymous'}</p>
        {lead.contactEmail && (
          <p className="text-xs text-ink-muted truncate">{lead.contactEmail}</p>
        )}
        {lead.contactPhone && (
          <p className="text-xs text-ink-muted">{lead.contactPhone}</p>
        )}
        {lead.message && (
          <p className="text-xs text-ink-body mt-1 line-clamp-2">{lead.message}</p>
        )}
      </div>

      <div className="min-w-0">
        <p className="text-sm text-ink-body font-medium truncate">{title}</p>
        {vehicle?.stockNumber && (
          <p className="text-xs text-ink-muted">#{vehicle.stockNumber}</p>
        )}
        {vehicle?.soldAt && (
          <span className="mt-1 inline-block text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-green-100 text-green-800">
            Sold
          </span>
        )}
      </div>

      <div className="text-right shrink-0">
        <span className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-navy-100 text-navy-700">
          {platformLabel(lead.platformSlug)}
        </span>
        <p className="text-xs text-ink-muted mt-1">{relativeTime(lead.createdAt)}</p>
      </div>
    </div>
  );
}

export default function LeadsPage({ dealerId, nav, activeTab }: Props) {
  const { data, loading, error, reload } = useAsyncQuery(
    () => fetchDealerLeads(dealerId),
    [dealerId],
  );

  const leads = data?.leads ?? [];

  return (
    <OperatorPage
      dealerId={dealerId}
      activeTab={activeTab}
      nav={nav}
      onRefresh={reload}
      refreshing={loading}
    >
      <div className="space-y-5">
        <PageHeader
          title="Leads"
          subtitle="Buyer inquiries received from the marketplace and other channels."
        />

        {error && (
          <Banner variant="error" action={<button type="button" onClick={reload} className="text-xs underline">Retry</button>}>
            {error}
          </Banner>
        )}

        <div className="bg-white rounded-xl border border-silver-200 shadow-sm overflow-hidden">
          {loading && leads.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-muted">Loading leads…</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-ink-heading">No leads yet</p>
              <p className="text-xs text-ink-muted mt-1">
                When a buyer clicks "Request Info" on the marketplace, it will appear here.
              </p>
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_1fr_auto] gap-x-4 px-4 py-2 bg-silver-50 border-b border-silver-200 text-[10px] font-bold uppercase tracking-wide text-ink-faint">
                <span>Buyer</span>
                <span>Vehicle</span>
                <span className="text-right">Source / Time</span>
              </div>
              {leads.map(lead => <LeadRow key={lead.id} lead={lead} />)}
            </div>
          )}
        </div>
      </div>
    </OperatorPage>
  );
}
