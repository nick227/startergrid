import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { fetchDealerLeads, fetchBuyerOutreach, type DealerLead, type BuyerOutreachRecord } from '@/lib/api/sdk.ts';
import { updateLeadWorkflow, fetchDealershipPeople } from '@/lib/api/dealershipRecordApi.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { OperatorPage, PageHeader } from '@/components/operator';
import { InfoButton } from '@/components/docs/index.ts';
import { GuidanceNote } from '@/components/guidance/GuidanceNote.tsx';
import { Banner, SearchField, Select } from '@/components/ui';
import { AUTO_MARKETPLACE_NAME, AUTO_MARKETPLACE_SLUG } from '@/lib/marketplaceBrand.ts';

type Props = OperatorPageBaseProps;

type LeadStatus = 'new' | 'contacted' | 'appointment' | 'closed' | 'lost';
type StatusFilter = 'all' | LeadStatus;
type SortKey = 'newest' | 'oldest' | 'vehicle' | 'buyer' | 'source' | 'status';

const STATUS_OPTIONS: Array<{ value: LeadStatus; label: string }> = [
  { value: 'new', label: 'New' },
  { value: 'contacted', label: 'Contacted' },
  { value: 'appointment', label: 'Appointment' },
  { value: 'closed', label: 'Closed / Won' },
  { value: 'lost', label: 'Lost' },
];

const WORKFLOW_MAP_TO_API: Record<LeadStatus, 'NEW' | 'CONTACTED' | 'APPOINTMENT' | 'SOLD' | 'LOST'> = {
  new: 'NEW',
  contacted: 'CONTACTED',
  appointment: 'APPOINTMENT',
  closed: 'SOLD',
  lost: 'LOST',
};

const WORKFLOW_MAP_FROM_API: Record<string, LeadStatus> = {
  NEW: 'new',
  CONTACTED: 'contacted',
  APPOINTMENT: 'appointment',
  SOLD: 'closed',
  LOST: 'lost',
};

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
  if (slug === AUTO_MARKETPLACE_SLUG) return AUTO_MARKETPLACE_NAME;
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
        <span className={`inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold ${
          row.status === 'SENT'
            ? 'border-green-200 bg-green-50 text-green-700'
            : 'border-red-200 bg-red-50 text-red-700'
        }`}>
          {row.status === 'SENT' ? 'Sent' : 'Could not send'}
        </span>
      </div>
      <div className="text-xs text-ink-muted lg:text-right">
        <p className="font-semibold text-ink-body">{relativeTime(row.createdAt)}</p>
        <p>{new Date(row.createdAt).toLocaleDateString()}</p>
      </div>
    </div>
  );
}

