import { useCallback, useEffect, useRef, useState } from 'react';
import {
  completeHandoff,
  fetchAdminDealershipRecord,
  patchAdminDealershipRecord,
  type DealershipRecordDetail,
} from '@/lib/api/dealershipRecordApi.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { Banner } from '@/components/ui';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog.tsx';
import { ToastView, useToast } from '@/components/ui/Toast.tsx';
import { DealershipAutopilot } from '@/components/guidance/DealershipAutopilot.tsx';
import { PeoplePanel } from '@/components/people/PeoplePanel.tsx';
import { DealershipProfilePanel } from './DealershipProfilePanel.tsx';
import { DealershipActivity } from './DealershipActivity.tsx';
import { lifecycleLabel, relativeTime, stepTitle, type LifecycleTone } from '@/lib/dealershipLabels.ts';
import { handoffReadiness, recordNextAction, type NextAction } from '@/lib/dealershipNextStep.ts';
import { ownerLabel } from '@/lib/taskOwnership.ts';

export type RecordTab = 'overview' | 'people' | 'activity';

/** Maps older deep links (#/admin/dealers/:id/setup, /channels, /vehicles…) onto the three tabs. */
export function recordTabFromRoute(page: string | null | undefined): RecordTab {
  if (page === 'people') return 'people';
  if (page === 'activity') return 'activity';
  return 'overview';
}

type Props = {
  dealerId: string;
  initialTab?: RecordTab;
  viewer: { userId?: string | null; isSiteAdmin: boolean };
  onOpenDealerView: (dealerId: string, page?: 'inventory') => void;
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
  inviteOwner: 'Invite the owner',
  shareOwnerLink: 'Share the link again',
  addVehicles: 'Open dealer view: Vehicles',
  setAutopilot: 'Record Autopilot decision',
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
  const [activityKey, setActivityKey] = useState(0);
  const autopilotRef = useRef<HTMLDivElement>(null);
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

  const runPrimary = () => {
    switch (next.kind) {
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
        setTab('overview');
        requestAnimationFrame(() => autopilotRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }));
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
      show(`${record.legalName} is live.`);
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
      onClick={() => setTab(id)}
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
              </div>
              {record.dbaName && record.dbaName !== record.legalName && <p className="text-sm text-ink-muted">Doing business as {record.dbaName}</p>}
              <p className="text-xs text-ink-muted mt-1">
                Internal owner: <span className="text-ink-heading font-medium">{record.internalOwner?.email ?? 'Unassigned'}</span>
                <span aria-hidden="true"> · </span>
                Last activity {relativeTime(record.lastActivityAt)}
              </p>
            </div>
          </div>
          <button type="button" onClick={() => onOpenDealerView(dealerId)}
            className="px-3 py-1.5 text-sm font-semibold rounded-md border border-silver-300 text-ink-heading hover:bg-silver-50 shrink-0 self-start">
            Open dealer view ↗
          </button>
        </div>

        <div className="pt-4 border-t border-silver-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm text-ink-body">
              Next: <span className="font-semibold text-ink-heading">{next.label}</span>
              {next.kind !== 'none' && (
                <span className="ml-2 inline-flex px-1.5 py-0.5 rounded border text-[11px] font-medium bg-silver-50 border-silver-200 text-ink-body">
                  {ownerLabel(next.owner, next.owner === 'OUR_TEAM' ? record.internalOwner?.email : null)}
                </span>
              )}
            </p>
            {next.detail && <p className="text-xs text-ink-muted mt-1">{next.detail}</p>}
          </div>
          {next.actionable && PRIMARY_LABEL[next.kind] && (
            <button type="button" onClick={runPrimary} className="btn-primary-operator text-sm shrink-0">
              {PRIMARY_LABEL[next.kind]}
            </button>
          )}
        </div>
      </section>

      <nav className="border-b border-silver-200 flex gap-1 overflow-x-auto" aria-label="Dealership sections">
        {tabButton('overview', 'Overview')}
        {tabButton('people', 'People', dealerPeopleCount)}
        {tabButton('activity', 'Activity')}
      </nav>

      {tab === 'overview' && (
        <div className="space-y-6">
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
            {record.lifecycleStatus !== 'ACTIVE' && !readiness.ready && (
              <div className="rounded-md bg-surface-inset border border-silver-200 px-3 py-2 text-xs text-ink-body">
                <p className="font-semibold text-ink-heading">Before handoff</p>
                <ul className="list-disc pl-4 mt-1 space-y-0.5">
                  {readiness.missing.map(item => <li key={item}>{item}</li>)}
                </ul>
              </div>
            )}
          </section>

          <div ref={autopilotRef}>
            <DealershipAutopilot
              dealerId={dealerId}
              preference={record.autopilotPreference}
              connectedChannelCount={activeChannels}
              persist={async (preference) => {
                setRecord(await patchAdminDealershipRecord(dealerId, { autopilotPreference: preference }));
                setActivityKey(k => k + 1);
                onRefreshDealers?.();
              }}
            />
          </div>

          <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="surface-card-operator p-5 rounded-xl border border-silver-200 bg-white">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Vehicles</h3>
              <p className="mt-2 text-lg font-semibold text-ink-heading">{record.inventory.total} in stock</p>
              <p className="text-sm text-ink-muted">
                {record.inventory.ready} ready · {record.inventory.needsAttention} need details · {record.inventory.sold} sold
                {record.waitingForStock && ' · waiting for stock'}
              </p>
            </div>
            <div className="surface-card-operator p-5 rounded-xl border border-silver-200 bg-white">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-muted">Destinations</h3>
              <p className="mt-2 text-lg font-semibold text-ink-heading">{activeChannels} of {record.channels.length} connected</p>
              <p className="text-sm text-ink-muted">Connected does not mean listings are live.</p>
              {record.channels.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-ink-body">
                  {record.channels.slice(0, 4).map(channel => (
                    <li key={channel.slug}>{channel.name} · {channel.status === 'ACTIVE' ? 'Connected' : channel.status === 'NEEDS_LOGIN' ? 'Needs a sign-in' : channel.status === 'PAUSED' ? 'Paused' : 'Not connected'}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <details className="surface-card-operator rounded-xl border border-silver-200 bg-white">
            <summary className="px-6 py-4 cursor-pointer text-base font-semibold text-ink-heading">
              Dealership details
              <span className="block text-sm font-normal text-ink-muted">Address, contact, logo and website. Save any time; setup resumes where you left off.</span>
            </summary>
            <div className="px-6 pb-6">
              <DealershipProfilePanel dealerId={dealerId} mode="admin" onDealersChanged={() => void refresh()} />
            </div>
          </details>
        </div>
      )}

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
          <p>The dealership becomes Live and the owner takes over day-to-day work. You can still open it from the directory.</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
