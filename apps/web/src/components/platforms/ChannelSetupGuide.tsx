import { useState } from 'react';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';
import { useOAuthConnect } from '@/hooks/useOAuthConnect.ts';
import { updateAccount } from '@/lib/api/sdk.ts';
import type { PlatformAccountDetail } from '@/lib/types.ts';
import {
  fetchChannelSetupPlan,
  type ChannelSetupPlan,
  type SetupField,
  type SetupOwner,
  type SetupStep,
} from '@/lib/api/channelSetupApi.ts';

type Props = {
  dealerId: string;
  channel: string;
  /** Used to keep saved connection details when one field changes; secrets are never resent. */
  account: PlatformAccountDetail | null;
  /** Passed connection check recorded by DealerGrid. */
  connectionVerified: boolean;
  /** Listing outcome for this channel from publish status. */
  listingOutcome: 'live' | 'ready' | 'waiting' | 'blocked';
  onChanged: () => void;
};

/**
 * Plain-language setup checklist from the backend plan. Only the current step has a button;
 * finished steps say whether DealerGrid saw it happen or someone marked it done.
 */
export function ChannelSetupGuide({ dealerId, channel, account, connectionVerified, listingOutcome, onChanged }: Props) {
  const { data, loading, error, reload } = useAsyncQuery(() => fetchChannelSetupPlan(dealerId, channel), [dealerId, channel]);
  const refresh = () => { reload(); onChanged(); };

  if (loading && !data) {
    return <section className="rounded-xl border border-silver-200 bg-white p-5 text-sm text-ink-muted" aria-busy="true">Loading setup steps…</section>;
  }
  if (error || !data) {
    return (
      <section role="alert" className="rounded-xl border border-amber-300 bg-amber-50/60 p-5">
        <p className="text-sm font-semibold text-ink-heading">Setup steps did not load.</p>
        <p className="mt-1 text-xs text-ink-body">{error ?? 'Try again.'} You can still use the connection settings below.</p>
        <button type="button" onClick={reload} className="mt-3 text-sm font-semibold text-navy-700 hover:underline">Try again</button>
      </section>
    );
  }

  const { plan, viewerCanAct } = data;
  if (plan.steps.length === 0) return null; // DealerGrid-owned channels need no setup.
  const current = plan.steps.find(s => s.id === plan.currentStepId) ?? null;

  return (
    <section aria-labelledby="setup-headline" className={`rounded-xl border bg-white p-5 sm:p-6 ${plan.status === 'BLOCKED' ? 'border-amber-300' : 'border-silver-200'}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-ink-muted">Setup</p>
      <h2 id="setup-headline" className="mt-1 text-lg font-bold text-ink-heading">{plan.headline}</h2>
      <Progress plan={plan} />

      {!viewerCanAct && current?.owner === 'DEALERSHIP' && (
        <p className="mt-4 rounded-lg border border-silver-200 bg-silver-50 px-3 py-2 text-xs text-ink-body">
          Your dealership owner finishes the steps marked “You”. You can follow along here.
        </p>
      )}

      <ol className="mt-5 space-y-2">
        {plan.steps.map((step, index) => (
          <StepRow
            key={step.id}
            index={index}
            step={step}
            plan={plan}
            isCurrent={step.id === plan.currentStepId}
            canAct={viewerCanAct}
            dealerId={dealerId}
            account={account}
            onDone={refresh}
          />
        ))}
      </ol>

      {(plan.postingNote || (plan.providerEstimate && plan.status !== 'READY')) && (
        <div className="mt-4 space-y-1 text-xs text-ink-muted">
          {plan.postingNote && <p>{plan.postingNote}</p>}
          {plan.providerEstimate && plan.status !== 'READY' && <p>{plan.name} says approval usually takes {plan.providerEstimate}.</p>}
        </div>
      )}

      <StatusStrip plan={plan} connectionVerified={connectionVerified} listingOutcome={listingOutcome} />
    </section>
  );
}

function Progress({ plan }: { plan: ChannelSetupPlan }) {
  const pct = plan.progress.total ? Math.round((plan.progress.done / plan.progress.total) * 100) : 100;
  return (
    <div className="mt-3">
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-silver-100" role="progressbar" aria-valuemin={0} aria-valuemax={plan.progress.total} aria-valuenow={plan.progress.done} aria-label="Setup progress">
        <div className="h-full rounded-full bg-navy-600 transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1.5 text-xs text-ink-muted">{plan.progress.done} of {plan.progress.total} steps done</p>
    </div>
  );
}

function ownerLabel(owner: SetupOwner, plan: ChannelSetupPlan): string {
  return owner === 'DEALERSHIP' ? 'You' : owner === 'INTERNAL_SUPPORT' ? 'DealerGrid' : plan.name;
}

const MARKER: Record<SetupStep['state'], { icon: string; className: string; label: string }> = {
  DONE: { icon: '✓', className: 'bg-status-success-bg text-status-success-text border-status-success-border', label: 'Done' },
  TODO: { icon: '', className: 'bg-navy-600 text-white border-navy-600', label: 'To do' },
  WAITING: { icon: '', className: 'bg-white text-ink-faint border-silver-300', label: 'Not started' },
  BLOCKED: { icon: '!', className: 'bg-amber-100 text-amber-800 border-amber-300', label: 'Blocked' },
};

function StepRow({ step, index, plan, isCurrent, canAct, dealerId, account, onDone }: {
  step: SetupStep; index: number; plan: ChannelSetupPlan; isCurrent: boolean; canAct: boolean;
  dealerId: string; account: PlatformAccountDetail | null; onDone: () => void;
}) {
  const marker = MARKER[step.state];
  const waitingOnOthers = isCurrent && step.owner !== 'DEALERSHIP';
  return (
    <li className={`rounded-lg border px-3 py-3 sm:px-4 ${isCurrent ? 'border-navy-200 bg-navy-50/40' : 'border-transparent'}`} aria-current={isCurrent ? 'step' : undefined}>
      <div className="flex items-start gap-3">
        <span aria-label={marker.label} className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${marker.className}`}>
          {marker.icon || index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className={`text-sm font-semibold ${step.state === 'DONE' ? 'text-ink-muted' : 'text-ink-heading'}`}>{step.title}</span>
            <span className="rounded border border-silver-200 bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-ink-muted">
              {ownerLabel(step.owner, plan)}
            </span>
            {step.doneBasis === 'REPORTED' && (
              <span className="text-[11px] text-ink-faint" title="DealerGrid has not confirmed this itself.">Marked done, not confirmed</span>
            )}
          </div>
          {isCurrent && <p className="mt-1 text-sm text-ink-body">{step.instruction}</p>}
          {waitingOnOthers && step.action.kind === 'NONE' && (
            <p className="mt-1 text-xs text-ink-muted">Nothing for you to do right now.</p>
          )}
          {isCurrent && (
            <StepAction step={step} plan={plan} canAct={canAct || step.owner !== 'DEALERSHIP'} dealerId={dealerId} account={account} onDone={onDone} />
          )}
        </div>
      </div>
    </li>
  );
}

function StepAction({ step, plan, canAct, dealerId, account, onDone }: {
  step: SetupStep; plan: ChannelSetupPlan; canAct: boolean; dealerId: string; account: PlatformAccountDetail | null; onDone: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { kind, label, url, fields, markDone } = step.action;
  if (!canAct) return null;

  const run = async (work: () => Promise<unknown>) => {
    setBusy(true);
    setError(null);
    try {
      await work();
      onDone();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'That did not save. Try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 space-y-3">
      {kind === 'ENTER_DETAILS' && (
        <DetailsForm fields={fields} saveLabel={label ?? 'Save'} busy={busy} account={account}
          onSave={payload => run(() => updateAccount(dealerId, plan.channel, payload))} />
      )}
      <div className="flex flex-wrap items-center gap-3">
        {kind === 'CONNECT_ACCOUNT' && <ConnectButton dealerId={dealerId} channel={plan.channel} label={label ?? 'Sign in'} onDone={onDone} />}
        {(kind === 'OPEN_PROVIDER_SITE' || kind === 'CONTACT_SUPPORT') && url && (
          <a href={url} target={kind === 'OPEN_PROVIDER_SITE' ? '_blank' : undefined} rel="noreferrer"
            className={kind === 'OPEN_PROVIDER_SITE' ? 'btn-primary-operator text-sm' : 'text-sm font-semibold text-navy-700 hover:underline'}>
            {label}{kind === 'OPEN_PROVIDER_SITE' && <span aria-hidden="true"> ↗</span>}
          </a>
        )}
        {markDone && (
          <button type="button" disabled={busy} onClick={() => run(() => updateAccount(dealerId, plan.channel, markDone.patch))}
            className="text-sm font-semibold text-navy-700 hover:underline disabled:opacity-50">
            {busy ? 'Saving…' : markDone.label}
          </button>
        )}
      </div>
      {error && <p role="alert" className="text-xs text-status-error-text">{error}</p>}
    </div>
  );
}

function ConnectButton({ dealerId, channel, label, onDone }: { dealerId: string; channel: string; label: string; onDone: () => void }) {
  const { connecting, connected, error, connect } = useOAuthConnect(dealerId, channel, onDone);
  return (
    <span className="flex flex-col gap-1">
      <button type="button" disabled={connecting || connected} onClick={() => void connect()} className="btn-primary-operator text-sm disabled:opacity-60">
        {connected ? 'Signed in ✓' : connecting ? 'Waiting for sign-in…' : label}
      </button>
      {error && <span role="alert" className="text-xs text-status-error-text">{error}</span>}
    </span>
  );
}

function DetailsForm({ fields, saveLabel, busy, account, onSave }: {
  fields: SetupField[]; saveLabel: string; busy: boolean; account: PlatformAccountDetail | null;
  onSave: (payload: { accountId?: string; connectionConfig?: Record<string, unknown> }) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState(false);
  const invalid = (f: SetupField) => {
    const v = (values[f.key] ?? '').trim();
    if (!v) return !f.filled;
    return f.pattern ? !new RegExp(f.pattern).test(v) : false;
  };
  const hasError = fields.some(invalid);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (hasError) return;
    const payload: { accountId?: string; connectionConfig?: Record<string, unknown> } = {};
    const config: Record<string, unknown> = {};
    for (const f of fields) {
      const v = (values[f.key] ?? '').trim();
      if (!v) continue;
      if (f.saveAs === 'accountId') payload.accountId = v; else config[f.key] = v;
    }
    if (Object.keys(config).length) {
      // PATCH replaces connectionConfig, so keep saved non-secret details; secrets are never resent.
      const secretKeys = new Set((account?.connectionFields ?? []).filter(cf => cf.isSecret).map(cf => cf.field));
      const kept = Object.fromEntries(Object.entries(account?.connectionConfig ?? {}).filter(([k]) => !secretKeys.has(k)));
      payload.connectionConfig = { ...kept, ...config };
    }
    onSave(payload);
  };

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      {fields.map(f => {
        const showError = touched && invalid(f);
        const id = `setup-field-${f.key}`;
        return (
          <div key={f.key}>
            <label htmlFor={id} className="block text-xs font-semibold text-ink-heading">{f.label}</label>
            <input id={id} className="field-input mt-1 w-full max-w-sm text-sm" value={values[f.key] ?? ''}
              placeholder={f.filled ? 'Saved. Type to replace.' : f.placeholder ?? ''}
              aria-invalid={showError} aria-describedby={`${id}-help`}
              onChange={e => setValues(v => ({ ...v, [f.key]: e.target.value }))} />
            <p id={`${id}-help`} className={`mt-1 text-[11px] ${showError ? 'text-status-error-text' : 'text-ink-faint'}`}>
              {showError ? (f.validationHint ?? `Enter your ${f.label}.`) : f.hint}
            </p>
          </div>
        );
      })}
      <button type="submit" disabled={busy} className="btn-primary-operator text-sm disabled:opacity-60">
        {busy ? 'Saving…' : saveLabel}
      </button>
    </form>
  );
}

/** Three separate facts: setup progress, a verified connection, and listing outcome. */
// No external channel reports listings back here yet, so "sent" is never shown as live.
const LISTING_LABEL: Record<Props['listingOutcome'], string> = {
  live: 'Sent; not confirmed live',
  ready: 'Scheduled to send',
  waiting: 'Not sent yet',
  blocked: 'Blocked',
};

function StatusStrip({ plan, connectionVerified, listingOutcome }: { plan: ChannelSetupPlan; connectionVerified: boolean; listingOutcome: Props['listingOutcome'] }) {
  const reported = plan.steps.some(s => s.doneBasis === 'REPORTED');
  const listingStatus = plan.status !== 'READY' && listingOutcome !== 'live' ? 'Starts after setup' : LISTING_LABEL[listingOutcome];
  const items = [
    { label: 'Setup', value: plan.status === 'READY' ? (reported ? 'Done (some steps marked by your team)' : 'Done') : `${plan.progress.done} of ${plan.progress.total} done` },
    { label: 'Connection', value: connectionVerified ? 'Checked by DealerGrid' : 'Not checked yet' },
    { label: 'Listings', value: listingStatus },
  ];
  return (
    <dl className="mt-5 grid grid-cols-1 gap-3 border-t border-silver-100 pt-4 sm:grid-cols-3">
      {items.map(i => (
        <div key={i.label}>
          <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-faint">{i.label}</dt>
          <dd className="mt-0.5 text-xs font-semibold text-ink-body">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}
