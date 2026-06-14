import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchDealerLeads, fetchBuyerOutreach, type DealerLead, type BuyerOutreachRecord } from '@/lib/api/sdk.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { OperatorPage, PageHeader } from '@/components/operator';
import { NotificationChannelsPanel } from '@/components/operator/NotificationChannelsPanel.tsx';
import { InfoButton } from '@/components/docs/index.ts';
import { Banner, SearchField, Select } from '@/components/ui';

type Props = OperatorPageBaseProps;

type LeadStatus = 'new' | 'contacted' | 'appointment' | 'closed' | 'lost';
type StatusFilter = 'all' | LeadStatus;
type SortKey = 'newest' | 'oldest' | 'vehicle' | 'buyer' | 'source' | 'status';

const STATUS_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'closed', label: 'Closed' },
  { value: 'lost', label: 'Lost' },
];

const SORT_OPTIONS: Array<{ value: SortKey; label: string }> = [
  { value: 'newest', label: 'Newest' },
  { value: 'oldest', label: 'Oldest' },
  { value: 'vehicle', label: 'Vehicle' },
  { value: 'buyer', label: 'Buyer' },
  { value: 'source', label: 'Source' },
  { value: 'status', label: 'Status' },
];

const STATUS_STYLES: Record<LeadStatus, string> = {
  new: 'border-blue-200 bg-blue-50 text-blue-700',
  contacted: 'border-amber-200 bg-amber-50 text-amber-700',
  appointment: 'border-purple-200 bg-purple-50 text-purple-700',
  closed: 'border-green-200 bg-green-50 text-green-700',
  lost: 'border-silver-300 bg-silver-100 text-ink-muted',
};

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
  return slug
    .split('-')
    .filter(Boolean)
    .map(part => part[0]?.toUpperCase() + part.slice(1))
    .join(' ');
}

function vehicleTitle(lead: DealerLead): string {
  const vehicle = lead.vehicle;
  if (!vehicle) return 'Unknown vehicle';
  return `${vehicle.year} ${vehicle.make} ${vehicle.model}`.replace(/\s+/g, ' ').trim();
}

function leadSearchText(lead: DealerLead): string {
  return [
    vehicleTitle(lead),
    lead.vehicle?.stockNumber,
    lead.contactName,
    lead.contactEmail,
    lead.contactPhone,
    lead.message,
    platformLabel(lead.platformSlug),
  ].filter(Boolean).join(' ').toLowerCase();
}

function storageKey(dealerId: string): string {
  return `dealerLeadStatuses:${dealerId}`;
}

