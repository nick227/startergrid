import { useCallback, useEffect, useState } from 'react';
import {
  completeHandoff,
  fetchAdminDealershipRecord,
  retryChannelSetup,
  patchAdminDealershipRecord,
  type DealershipRecordDetail,
} from '@/lib/api/dealershipRecordApi.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { Banner } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog.tsx';
import { ToastView, useToast } from '@/components/ui/Toast.tsx';
import { PeoplePanel } from '@/components/people/PeoplePanel.tsx';
import { DealershipProfilePanel } from './DealershipProfilePanel.tsx';
import { DealershipActivity } from './DealershipActivity.tsx';
import { lifecycleLabel, relativeTime, stepTitle, type LifecycleTone } from '@/lib/dealershipLabels.ts';
import { handoffReadiness, recordNextAction, type NextAction } from '@/lib/dealershipNextStep.ts';
import { PagePrimaryState } from '@/components/guidance/PagePrimaryState.tsx';
import { DealershipDestinationsPanel } from './DealershipDestinationsPanel.tsx';
import { adminDealerHash } from '@/lib/routes.ts';
import { resolveCategorySchema } from '@auto-dealer/category-schemas';

export type RecordTab = 'overview' | 'destinations' | 'people' | 'activity';

/** Maps older deep links (#/admin/dealers/:id/setup, /channels, /vehicles…) onto the record tabs. */
export function recordTabFromRoute(page: string | null | undefined): RecordTab {
  if (page === 'people') return 'people';
  if (page === 'activity') return 'activity';
  if (page === 'destinations' || page === 'platforms' || page === 'channels') return 'destinations';
  return 'overview';
}

type Props = {
  dealerId: string;
  initialTab?: RecordTab;
  viewer: { userId?: string | null; isSiteAdmin: boolean };
  onOpenDealerView: (dealerId: string, page?: 'inventory' | 'leads') => void;
  onBackToDirectory: () => void;
  onRefreshDealers?: () => void;
};

const TONE_CLASS: Record<LifecycleTone, string> = {
  neutral: 'bg-silver-100 text-ink-muted border-silver-300',
  progress: 'bg-status-warning-bg text-status-warning-text border-status-warning-border',
  ready: 'bg-status-info-bg text-status-info-text border-status-info-border',
  live: 'bg-status-success-bg text-status-success-text border-status-success-border',
  paused: 'bg-silver-100 text-ink-heading border-silver-400',
};

const PRIMARY_LABEL: Partial<Record<NextAction['kind'], string>> = {
  retryChannelSetup: 'Finish default destinations',
  inviteOwner: 'Invite the owner',
  shareOwnerLink: 'Share owner setup link',
  addVehicles: 'Add vehicles in their workspace',
  setAutopilot: 'Open destinations',
  reviewLeads: 'Open their Leads inbox',
  completeHandoff: 'Complete handoff',
};

