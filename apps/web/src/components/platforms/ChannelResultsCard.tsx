import { useState, type FormEvent } from 'react';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import {
  fetchChannelResults,
  saveChannelCost,
  saveSaleDetails,
  type ChannelResultRow,
  type ChannelResults,
  type SaleOutcomeRow,
} from '@/lib/api/sdk.ts';
import { SectionCard } from '@/components/operator/SectionCard.tsx';
import { PanelError, PanelSkeleton } from '@/components/operator/AsyncPanel.tsx';
import { Button, Modal } from '@/components/ui/index.ts';
import { getActiveCategorySchema } from '@/lib/copy/activeCategoryCopy.ts';
import { businessNoun } from '@/lib/categoryPresentation.ts';
import { operatorChannelName } from '@/lib/platformPresentation.ts';

function soldPlural(): string {
  return getActiveCategorySchema()?.asset.plural ?? 'records';
}

function costOwner(): string {
  const schema = getActiveCategorySchema();
  return schema ? businessNoun(schema) : 'business';
}

type Props = { dealerId: string; refreshKey?: number };

const FIELD = 'w-full px-3 py-2 text-sm border border-silver-300 rounded-md bg-surface-card focus:outline-none focus:ring-2 focus:ring-navy-500/30';

function currentMonth(d = new Date()): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return currentMonth(new Date(Date.UTC(y, m - 1 + delta, 1)));
}

function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

function money(cents: number): string {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(cents / 100);
}

function dollarsToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const n = Number(trimmed);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) : NaN;
}

function centsToDollars(cents: number | null | undefined): string {
  return cents === null || cents === undefined ? '' : String(cents / 100);
}

const Unknown = ({ children }: { children: React.ReactNode }) => <span className="text-ink-faint">{children}</span>;
const Note = ({ children }: { children: React.ReactNode }) => <span className="block text-[11px] text-ink-faint">{children}</span>;

const METHOD_LABEL: Record<string, string> = {
  DEALER_CONFIRMED: 'confirmed by your team',
  LEAD_MARKED_SOLD: 'lead marked sold',
};

const UNATTRIBUTED_LABEL: Record<string, string> = {
  NO_EVIDENCE: 'No evidence yet',
  CONFLICTING_SOLD_LEADS: 'Leads on more than one channel were marked sold',
};

/**
 * Channel results for one month: inquiries DealerGrid recorded, sales attributed by a stated rule,
 * and costs the dealership reported. Anything unknown says so instead of showing zero.
 */
export function ChannelResultsCard({ dealerId, refreshKey = 0 }: Props) {
  const [month, setMonth] = useState(currentMonth);
  const { data, loading, error, reload } = useAsyncQuery(() => fetchChannelResults(dealerId, month), [dealerId, month, refreshKey]);
  const [editingCost, setEditingCost] = useState<ChannelResultRow | null>(null);
  const [editingSale, setEditingSale] = useState<SaleOutcomeRow | null>(null);
  const isCurrentMonth = month === currentMonth();
  if (!error && (!data || data.channels.length === 0)) return null;

  const monthPicker = (
    <div className="flex items-center gap-1 text-xs">
      <button type="button" className="focus-ring rounded px-2 py-1 text-ink-muted hover:text-ink-heading" onClick={() => setMonth(m => shiftMonth(m, -1))} aria-label="Previous month">‹</button>
      <span className="min-w-[7.5rem] text-center font-semibold text-ink-heading">{monthLabel(month)}</span>
      <button type="button" className="focus-ring rounded px-2 py-1 text-ink-muted hover:text-ink-heading disabled:opacity-30" onClick={() => setMonth(m => shiftMonth(m, 1))} disabled={isCurrentMonth} aria-label="Next month">›</button>
    </div>
  );

  return (
    <SectionCard
      title="Channel results"
      subtitle={`Inquiries DealerGrid recorded, sales linked to a channel by evidence, and costs your ${costOwner()} entered.`}
      action={monthPicker}
      noPadding
    >
      {error && <PanelError label="Channel results" error={error} onRetry={reload} />}
      {loading && !data ? <PanelSkeleton rows={5} /> : data ? (
        <ResultsBody data={data} onEditCost={setEditingCost} onEditSale={setEditingSale} />
      ) : null}

      {editingCost && (
        <CostDialog
          dealerId={dealerId}
          month={month}
          row={editingCost}
          onDone={changed => { setEditingCost(null); if (changed) reload(); }}
        />
      )}
      {editingSale && data && (
        <SaleDialog
          dealerId={dealerId}
          sale={editingSale}
          channels={data.channels}
          onDone={changed => { setEditingSale(null); if (changed) reload(); }}
        />
      )}
    </SectionCard>
  );
}