function readSavedStatuses(dealerId: string): Record<string, LeadStatus> {
  try {
    const raw = localStorage.getItem(storageKey(dealerId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, LeadStatus>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeSavedStatuses(dealerId: string, statuses: Record<string, LeadStatus>) {
  localStorage.setItem(storageKey(dealerId), JSON.stringify(statuses));
}

function LeadThumbnail({ lead, title }: { lead: DealerLead; title: string }) {
  const thumbnail = lead.vehicle?.thumbnailUrl;
  if (thumbnail) {
    return (
      <img
        src={thumbnail}
        alt={title}
        className="h-14 w-20 rounded-md border border-silver-200 object-cover bg-silver-100 shrink-0"
      />
    );
  }

  return (
    <div className="h-14 w-20 rounded-md border border-silver-200 bg-silver-100 flex items-center justify-center shrink-0">
      <span className="text-[10px] font-bold uppercase tracking-wide text-ink-faint">Photo</span>
    </div>
  );
}

const CHANNEL_LABELS: Record<string, string> = { email: 'Email', sms: 'SMS' };

function OutreachRow({ row }: { row: BuyerOutreachRecord }) {
  const vehicleTitle = row.vehicle
    ? `${row.vehicle.year} ${row.vehicle.make} ${row.vehicle.model}`
    : 'Unknown vehicle';

  return (
    <div className="grid gap-4 border-b border-silver-100 px-4 py-3 last:border-0 hover:bg-silver-50/70 transition-colors lg:grid-cols-[minmax(14rem,1.2fr)_minmax(12rem,1fr)_6rem_6rem_8rem] lg:items-center">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink-heading">{vehicleTitle}</p>
        {row.vehicle?.stockNumber && (
          <span className="text-[11px] font-mono text-ink-muted">#{row.vehicle.stockNumber}</span>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm text-ink-heading">{row.contactName ?? 'Anonymous'}</p>
        <p className="truncate text-xs text-ink-muted">{row.recipientAddress}</p>
      </div>
      <div>
        <span className="inline-flex rounded border border-navy-100 bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-navy-700">
          {CHANNEL_LABELS[row.channel] ?? row.channel}
        </span>
      </div>
      <div>
        {row.status === 'SENT' ? (
          <span className="inline-flex rounded border border-green-200 bg-green-50 px-2 py-0.5 text-[11px] font-semibold text-green-700">Sent</span>
        ) : (
          <span className="inline-flex rounded border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-semibold text-red-700" title={row.errorMessage ?? undefined}>Failed</span>
        )}
      </div>
      <div className="text-xs text-ink-muted lg:text-right">
        <p className="font-semibold text-ink-body">{relativeTime(row.createdAt)}</p>
        <p>{new Date(row.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

function CommunicationsPanel({ dealerId }: { dealerId: string }) {
  const { data, loading, error, reload } = useAsyncQuery(
    () => fetchBuyerOutreach(dealerId),
    [dealerId],
  );
  const rows = data?.outreach ?? [];

  return (
    <div className="rounded-xl border border-silver-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-silver-200 px-4 py-3">
        <div>
          <p className="text-sm font-semibold text-ink-heading">Auto-response history</p>
          <p className="text-xs text-ink-muted">Messages sent to buyers by the auto-response system</p>
        </div>
        <button type="button" onClick={reload} className="text-xs text-ink-muted underline underline-offset-2 hover:text-ink">Refresh</button>
      </div>

      {error && (
        <div className="p-4 text-xs text-red-600">{error}</div>
      )}

      {loading && rows.length === 0 ? (
        <div className="p-8 text-center text-sm text-ink-muted">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="p-8 text-center">
          <p className="text-sm font-semibold text-ink-heading">No messages sent yet</p>
          <p className="mt-1 text-xs text-ink-muted">
            Enable auto-response in the Notification channels panel above, then messages will appear here when buyers submit inquiries.
          </p>
        </div>
      ) : (
        <div>
          <div className="hidden border-b border-silver-200 bg-silver-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-ink-faint lg:grid lg:grid-cols-[minmax(14rem,1.2fr)_minmax(12rem,1fr)_6rem_6rem_8rem] lg:gap-4">
            <span>Vehicle</span>
            <span>Buyer</span>
            <span>Channel</span>
            <span>Status</span>
            <span className="text-right">Sent</span>
          </div>
          {rows.map(row => <OutreachRow key={row.id} row={row} />)}
        </div>
      )}
    </div>
  );
}

function LeadRow({
  lead,
  status,
  onStatusChange,
  onOpenVehicle,
}: {
  lead: DealerLead;
  status: LeadStatus;
  onStatusChange: (status: LeadStatus) => void;
  onOpenVehicle: () => void;
}) {
  const title = vehicleTitle(lead);
  const canOpenVehicle = Boolean(lead.vehicleId || lead.vehicle?.stockNumber);

  return (
    <div className="grid gap-4 border-b border-silver-100 px-4 py-4 last:border-0 hover:bg-silver-50/70 transition-colors lg:grid-cols-[minmax(20rem,1.45fr)_minmax(13rem,1fr)_9rem_9rem_8rem] lg:items-center">
      <div className="flex min-w-0 gap-3">
        <LeadThumbnail lead={lead} title={title} />
        <div className="min-w-0">
          {canOpenVehicle ? (
            <button
              type="button"
              onClick={onOpenVehicle}
              className="block max-w-full truncate text-left text-sm font-semibold text-ink-heading hover:text-orange-700 hover:underline"
            >
              {title}
            </button>
          ) : (
            <p className="truncate text-sm font-semibold text-ink-heading">{title}</p>
          )}
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
            {lead.vehicle?.stockNumber && <span className="font-mono">#{lead.vehicle.stockNumber}</span>}
            {lead.vehicle?.soldAt && (
              <span className="rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
                Sold
              </span>
            )}
          </div>
          {lead.message && (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-body">{lead.message}</p>
          )}
        </div>
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink-heading">{lead.contactName ?? 'Anonymous'}</p>
        {lead.contactEmail && <p className="truncate text-xs text-ink-muted">{lead.contactEmail}</p>}
        {lead.contactPhone && <p className="text-xs text-ink-muted">{lead.contactPhone}</p>}
      </div>

      <div>
        <span className="inline-flex rounded border border-navy-100 bg-navy-50 px-2 py-1 text-[11px] font-semibold text-navy-700">
          {platformLabel(lead.platformSlug)}
        </span>
      </div>

      <div>
        <Select
          value={status}
          options={STATUS_OPTIONS}
          onChange={value => onStatusChange(value as LeadStatus)}
          highlighted={status !== 'new'}
          className={`w-full min-w-[8.5rem] font-semibold ${STATUS_STYLES[status]}`}
        />
      </div>

      <div className="text-xs text-ink-muted lg:text-right">
        <p className="font-semibold text-ink-body">{relativeTime(lead.createdAt)}</p>
        <p>{new Date(lead.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

type PageView = 'leads' | 'communications';

export default function LeadsPage({ dealerId, nav, activeTab }: Props) {
  const [view, setView] = useState<PageView>('leads');

  const { data, loading, error, reload } = useAsyncQuery(
    () => fetchDealerLeads(dealerId),
    [dealerId],
  );

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [statuses, setStatuses] = useState<Record<string, LeadStatus>>(() => readSavedStatuses(dealerId));

  const leads = data?.leads ?? [];

  useEffect(() => {
    setStatuses(readSavedStatuses(dealerId));
  }, [dealerId]);

  const statusFor = useCallback(
    (lead: DealerLead): LeadStatus => statuses[lead.id] ?? 'new',
    [statuses],
  );

  const sourceOptions = useMemo(
    () => [
      { value: 'all', label: 'All sources' },
      ...Array.from(new Set(leads.map(lead => lead.platformSlug))).sort().map(slug => ({
        value: slug,
        label: platformLabel(slug),
      })),
    ],
    [leads],
  );

  const visibleLeads = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = leads.filter(lead => {
      if (statusFilter !== 'all' && statusFor(lead) !== statusFilter) return false;
      if (sourceFilter !== 'all' && lead.platformSlug !== sourceFilter) return false;
      if (q && !leadSearchText(lead).includes(q)) return false;
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sort === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (sort === 'vehicle') return vehicleTitle(a).localeCompare(vehicleTitle(b));
      if (sort === 'buyer') return (a.contactName ?? '').localeCompare(b.contactName ?? '');
      if (sort === 'source') return platformLabel(a.platformSlug).localeCompare(platformLabel(b.platformSlug));
      if (sort === 'status') return statusFor(a).localeCompare(statusFor(b));
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [leads, search, sort, sourceFilter, statusFilter, statusFor]);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = { all: leads.length, new: 0, contacted: 0, appointment: 0, closed: 0, lost: 0 };
    for (const lead of leads) counts[statusFor(lead)] += 1;
    return counts;
  }, [leads, statusFor]);

  const updateStatus = (leadId: string, nextStatus: LeadStatus) => {
    setStatuses(current => {
      const next = { ...current, [leadId]: nextStatus };
      writeSavedStatuses(dealerId, next);
      return next;
    });
  };

  const openVehicle = (lead: DealerLead) => {
    nav.goToInventory({
      ...(lead.vehicle?.stockNumber ? { assetRef: lead.vehicle.stockNumber } : {}),
      ...(lead.vehicleId ? { assetId: lead.vehicleId } : {}),
    });
  };

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

        <NotificationChannelsPanel dealerId={dealerId} />

        {/* Sub-tab bar */}
        <div className="flex gap-1 border-b border-silver-200">
          {(['leads', 'communications'] as PageView[]).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors capitalize ${
                view === v
                  ? 'border-orange-500 text-orange-700'
                  : 'border-transparent text-ink-muted hover:text-ink-body hover:border-silver-400'
              }`}
            >
              {v === 'leads' ? 'Leads' : 'Communications'}
            </button>
          ))}
        </div>

        {view === 'communications' && <CommunicationsPanel dealerId={dealerId} />}

        {view === 'leads' && error && (
          <Banner variant="error" action={<button type="button" onClick={reload} className="text-xs underline">Retry</button>}>
            {error}
          </Banner>
        )}

        {view === 'leads' && <div className="rounded-xl border border-silver-200 bg-white shadow-sm">
          <div className="border-b border-silver-200 p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
              <SearchField
                value={search}
                onChange={setSearch}
                placeholder="Search vehicle, buyer, contact, message, source"
                className="field-input min-w-0 flex-1"
              />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 xl:w-auto">
                <Select
                  value={statusFilter}
                  options={[
                    { value: 'all', label: `All statuses (${statusCounts.all})` },
                    ...STATUS_OPTIONS.map(option => ({
                      value: option.value,
                      label: `${option.label} (${statusCounts[option.value]})`,
                    })),
                  ]}
                  onChange={value => setStatusFilter(value as StatusFilter)}
                  className="h-10 min-w-[11rem]"
                />
                <Select
                  value={sourceFilter}
                  options={sourceOptions}
                  onChange={setSourceFilter}
                  className="h-10 min-w-[10rem]"
                />
                <Select
                  value={sort}
                  options={SORT_OPTIONS}
                  onChange={value => setSort(value as SortKey)}
                  className="h-10 min-w-[9rem]"
                />
              </div>
            </div>
          </div>

          {loading && leads.length === 0 ? (
            <div className="p-8 text-center text-sm text-ink-muted">Loading leads...</div>
          ) : leads.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-ink-heading">No leads yet</p>
              <p className="mt-1 text-xs text-ink-muted">
                When a buyer clicks "Request Info" on the marketplace, it will appear here.
              </p>
            </div>
          ) : visibleLeads.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm font-semibold text-ink-heading">No matching leads</p>
              <p className="mt-1 text-xs text-ink-muted">Adjust search, status, or source filters.</p>
            </div>
          ) : (
            <div>
              <div className="hidden border-b border-silver-200 bg-silver-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-ink-faint lg:grid lg:grid-cols-[minmax(20rem,1.45fr)_minmax(13rem,1fr)_9rem_9rem_8rem] lg:gap-4">
                <span>Vehicle</span>
                <span>Buyer</span>
                <span>Source</span>
                <span className="flex items-center gap-1">Status <InfoButton docId="app/lead-status" /></span>
                <span className="text-right">Received</span>
              </div>
              {visibleLeads.map(lead => (
                <LeadRow
                  key={lead.id}
                  lead={lead}
                  status={statusFor(lead)}
                  onStatusChange={nextStatus => updateStatus(lead.id, nextStatus)}
                  onOpenVehicle={() => openVehicle(lead)}
                />
              ))}
            </div>
          )}
        </div>}
      </div>
    </OperatorPage>
  );
}