export function DealershipRecordView({ dealerId, initialTab = 'overview', viewer, onOpenDealerView, onBackToDirectory, onRefreshDealers }: Props) {
  const [tab, setTab] = useState<RecordTab>(initialTab);
  const [record, setRecord] = useState<DealershipRecordDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addRequest, setAddRequest] = useState<{ role: 'DEALER_OWNER'; email?: string; name?: string; nonce: number } | null>(null);
  const [confirmHandoff, setConfirmHandoff] = useState(false);
  const [handoffBusy, setHandoffBusy] = useState(false);
  const [handoffError, setHandoffError] = useState<string | null>(null);
  const [stockBusy, setStockBusy] = useState(false);
  const [primaryBusy, setPrimaryBusy] = useState(false);
  const [activityKey, setActivityKey] = useState(0);
  const { toast, show, dismiss } = useToast();

  const load = useCallback(async () => {
    try {
      setRecord(await fetchAdminDealershipRecord(dealerId));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this dealership.');
    }
  }, [dealerId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setTab(initialTab); }, [initialTab]);

  const refresh = async () => {
    await load();
    setActivityKey(k => k + 1);
    onRefreshDealers?.();
  };

  if (error && !record) {
    return (
      <div className="p-8 space-y-4">
        <Banner variant="error">{error}</Banner>
        <button type="button" onClick={onBackToDirectory} className="px-4 py-2 text-sm font-semibold rounded-md bg-navy-800 text-white">
          ← Back to dealerships
        </button>
      </div>
    );
  }
  if (!record) return <div className="surface-card-operator p-8"><Skeleton rows={8} /></div>;

  const status = lifecycleLabel(record.lifecycleStatus);
  const next = recordNextAction(record);
  const readiness = handoffReadiness(record);
  const activeChannels = record.channels.filter(c => c.status === 'ACTIVE').length;
  const dealerPeopleCount = record.people.filter(p => !p.isInternal).length + record.invitations.length;
  const setupIncomplete = record.onboardingSteps.some(step => step.status !== 'COMPLETE');

  const goTab = (id: RecordTab) => {
    setTab(id);
    window.location.hash = adminDealerHash(dealerId, id === 'overview' ? undefined : id);
  };

  const runPrimary = () => {
    switch (next.kind) {
      case 'retryChannelSetup':
        setPrimaryBusy(true);
        void retryChannelSetup(dealerId)
          .then(result => {
            if (result.status === 'READY') show('Channel setup is complete.');
            else show(result.message ?? 'Channel setup still needs attention. Try again shortly.', 'error');
            return refresh();
          })
          .catch(err => show(err instanceof Error ? err.message : 'Could not retry channel setup.', 'error'))
          .finally(() => setPrimaryBusy(false));
        return;
      case 'inviteOwner':
        setTab('people');
        setAddRequest({
          role: 'DEALER_OWNER',
          email: record.primaryContactEmail ?? undefined,
          name: typeof record.primaryContact?.name === 'string' ? record.primaryContact.name : undefined,
          nonce: Date.now(),
        });
        return;
      case 'shareOwnerLink':
        setTab('people');
        return;
      case 'addVehicles':
        onOpenDealerView(dealerId, 'inventory');
        return;
      case 'setAutopilot':
        goTab('destinations');
        return;
      case 'reviewLeads':
        onOpenDealerView(dealerId, 'leads');
        return;
      case 'completeHandoff':
        setConfirmHandoff(true);
        return;
      default:
        return;
    }
  };

  const doHandoff = async () => {
    setHandoffBusy(true);
    setHandoffError(null);
    try {
      await completeHandoff(dealerId);
      setConfirmHandoff(false);
      show(`Handoff completed for ${record.legalName}.`);
      await refresh();
    } catch (err) {
      setHandoffError(err instanceof Error ? err.message : 'Handoff is not ready yet.');
    } finally {
      setHandoffBusy(false);
    }
  };

  const toggleWaitingForStock = async () => {
    setStockBusy(true);
    try {
      setRecord(await patchAdminDealershipRecord(dealerId, { waitingForStock: !record.waitingForStock }));
      setActivityKey(k => k + 1);
      onRefreshDealers?.();
    } catch (err) {
      show(err instanceof Error ? err.message : 'Could not update the stock status.', 'error');
    } finally {
      setStockBusy(false);
    }
  };

  const tabButton = (id: RecordTab, label: string, count?: number) => (
    <button
      key={id}
      type="button"
      onClick={() => goTab(id)}
      aria-current={tab === id ? 'page' : undefined}
      className={`px-4 py-2.5 text-sm font-semibold border-b-2 whitespace-nowrap transition-colors ${
        tab === id ? 'border-orange-600 text-ink-heading' : 'border-transparent text-ink-muted hover:text-ink-heading'
      }`}
    >
      {label}
      {count !== undefined && <span className="ml-1.5 text-xs font-normal text-ink-muted">{count}</span>}
    </button>
  );

  return (
    <div className="space-y-6">
      <ToastView toast={toast} onDismiss={dismiss} />

      <button type="button" onClick={onBackToDirectory} className="text-sm font-medium text-ink-muted hover:text-ink-heading">
        ← Dealerships
      </button>

      <section className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-navy-800 text-white flex items-center justify-center font-bold text-lg shrink-0 overflow-hidden">
              {record.logoUrl ? <img src={record.logoUrl} alt="" className="w-full h-full object-cover" /> : record.legalName.charAt(0)}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-ink-heading truncate">{record.legalName}</h1>
                <span className={`px-2 py-0.5 rounded-full border text-xs font-semibold ${TONE_CLASS[status.tone]}`}>{status.label}</span>
                <span className="px-2 py-0.5 rounded-full border border-navy-200 bg-navy-50 text-xs font-semibold text-navy-800">{resolveCategorySchema(record.businessCategory).label}</span>
              </div>
              {record.dbaName && record.dbaName !== record.legalName && <p className="text-sm text-ink-muted">Doing business as {record.dbaName}</p>}
              <p className="text-xs text-ink-muted mt-1">
                Internal owner: <span className="text-ink-heading font-medium">{record.internalOwner?.email ?? 'Unassigned'}</span>
                <span aria-hidden="true"> · </span>
                Last activity {relativeTime(record.lastActivityAt)}
              </p>
            </div>
          </div>
          <div className="shrink-0 self-start max-w-xs text-right">
            <button type="button" onClick={() => onOpenDealerView(dealerId)}
              className="px-3 py-1.5 text-sm font-semibold rounded-md border border-silver-300 text-ink-heading hover:bg-silver-50">
              Work as this dealership
            </button>
            <p className="text-[11px] text-ink-muted mt-1 text-left">
              Same screens they see. You can still enter file-transfer details they cannot.
            </p>
          </div>
        </div>

        <PagePrimaryState
          kind={next.kind === 'retryChannelSetup' ? 'attention' : next.kind === 'none' ? 'running' : 'setup'}
          title={next.kind === 'none' ? 'This dealership is ready' : next.label}
          why={
            next.detail
            ?? (next.kind === 'none'
              ? 'No setup work left. Open Destinations if you are helping with a send, or work as this dealership for vehicles and inquiries.'
              : next.owner === 'DEALER'
                ? 'The dealership does this next. You can still work as this dealership to help.'
                : 'This is the next real task for our team.')
          }
          ownerKind={next.owner === 'OUR_TEAM' && next.kind !== 'none' ? 'OUR_TEAM' : undefined}
          actionLabel={
            next.kind === 'none'
              ? 'Open destinations'
              : next.actionable && PRIMARY_LABEL[next.kind]
                ? (primaryBusy ? 'Working…' : PRIMARY_LABEL[next.kind])
                : undefined
          }
          onAction={
            next.kind === 'none'
              ? () => goTab('destinations')
              : next.actionable && PRIMARY_LABEL[next.kind]
                ? runPrimary
                : undefined
          }
        />
      </section>

      <nav className="border-b border-silver-200 flex gap-1 overflow-x-auto" aria-label="Dealership sections">
        {tabButton('overview', 'Overview')}
        {tabButton('destinations', 'Destinations', record.channels.length)}
        {tabButton('people', 'People', dealerPeopleCount)}
        {tabButton('activity', 'Activity')}
      </nav>

      {tab === 'overview' && (
        <div className="space-y-6">
          {setupIncomplete && (
            <section className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white space-y-4">
              <div>
                <h2 className="text-base font-semibold text-ink-heading">Setup</h2>
                <p className="text-sm text-ink-muted">Steps complete themselves when the evidence exists. Nothing here is ticked by hand.</p>
              </div>
              <ol className="space-y-3">
                {record.onboardingSteps.map(step => {
                  const done = step.status === 'COMPLETE';
                  return (
                    <li key={step.key} className="flex items-start gap-3">
                      <span aria-hidden="true"
                        className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-[11px] shrink-0 ${
                          done ? 'bg-status-success-bg border-status-success-border text-status-success-text' : 'border-silver-300 text-transparent'
                        }`}>✓</span>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm ${done ? 'text-ink-muted' : 'text-ink-heading font-medium'}`}>
                          {stepTitle(step.key)}<span className="sr-only">{done ? ' (done)' : ' (not done)'}</span>
                        </p>
                        {!done && step.blockingReason && <p className="text-xs text-ink-muted">{step.blockingReason}</p>}
                        {step.key === 'VEHICLES' && (record.waitingForStock || !done) && (
                          <button type="button" onClick={() => void toggleWaitingForStock()} disabled={stockBusy}
                            className="mt-1 text-xs font-semibold text-navy-700 hover:underline disabled:opacity-40">
                            {record.waitingForStock ? 'They have stock now — clear "waiting for stock"' : 'No stock yet? Mark as waiting for stock'}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
              {!readiness.ready && (
                <div className="rounded-md bg-surface-inset border border-silver-200 px-3 py-2 text-xs text-ink-body">
                  <p className="font-semibold text-ink-heading">Before handoff</p>
                  <ul className="list-disc pl-4 mt-1 space-y-0.5">
                    {readiness.missing.map(item => <li key={item}>{item}</li>)}
                  </ul>
                </div>
              )}
            </section>
          )}

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="surface-card-operator p-5 rounded-xl border border-silver-200 bg-white">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Vehicles</h3>
              <p className="mt-2 text-lg font-semibold text-ink-heading">{record.inventory.total} in stock</p>
              <p className="text-sm text-ink-muted">
                {record.inventory.ready} ready · {record.inventory.needsAttention} need details · {record.inventory.sold} sold
                {record.waitingForStock && ' · waiting for stock'}
              </p>
            </div>
            <button type="button" onClick={() => goTab('destinations')}
              className="surface-card-operator p-5 rounded-xl border border-silver-200 bg-white text-left hover:border-silver-300">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Destinations</h3>
              <p className="mt-2 text-lg font-semibold text-ink-heading">{activeChannels} of {record.channels.length} connected</p>
              <p className="text-sm text-ink-muted">Connected does not mean they already show listings.</p>
              {record.channels.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-ink-body">
                  {record.channels.slice(0, 4).map(channel => (
                    <li key={channel.slug}>{channel.name} · {channel.status === 'ACTIVE' ? 'Connected' : channel.status === 'NEEDS_LOGIN' ? 'Needs a sign-in' : channel.status === 'PAUSED' ? 'Paused' : 'Not connected'}</li>
                  ))}
                </ul>
              )}
            </button>
          </section>

          <details className="surface-card-operator rounded-xl border border-silver-200 bg-white">
            <summary className="px-6 py-4 cursor-pointer text-base font-semibold text-ink-heading">
              Dealership details
              <span className="block text-sm font-normal text-ink-muted">Address, contact, logo, website, and lead notifications.</span>
            </summary>
            <div className="px-6 pb-6">
              <DealershipProfilePanel dealerId={dealerId} mode="admin" onDealersChanged={() => void refresh()} />
            </div>
          </details>
        </div>
      )}

      {tab === 'destinations' && <DealershipDestinationsPanel dealerId={dealerId} />}

      {tab === 'people' && (
        <PeoplePanel
          dealerId={dealerId}
          dealershipName={record.legalName}
          viewer={{ kind: 'internal', userId: viewer.userId, isSiteAdmin: viewer.isSiteAdmin }}
          addRequest={addRequest}
          onChanged={() => void refresh()}
        />
      )}

      {tab === 'activity' && <DealershipActivity dealerId={dealerId} refreshKey={activityKey} />}

      {confirmHandoff && (
        <ConfirmDialog
          title={`Hand ${record.legalName} over to the dealership?`}
          confirmLabel="Complete handoff"
          busy={handoffBusy}
          error={handoffError}
          onConfirm={() => void doHandoff()}
          onCancel={() => { setConfirmHandoff(false); setHandoffError(null); }}
        >
          <p>The owner takes over day-to-day work. Launch is recorded separately from verified publication. The shared inbox has received a marketplace inquiry; this does not certify email, SMS or CRM delivery.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