function ResultsBody({ data, onEditCost, onEditSale }: {
  data: ChannelResults;
  onEditCost: (row: ChannelResultRow) => void;
  onEditSale: (sale: SaleOutcomeRow) => void;
}) {
  const { sales, inquiries, cost } = data;
  return (
    <div>
      <dl className="grid grid-cols-1 gap-px bg-silver-100 sm:grid-cols-3">
        <div className="bg-surface-card px-5 py-4">
          <dt className="text-xs text-ink-muted">{soldPlural().charAt(0).toUpperCase() + soldPlural().slice(1)} marked sold</dt>
          <dd className="mt-1 text-xl font-semibold text-ink-heading">{sales.markedSold}</dd>
          <Note>{sales.attributed} linked to a channel · {sales.unattributed} not linked</Note>
        </div>
        <div className="bg-surface-card px-5 py-4">
          <dt className="text-xs text-ink-muted">Inquiries recorded</dt>
          <dd className="mt-1 text-xl font-semibold text-ink-heading">{inquiries.recorded}</dd>
          <Note>{inquiries.progressed} followed up by your team · only channels that send inquiries to DealerGrid</Note>
        </div>
        <div className="bg-surface-card px-5 py-4">
          <dt className="text-xs text-ink-muted">Costs entered</dt>
          <dd className="mt-1 text-xl font-semibold text-ink-heading">
            {cost.totalReportedCostCents === null ? <Unknown>None entered</Unknown> : money(cost.totalReportedCostCents)}
          </dd>
          <Note>{cost.channelsWithReportedCost} {cost.channelsWithReportedCost === 1 ? 'channel' : 'channels'} with a cost for this month</Note>
        </div>
      </dl>

      <ChannelTable rows={data.channels} unattributed={sales.unattributed} onEditCost={onEditCost} />
      <SalesTable sales={data.saleOutcomes} channels={data.channels} onEditSale={onEditSale} />
    </div>
  );
}

function InquiryCell({ row }: { row: ChannelResultRow }) {
  if (row.inquiryReporting === 'NOT_REPORTED') return <Unknown>Not sent to DealerGrid</Unknown>;
  if (row.inquiryReporting === 'PARTIAL') {
    return <><span className="font-semibold text-ink-heading">{row.inquiries}</span><Note>incomplete — this channel doesn't send inquiries to DealerGrid</Note></>;
  }
  return (
    <>
      <span className="font-semibold text-ink-heading">{row.inquiries}</span>
      <Note>{row.progressedInquiries} followed up{row.inquirySource === 'PLATFORM_REPORTED' ? ' · reported by the channel' : ''}</Note>
    </>
  );
}