function CommunicationsLog({ dealerId }: { dealerId: string }) {
  const { data, loading, error, reload } = useAsyncQuery(
    () => fetchBuyerOutreach(dealerId),
    [dealerId],
  );

  const [channelFilter, setChannelFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  const records: BuyerOutreachRecord[] = data?.outreach ?? [];

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return records.filter((r: BuyerOutreachRecord) => {
      if (channelFilter !== 'all' && r.channel !== channelFilter) return false;
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (q) {
        const text = [
          r.recipientAddress,
          r.contactName,
          r.vehicle ? `${r.vehicle.year} ${r.vehicle.make} ${r.vehicle.model}` : '',
          r.vehicle?.stockNumber,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!text.includes(q)) return false;
      }
      return true;
    });
  }, [records, channelFilter, statusFilter, search]);

  const channelOptions = [
    { value: 'all', label: `All channels (${records.length})` },
    { value: 'email', label: `Email (${records.filter((r: BuyerOutreachRecord) => r.channel === 'email').length})` },
    { value: 'sms', label: `SMS (${records.filter((r: BuyerOutreachRecord) => r.channel === 'sms').length})` },
  ];

  const statusOptions = [
    { value: 'all', label: 'All statuses' },
    { value: 'SENT', label: 'Sent' },
    { value: 'FAILED', label: 'Failed' },
  ];

  return (
    <div className="space-y-4">
      {error && (
        <Banner variant="error" action={<button type="button" onClick={reload} className="text-xs underline">Retry</button>}>
          {error}
        </Banner>
      )}

      <div className="surface-card-operator overflow-hidden p-0">
        <div className="border-b border-silver-200 bg-silver-50/60 p-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <SearchField
              value={search}
              onChange={setSearch}
              placeholder="Search recipient, name, vehicle"
              className="field-input min-w-0 flex-1"
            />
            <div className="flex flex-wrap gap-2">
              <Select
                value={channelFilter}
                options={channelOptions}
                onChange={setChannelFilter}
                className="h-10 min-w-[10rem]"
              />
              <Select
                value={statusFilter}
                options={statusOptions}
                onChange={setStatusFilter}
                className="h-10 min-w-[9rem]"
              />
            </div>
          </div>
        </div>

        {loading && records.length === 0 ? (
          <div className="p-8 text-center text-sm text-ink-muted">Loading sent messages…</div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-ink-heading">No messages sent yet</p>
            <p className="mt-1 text-xs text-ink-muted">
              When StarterGrid emails or texts a shopper, that send appears here.
            </p>
          </div>
        ) : visible.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm font-semibold text-ink-heading">No matching records</p>
            <p className="mt-1 text-xs text-ink-muted">Adjust channel or status filters.</p>
          </div>
        ) : (
          <div>
            <div className="hidden border-b border-silver-200 bg-silver-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-ink-faint lg:grid lg:grid-cols-[minmax(14rem,1.2fr)_minmax(12rem,1fr)_6rem_6rem_8rem] lg:gap-4">
              <span>Vehicle</span>
              <span>Recipient</span>
              <span>Channel</span>
              <span>Status</span>
              <span className="text-right">Sent</span>
            </div>
            {visible.map((row: BuyerOutreachRecord) => (
              <OutreachRow key={row.id} row={row} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function LeadRow({
  lead,
  status,
  assigneeId,
  teamMembers,
  onStatusChange,
  onAssigneeChange,
  onOpenVehicle,
}: {
  lead: DealerLead;
  status: LeadStatus;
  assigneeId: string | null;
  teamMembers: Array<{ id: string; name?: string | null; email: string; accessRole: string }>;
  onStatusChange: (status: LeadStatus) => void;
  onAssigneeChange: (assigneeId: string | null) => void;
  onOpenVehicle: () => void;
}) {
  const title = vehicleTitle(lead);
  const canOpenVehicle = Boolean(lead.vehicleId || lead.vehicle?.stockNumber);

  return (
    <div className="grid gap-3 border-b border-silver-100 px-4 py-3.5 last:border-0 hover:bg-silver-50/70 transition-colors lg:grid-cols-[minmax(18rem,1.4fr)_minmax(12rem,1fr)_7rem_8.5rem_8.5rem_7rem] lg:items-center">
      {/* 1. Vehicle & inquiry */}
      <div className="flex min-w-0 gap-3">
        <LeadThumbnail lead={lead} title={title} />
        <div className="min-w-0">
          {canOpenVehicle ? (
            <button
              type="button"
              onClick={onOpenVehicle}
              className="block max-w-full truncate text-left text-sm font-semibold text-ink-heading hover:text-navy-700 hover:underline"
            >
              {title}
            </button>
          ) : (
            <p className="truncate text-sm font-semibold text-ink-heading">{title}</p>
          )}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-muted">
            {lead.vehicle?.stockNumber && <span className="font-mono">#{lead.vehicle.stockNumber}</span>}
            {lead.vehicle?.soldAt && (
              <span className="rounded border border-green-200 bg-green-50 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-green-700">
                Sold
              </span>
            )}
          </div>
          {lead.message && (
            <p className="mt-1 line-clamp-2 text-xs leading-5 text-ink-body bg-surface-inset p-1.5 rounded border border-silver-200">
              "{lead.message}"
            </p>
          )}
        </div>
      </div>

      {/* 2. Contact details */}
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-ink-heading">{lead.contactName ?? 'No name given'}</p>
        {lead.contactEmail && (
          <a href={`mailto:${lead.contactEmail}`} className="truncate text-xs text-ink-muted hover:text-navy-700 hover:underline block mt-0.5">
            ✉ {lead.contactEmail}
          </a>
        )}
        {lead.contactPhone && (
          <a href={`tel:${lead.contactPhone}`} className="text-xs text-ink-muted hover:text-navy-700 hover:underline block mt-0.5">
            📞 {lead.contactPhone}
          </a>
        )}
      </div>

      {/* 3. Source platform */}
      <div>
        <span className="inline-flex rounded border border-navy-100 bg-navy-50 px-2 py-0.5 text-[11px] font-semibold text-navy-700">
          {platformLabel(lead.platformSlug)}
        </span>
      </div>

      {/* 4. Assignee */}
      <div>
        <select
          value={assigneeId || ''}
          onChange={e => onAssigneeChange(e.target.value ? e.target.value : null)}
          className="w-full text-xs bg-white border border-silver-300 rounded-md px-2 py-1.5 text-ink-heading focus:ring-1 focus:ring-navy-500 font-medium truncate"
          title="Assign team member"
        >
          <option value="">Unassigned</option>
          {teamMembers.map(m => (
            <option key={m.id} value={m.id}>
              {m.name || m.email} ({m.accessRole === 'DEALER_OWNER' ? 'Owner' : 'Staff'})
            </option>
          ))}
        </select>
      </div>

      {/* 5. Status dropdown */}
      <div>
        <Select
          value={status}
          options={STATUS_OPTIONS}
          onChange={value => onStatusChange(value as LeadStatus)}
          highlighted={status !== 'new'}
          className={`w-full text-xs font-semibold ${STATUS_STYLES[status]}`}
        />
      </div>

      {/* 6. Date */}
      <div className="text-xs text-ink-muted lg:text-right">
        <p className="font-semibold text-ink-body">{relativeTime(lead.createdAt)}</p>
        <p className="font-mono text-[11px] text-ink-faint">{new Date(lead.createdAt).toLocaleDateString()}</p>
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

  const { data: peopleData } = useAsyncQuery(
    () => fetchDealershipPeople(dealerId),
    [dealerId],
  );

  const teamMembers = useMemo(
    () =>
      (peopleData?.people ?? []).map(p => ({
        id: p.accountId,
        email: p.email,
        name: p.email.split('@')[0],
        accessRole: p.accessRole,
      })),
    [peopleData],
  );

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [statuses, setStatuses] = useState<Record<string, LeadStatus>>({});
  const [assignees, setAssignees] = useState<Record<string, string | null>>({});

  const leads = data?.leads ?? [];

  useEffect(() => {
    setStatuses({});
    setAssignees({});
  }, [dealerId]);

  const statusFor = useCallback(
    (lead: DealerLead): LeadStatus => {
      if (statuses[lead.id]) return statuses[lead.id];
      if (lead.workflowStatus && WORKFLOW_MAP_FROM_API[lead.workflowStatus]) {
        return WORKFLOW_MAP_FROM_API[lead.workflowStatus];
      }
      return 'new';
    },
    [statuses],
  );

  const assigneeFor = useCallback(
    (lead: DealerLead): string | null => {
      if (assignees[lead.id] !== undefined) return assignees[lead.id];
      return lead.assigneeOperatorId ?? null;
    },
    [assignees],
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

  const handleStatusChange = async (lead: DealerLead, nextStatus: LeadStatus) => {
    setStatuses(current => ({ ...current, [lead.id]: nextStatus }));

    try {
      await updateLeadWorkflow(dealerId, lead.id, {
        workflowStatus: WORKFLOW_MAP_TO_API[nextStatus],
        assigneeOperatorId: assigneeFor(lead),
        version: lead.version,
      });
    } catch (err) {
      console.error('Failed to persist lead status', err);
    }
  };

  const handleAssigneeChange = async (lead: DealerLead, nextAssigneeId: string | null) => {
    setAssignees(current => ({ ...current, [lead.id]: nextAssigneeId }));

    try {
      await updateLeadWorkflow(dealerId, lead.id, {
        workflowStatus: WORKFLOW_MAP_TO_API[statusFor(lead)],
        assigneeOperatorId: nextAssigneeId,
        version: lead.version,
      });
    } catch (err) {
      console.error('Failed to persist lead assignee', err);
    }
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
          subtitle="Shopper inquiries about your vehicles. Status and assignment save for everyone at this dealership."
        />

        {leads.length === 0 && !loading && view === 'leads' && (
          <GuidanceNote>
            When a shopper asks about a vehicle, the inquiry lands here. Reply from this inbox, then mark the next step so the rest of the team can see it.
          </GuidanceNote>
        )}

        <p className="text-xs text-ink-muted">
          Change email and text alerts in{' '}
          <button type="button" onClick={nav.goToSettings} className="font-semibold text-navy-700 hover:underline">
            Settings
          </button>
          .
        </p>

        <div className="flex gap-1 border-b border-silver-200">
          {(['leads', 'communications'] as PageView[]).map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
                view === v
                  ? 'border-orange-500 text-orange-700'
                  : 'border-transparent text-ink-muted hover:text-ink-body hover:border-silver-400'
              }`}
            >
              {v === 'leads' ? `Inbox (${leads.length})` : 'Delivery log'}
            </button>
          ))}
        </div>

        {view === 'communications' ? (
          <CommunicationsLog dealerId={dealerId} />
        ) : (
          <div className="space-y-4">
            {error && (
              <Banner variant="error" action={<button type="button" onClick={reload} className="text-xs underline">Retry</button>}>
                {error}
              </Banner>
            )}

            <div className="surface-card-operator overflow-hidden p-0">
              <div className="border-b border-silver-200 bg-silver-50/60 p-4">
                <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
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
                <div className="p-8 text-center text-sm text-ink-muted">Loading inquiries…</div>
              ) : leads.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-ink-heading">No inquiries yet</p>
                  <p className="mt-1 text-xs text-ink-muted">
                    Inquiries appear when a shopper requests info on your storefront or a connected destination.
                  </p>
                </div>
              ) : visibleLeads.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm font-semibold text-ink-heading">No matching leads</p>
                  <p className="mt-1 text-xs text-ink-muted">Adjust search, status, or source filters.</p>
                </div>
              ) : (
                <div>
                  <div className="hidden border-b border-silver-200 bg-silver-50 px-4 py-2 text-[10px] font-bold uppercase tracking-wide text-ink-faint lg:grid lg:grid-cols-[minmax(18rem,1.4fr)_minmax(12rem,1fr)_7rem_8.5rem_8.5rem_7rem] lg:gap-3">
                    <span>Vehicle & Inquiry</span>
                    <span>Buyer Contact</span>
                    <span>Source</span>
                    <span>Assignee</span>
                    <span className="flex items-center gap-1">Status <InfoButton docId="app/lead-status" /></span>
                    <span className="text-right">Received</span>
                  </div>
                  {visibleLeads.map(lead => (
                    <LeadRow
                      key={lead.id}
                      lead={lead}
                      status={statusFor(lead)}
                      assigneeId={assigneeFor(lead)}
                      teamMembers={teamMembers}
                      onStatusChange={nextStatus => handleStatusChange(lead, nextStatus)}
                      onAssigneeChange={nextAssignee => handleAssigneeChange(lead, nextAssignee)}
                      onOpenVehicle={() => openVehicle(lead)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </OperatorPage>
  );
}
