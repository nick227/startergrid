import { useState } from 'react';
import { OperatorPage, PageHeader } from '@/components/operator';
import { WorkspaceTabs } from '@/components/operator/WorkspaceTabs.tsx';
import { DealerHomeDashboard } from '@/components/home/DealerHomeDashboard.tsx';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { workspaceRequest, type BusinessFeed, type SaleRow } from '@/lib/api/workspaces.ts';
import { preserveSupport } from '@/lib/routes.ts';
import LeadsPage from './LeadsPage.tsx';

const tabs = [{ id: 'all', label: 'All Activity' }, { id: 'attention', label: 'Needs Attention' }, { id: 'leads', label: 'Leads' }, { id: 'sales', label: 'Sales' }];

function activityWhen(iso: string): string {
  const date = new Date(iso);
  const sameYear = date.getFullYear() === new Date().getFullYear();
  return date.toLocaleString(undefined, { month: 'short', day: 'numeric', year: sameYear ? undefined : 'numeric', hour: 'numeric', minute: '2-digit' });
}
export default function ActivityPage(props: OperatorPageBaseProps & { view?: string }) {
  const view = tabs.some(t => t.id === props.view) ? props.view! : 'all';
  const viewLabel = tabs.find(tab => tab.id === view)?.label ?? 'Activity';
  return <OperatorPage {...props} activeTab="activity" sectionLabel={view === 'all' ? 'Activity' : `Activity · ${viewLabel}`}>
    <PageHeader title="Activity" />
    <WorkspaceTabs dealerId={props.dealerId} workspace="activity" active={view} tabs={tabs} />
    {view === 'all' && <BusinessActivity key={props.dealerId} dealerId={props.dealerId} />}
    {view === 'attention' && <DealerHomeDashboard dealerId={props.dealerId} nav={props.nav} />}
    {view === 'leads' && <LeadsPage {...props} activeTab="activity" embedded />}
    {view === 'sales' && <SalesRegister dealerId={props.dealerId} nav={props.nav} />}
  </OperatorPage>;
}
function BusinessActivity({ dealerId }: { dealerId: string }) {
  const [before, setBefore] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const query = useAsyncQuery(() => workspaceRequest<BusinessFeed>(dealerId, `business-activity${before ? `?cursor=${encodeURIComponent(before)}` : ''}`), [dealerId, before]);
  const events = (query.data?.events ?? []).filter(e => (category === 'all' || category === e.category) && `${e.title} ${e.detail}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="space-y-4" aria-label="Business activity">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <input aria-label="Search activity" className="field-input min-w-0 flex-1" placeholder="Search activity" value={search} onChange={e => setSearch(e.target.value)} />
      <select aria-label="Activity type" className="field-input sm:w-52 sm:shrink-0" value={category} onChange={e => setCategory(e.target.value)}>{[['all', 'All events'], ['leads', 'Buyer inquiries'], ['vehicles', 'Vehicles'], ['channels', 'Channels'], ['imports', 'Imports'], ['crm', 'CRM delivery']].map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select>
      <button className="btn-secondary-operator shrink-0" onClick={query.reload}>Refresh</button>
    </div>
    <p className="text-sm text-ink-muted">Recent business events. Publishing batches are grouped; detailed changes stay with their records.</p>
    {query.error && <p role="alert" className="text-red-700">{query.error}</p>}
    {query.loading && !query.data ? <p role="status">Loading activity…</p> : !query.error && events.length === 0 ? <p className="py-10 text-ink-muted">No activity matches this view.</p> : <ol className="divide-y divide-silver-200 rounded-xl border border-silver-200 bg-white">{events.map(e => {
      const urgent = /failed/i.test(e.title);
      return <li key={e.id} className={`px-4 py-3 flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-6 ${urgent ? 'bg-amber-50/80' : ''}`}>
        <time className="sm:w-36 shrink-0 text-xs text-ink-muted" dateTime={e.occurredAt}>{activityWhen(e.occurredAt)}</time>
        <div className="min-w-0"><a className={`font-semibold underline underline-offset-4 ${urgent ? 'text-amber-900' : 'text-ink-heading'}`} href={preserveSupport(e.href)}>{e.title}{e.count > 1 ? ` · ${e.count} events` : ''}</a><p className="text-sm text-ink-body mt-0.5">{e.detail}</p></div>
      </li>;
    })}</ol>}
    <div className="flex gap-4">{before && <button className="btn-secondary-operator" onClick={() => setBefore(null)}>Latest activity</button>}{query.data?.nextCursor && <button className="btn-secondary-operator" onClick={() => setBefore(query.data!.nextCursor)}>Older activity</button>}</div>
  </section>;
}
function SalesRegister({ dealerId, nav }: Pick<OperatorPageBaseProps, 'dealerId' | 'nav'>) {
  const query = useAsyncQuery(() => workspaceRequest<{ sales: SaleRow[]; truncated: boolean }>(dealerId, 'sales-register'), [dealerId]);
  const [search, setSearch] = useState('');
  const sales = (query.data?.sales ?? []).filter(s => `${s.title} ${s.stockNumber} ${s.channel ?? ''}`.toLowerCase().includes(search.toLowerCase()));
  return <section className="space-y-5" aria-label="Sales register">
    <div className="flex gap-3"><input className="field-input flex-1" aria-label="Search sales" placeholder="Search sold vehicles or source" value={search} onChange={e => setSearch(e.target.value)} /><button className="btn-secondary-operator" onClick={query.reload}>Refresh</button></div>
    <p className="text-sm text-ink-muted">Sold inventory and recorded transactions. A sold-status change does not establish a sale date, price or source.</p>
    {query.error && <p role="alert" className="text-red-700">{query.error}</p>}
    {query.loading && !query.data ? <p>Loading sales…</p> : !query.error && !sales.length ? <p className="py-10 text-ink-muted">No sold vehicles match this view.</p> : sales.map(s => <article key={s.vehicleId} className="surface-card-operator p-5 space-y-4">
      <button className="font-semibold underline text-left" onClick={() => nav.goToInventoryItem({ assetTitle: s.title, stockNumber: s.stockNumber }, { assetId: s.vehicleId })}>{s.title} · {s.stockNumber}</button>
      <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
        <div><dt className="text-ink-muted">Inventory outcome</dt><dd>Sold · marked {new Date(s.statusChangedAt).toLocaleDateString()}</dd></div>
        <div><dt className="text-ink-muted">Transaction</dt><dd>{s.salePriceCents === null ? 'Price not recorded' : new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD' }).format(s.salePriceCents / 100)}</dd><dd>{s.transactionDate ? new Date(s.transactionDate).toLocaleDateString() : 'Sale date not recorded'}</dd></div>
        <div><dt className="text-ink-muted">Attribution</dt><dd>{s.channel ?? 'Source not confirmed'}</dd></div>
        <div><dt className="text-ink-muted">Evidence</dt><dd>{s.evidence ? s.evidence.toLowerCase().replace(/_/g, ' ') : 'Inventory status only'}</dd></div>
      </dl>
    </article>)}
    {query.data?.truncated && <p>Showing the 500 most recent sold vehicles. Use inventory for older records.</p>}
  </section>;
}