function ChannelTable({ rows, unattributed, onEditCost }: { rows: ChannelResultRow[]; unattributed: number; onEditCost: (row: ChannelResultRow) => void }) {
  if (rows.length === 0) {
    return <p className="border-t border-silver-100 px-5 py-6 text-sm text-ink-muted">No channels are turned on and nothing was recorded this month.</p>;
  }
  return (
    <div className="border-t border-silver-100">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-silver-50 text-xs text-ink-muted">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-medium">Channel</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Inquiries</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Sales linked</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Cost entered</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Cost per inquiry</th>
              <th scope="col" className="px-4 py-2.5 font-medium">Cost per linked sale</th>
              <th scope="col" className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-silver-100">
            {rows.map(row => (
              <tr key={row.platformSlug} className="align-top">
                <td className="px-5 py-3 font-medium text-ink-heading">{operatorChannelName(row.platformSlug, row.platformName)}</td>
                <td className="px-4 py-3"><InquiryCell row={row} /></td>
                <td className="px-4 py-3">
                  <span className="font-semibold text-ink-heading">{row.attributedSales}</span>
                  {row.attributedSales > 0 && (
                    <Note>
                      {[
                        row.attributedByMethod.DEALER_CONFIRMED > 0 && `${row.attributedByMethod.DEALER_CONFIRMED} confirmed`,
                        row.attributedByMethod.LEAD_MARKED_SOLD > 0 && `${row.attributedByMethod.LEAD_MARKED_SOLD} via lead marked sold`,
                      ].filter(Boolean).join(' · ')}
                    </Note>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.cost?.reportedCostCents == null ? <Unknown>Not entered</Unknown> : (
                    <>
                      <span className="text-ink-heading">{money(row.cost.reportedCostCents)}</span>
                      <Note>
                        {[
                          row.cost.flatFeeCents !== null && `${money(row.cost.flatFeeCents)} fee`,
                          row.cost.adSpendCents !== null && `${money(row.cost.adSpendCents)} ads`,
                        ].filter(Boolean).join(' + ')}
                      </Note>
                    </>
                  )}
                </td>
                <td className="px-4 py-3">
                  {row.costPerInquiryCents !== null ? money(row.costPerInquiryCents) : <Unknown>—</Unknown>}
                </td>
                <td className="px-4 py-3">
                  {row.costPerAttributedSaleCents !== null ? money(row.costPerAttributedSaleCents) : <Unknown>—</Unknown>}
                </td>
                <td className="px-4 py-3 text-right">
                  <Button variant="ghost" onClick={() => onEditCost(row)}>{row.cost ? 'Edit cost' : 'Enter cost'}</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="border-t border-silver-100 px-5 py-3 text-xs text-ink-muted">
        A cost per figure appears only when both numbers behind it are known. Cost per inquiry needs a channel that sends
        inquiries to DealerGrid. A sale is linked to a channel only when your team confirms the channel or marks that
        channel's lead as sold
        {unattributed > 0 ? `; ${unattributed} ${unattributed === 1 ? 'sale this month is' : 'sales this month are'} not linked, so cost per linked sale can overstate cost.` : '.'}
      </p>
    </div>
  );
}

function SalesTable({ sales, channels, onEditSale }: { sales: SaleOutcomeRow[]; channels: ChannelResultRow[]; onEditSale: (sale: SaleOutcomeRow) => void }) {
  const names = new Map(channels.map(c => [c.platformSlug, operatorChannelName(c.platformSlug, c.platformName)]));
  return (
    <div className="border-t border-silver-200">
      <div className="px-5 py-3">
        <h4 className="text-sm font-semibold text-ink-heading">Sales this month</h4>
        <p className="text-xs text-ink-faint">{soldPlural().charAt(0).toUpperCase() + soldPlural().slice(1)} marked sold this month. Add the actual sale date, price and channel when you know them.</p>
      </div>
      {sales.length === 0 ? (
        <p className="px-5 pb-5 text-sm text-ink-muted">No {soldPlural()} were marked sold this month.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-silver-50 text-xs text-ink-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-medium">Vehicle</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Marked sold</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Sale date</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Sale price</th>
                <th scope="col" className="px-4 py-2.5 font-medium">Channel</th>
                <th scope="col" className="px-4 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-silver-100">
              {sales.map(sale => (
                <tr key={sale.vehicleId} className="align-top">
                  <td className="px-5 py-3">
                    <span className="font-medium text-ink-heading">{sale.title}</span>
                    <Note>Stock {sale.stockNumber}</Note>
                  </td>
                  <td className="px-4 py-3 text-ink-body">{new Date(sale.markedSoldAt).toLocaleDateString('en-US')}</td>
                  <td className="px-4 py-3">{sale.transactionDate ?? <Unknown>Not entered</Unknown>}</td>
                  <td className="px-4 py-3">{sale.salePriceCents !== null ? money(sale.salePriceCents) : <Unknown>Not entered</Unknown>}</td>
                  <td className="px-4 py-3">
                    {sale.attributedChannelSlug ? (
                      <>
                        <span className="text-ink-heading">{names.get(sale.attributedChannelSlug) ?? sale.attributedChannelSlug}</span>
                        <Note>{METHOD_LABEL[sale.attributionMethod ?? ''] ?? ''}</Note>
                      </>
                    ) : <Unknown>{UNATTRIBUTED_LABEL[sale.unattributedReason ?? ''] ?? 'Not linked'}</Unknown>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="ghost" onClick={() => onEditSale(sale)}>Sale details</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DialogFrame({ title, subtitle, error, busy, onCancel, onSubmit, children }: {
  title: string; subtitle: string; error: string | null; busy: boolean;
  onCancel: () => void; onSubmit: (e: FormEvent) => void; children: React.ReactNode;
}) {
  return (
    <Modal maxWidth="max-w-md">
      <form onSubmit={onSubmit} className="flex flex-col" aria-label={title}>
        <div className="border-b border-silver-100 px-6 py-4">
          <h2 className="text-base font-semibold text-ink-heading">{title}</h2>
          <p className="mt-0.5 text-xs text-ink-muted">{subtitle}</p>
        </div>
        <div className="space-y-4 px-6 py-5">
          {children}
          {error && <p role="alert" className="text-xs text-status-error-text">{error}</p>}
        </div>
        <div className="flex justify-end gap-2 border-t border-silver-100 px-6 py-4">
          <Button variant="ghost" onClick={onCancel} disabled={busy}>Cancel</Button>
          <Button type="submit" variant="secondary" loading={busy} loadingLabel="Saving…">Save</Button>
        </div>
      </form>
    </Modal>
  );
}

function CostDialog({ dealerId, month, row, onDone }: { dealerId: string; month: string; row: ChannelResultRow; onDone: (changed: boolean) => void }) {
  const [fee, setFee] = useState(centsToDollars(row.cost?.flatFeeCents));
  const [ads, setAds] = useState(centsToDollars(row.cost?.adSpendCents));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const flatFeeCents = dollarsToCents(fee), adSpendCents = dollarsToCents(ads);
    if (Number.isNaN(flatFeeCents) || Number.isNaN(adSpendCents)) { setError('Enter amounts as dollars, or leave them blank.'); return; }
    setBusy(true);
    setError(null);
    try {
      await saveChannelCost(dealerId, { platformSlug: row.platformSlug, month, flatFeeCents, adSpendCents });
      onDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the cost.');
      setBusy(false);
    }
  };

  return (
    <DialogFrame
      title={`${operatorChannelName(row.platformSlug, row.platformName)} cost for ${monthLabel(month)}`}
      subtitle="Leave a field blank if you don't know it. Blank is not the same as $0. Clearing both removes the cost."
      error={error} busy={busy} onCancel={() => onDone(false)} onSubmit={submit}
    >
      <label className="block text-xs font-semibold text-ink-body">
        Subscription or listing fee ($)
        <input type="number" inputMode="decimal" min="0" step="0.01" value={fee} onChange={e => setFee(e.target.value)} className={`${FIELD} mt-1`} />
      </label>
      <label className="block text-xs font-semibold text-ink-body">
        Advertising spend ($)
        <input type="number" inputMode="decimal" min="0" step="0.01" value={ads} onChange={e => setAds(e.target.value)} className={`${FIELD} mt-1`} />
      </label>
    </DialogFrame>
  );
}

function SaleDialog({ dealerId, sale, channels, onDone }: { dealerId: string; sale: SaleOutcomeRow; channels: ChannelResultRow[]; onDone: (changed: boolean) => void }) {
  const [date, setDate] = useState(sale.transactionDate ?? '');
  const [price, setPrice] = useState(centsToDollars(sale.salePriceCents));
  const [channel, setChannel] = useState(sale.attributionMethod === 'DEALER_CONFIRMED' ? sale.attributedChannelSlug ?? '' : '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const salePriceCents = dollarsToCents(price);
    if (Number.isNaN(salePriceCents) || salePriceCents === 0) { setError('Enter the sale price in dollars, or leave it blank.'); return; }
    setBusy(true);
    setError(null);
    try {
      await saveSaleDetails(dealerId, sale.vehicleId, { transactionDate: date || null, salePriceCents, confirmedChannelSlug: channel || null });
      onDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the sale details.');
      setBusy(false);
    }
  };

  return (
    <DialogFrame
      title={`Sale details — ${sale.title}`}
      subtitle="Enter only what you know. Blank fields stay unknown; DealerGrid never fills them from the asking price or the date it was marked sold."
      error={error} busy={busy} onCancel={() => onDone(false)} onSubmit={submit}
    >
      <label className="block text-xs font-semibold text-ink-body">
        Sale date
        <input type="date" max={today} value={date} onChange={e => setDate(e.target.value)} className={`${FIELD} mt-1`} />
      </label>
      <label className="block text-xs font-semibold text-ink-body">
        Sale price ($)
        <input type="number" inputMode="decimal" min="0" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className={`${FIELD} mt-1`} />
      </label>
      <label className="block text-xs font-semibold text-ink-body">
        Channel that produced the sale
        <select value={channel} onChange={e => setChannel(e.target.value)} className={`${FIELD} mt-1`}>
          <option value="">Not known</option>
          {channels.map(c => <option key={c.platformSlug} value={c.platformSlug}>{operatorChannelName(c.platformSlug, c.platformName)}</option>)}
        </select>
        <span className="mt-1 block font-normal text-ink-faint">Only choose a channel if you know the buyer came from it.</span>
      </label>
    </DialogFrame>
  );
}
