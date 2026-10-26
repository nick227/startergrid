import { useCallback, useEffect, useState } from 'react';
import {
  fetchDealershipPeople,
  patchPersonAccess,
  removePerson,
  replaceInviteLink,
  revokePersonInvite,
  type DealershipInvitation,
  type DealershipPerson,
  type InviteResult,
  type PeopleResponse,
} from '@/lib/api/dealershipRecordApi.ts';
import { inviteStatus, personStatus, roleLabel, type PersonStatus } from '@/lib/dealershipLabels.ts';
import { Skeleton } from '@/components/ui/Skeleton.tsx';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog.tsx';
import { ToastView, useToast } from '@/components/ui/Toast.tsx';
import { AddPersonDialog } from './AddPersonDialog.tsx';
import { InviteLinkResult } from './InviteLinkResult.tsx';
import { TemporaryPasswordResult } from './TemporaryPasswordResult.tsx';
import { canManagePeople, personActions, type PeopleViewer } from './peoplePermissions.ts';

type Props = {
  dealerId: string;
  dealershipName: string;
  viewer: PeopleViewer;
  /** Opens Add Person straight away, e.g. from the "Invite the owner" next step. */
  addRequest?: { role: 'DEALER_OWNER' | 'DEALER_STAFF'; email?: string; name?: string; nonce: number } | null;
  onChanged?: () => void;
};

type Pending =
  | { kind: 'role'; person: DealershipPerson; to: 'DEALER_OWNER' | 'DEALER_STAFF' }
  | { kind: 'reset'; person: DealershipPerson }
  | { kind: 'remove'; person: DealershipPerson }
  | { kind: 'newLink'; invite: DealershipInvitation }
  | { kind: 'revoke'; invite: DealershipInvitation };

type Reveal =
  | { kind: 'link'; invite: InviteResult; accessRole: string }
  | { kind: 'password'; email: string; password: string };

const TONE: Record<PersonStatus['tone'], string> = {
  ok: 'bg-status-success-bg text-status-success-text border-status-success-border',
  waiting: 'bg-status-warning-bg text-status-warning-text border-status-warning-border',
  problem: 'bg-status-error-bg text-status-error-text border-status-error-border',
  off: 'bg-silver-100 text-ink-muted border-silver-300',
};

function StatusChip({ status }: { status: PersonStatus }) {
  return <span className={`inline-flex px-2 py-0.5 rounded border text-[11px] font-medium ${TONE[status.tone]}`}>{status.label}</span>;
}

/** Shared by the internal dealership record (People) and the dealer's Settings → Team. */
export function PeoplePanel({ dealerId, dealershipName, viewer, addRequest, onChanged }: Props) {
  const [data, setData] = useState<PeopleResponse | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [adding, setAdding] = useState<{ role: 'DEALER_OWNER' | 'DEALER_STAFF'; email?: string; name?: string } | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [pendingBusy, setPendingBusy] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const { toast, show, dismiss } = useToast();

  const load = useCallback(async () => {
    try {
      setData(await fetchDealershipPeople(dealerId));
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load people.');
    }
  }, [dealerId]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (addRequest) setAdding({ role: addRequest.role, email: addRequest.email, name: addRequest.name });
  }, [addRequest]);

  const changed = async () => {
    await load();
    onChanged?.();
  };

  const runPending = async () => {
    if (!pending) return;
    setPendingBusy(true);
    setPendingError(null);
    try {
      if (pending.kind === 'role') {
        await patchPersonAccess(dealerId, pending.person.accountId, { accessRole: pending.to });
        show(`${pending.person.email} is now ${roleLabel(pending.to).toLowerCase()}.`);
      } else if (pending.kind === 'reset') {
        const res = await patchPersonAccess(dealerId, pending.person.accountId, { resetPassword: true });
        if (res.temporaryPassword) setReveal({ kind: 'password', email: pending.person.email, password: res.temporaryPassword });
      } else if (pending.kind === 'remove') {
        await removePerson(dealerId, pending.person.accountId);
        show(`${pending.person.email} no longer has access to ${dealershipName}.`);
      } else if (pending.kind === 'newLink') {
        const invite = await replaceInviteLink(dealerId, pending.invite.id);
        setReveal({ kind: 'link', invite, accessRole: pending.invite.accessRole });
      } else {
        await revokePersonInvite(dealerId, pending.invite.id);
        show(`Invitation for ${pending.invite.email} cancelled.`);
      }
      setPending(null);
      await changed();
    } catch (err) {
      setPendingError(err instanceof Error ? err.message : 'That did not work. Try again.');
    } finally {
      setPendingBusy(false);
    }
  };

  if (loadError && !data) {
    const forbidden = /permission|403/i.test(loadError);
    return (
      <div className="surface-card-operator p-6 rounded-xl border border-silver-200 bg-white">
        <p className="text-sm text-ink-body">
          {forbidden ? 'Only owners can see and manage who has access to this dealership.' : loadError}
        </p>
        {!forbidden && (
          <button type="button" onClick={() => void load()} className="mt-3 text-sm font-semibold text-navy-700 hover:underline">Try again</button>
        )}
      </div>
    );
  }
  if (!data) return <div className="surface-card-operator p-6"><Skeleton rows={5} /></div>;

  const manage = canManagePeople(viewer, data.people);
  const dealerPeople = [...data.people].sort((a, b) =>
    Number(a.isInternal) - Number(b.isInternal) || (a.accessRole === 'DEALER_OWNER' ? -1 : 1) - (b.accessRole === 'DEALER_OWNER' ? -1 : 1));

  return (
    <div className="space-y-4">
      <ToastView toast={toast} onDismiss={dismiss} />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-ink-heading">People</h2>
          <p className="text-sm text-ink-muted">Everyone who can sign in to {dealershipName}.</p>
        </div>
        {manage && (
          <button type="button" onClick={() => setAdding({ role: 'DEALER_STAFF' })}
            className="px-3.5 py-1.5 text-sm font-semibold rounded-md bg-navy-900 text-white hover:bg-navy-800 shrink-0">
            Add person
          </button>
        )}
      </div>

      {reveal && (
        <div className="rounded-xl border border-silver-200 bg-surface-inset p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-sm font-semibold text-ink-heading">
              {reveal.kind === 'link' ? 'New setup link' : 'Temporary password'}
            </h3>
            <button type="button" onClick={() => setReveal(null)} aria-label="Close" className="text-ink-muted hover:text-ink-heading">✕</button>
          </div>
          {reveal.kind === 'link'
            ? <InviteLinkResult invite={reveal.invite} dealershipName={dealershipName} accessRole={reveal.accessRole} signInUrl={data.signInUrl} />
            : <TemporaryPasswordResult email={reveal.email} password={reveal.password} signInUrl={data.signInUrl} />}
        </div>
      )}

      <ul className="divide-y divide-silver-200 rounded-xl border border-silver-200 bg-white">
        {dealerPeople.map(person => {
          const actions = personActions(viewer, person, data.people);
          const otherRole = person.accessRole === 'DEALER_OWNER' ? 'DEALER_STAFF' : 'DEALER_OWNER';
          return (
            <li key={person.accountId} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-ink-heading truncate">
                  {person.email}{person.accountId === viewer.userId && <span className="text-ink-muted font-normal"> (you)</span>}
                </p>
                <p className="text-xs text-ink-muted">{roleLabel(person.isInternal ? 'INTERNAL_SUPPORT' : person.accessRole)}</p>
              </div>
              <StatusChip status={personStatus(person)} />
              {manage && (
                <div className="flex flex-wrap gap-3 text-xs font-semibold sm:justify-end sm:w-64">
                  {actions.changeRole && (
                    <button type="button" className="text-navy-700 hover:underline"
                      onClick={() => setPending({ kind: 'role', person, to: otherRole })}>
                      Make {roleLabel(otherRole).toLowerCase()}
                    </button>
                  )}
                  {actions.resetPassword && (
                    <button type="button" className="text-navy-700 hover:underline" onClick={() => setPending({ kind: 'reset', person })}>
                      Reset password
                    </button>
                  )}
                  {actions.remove && (
                    <button type="button" className="text-status-error-text hover:underline" onClick={() => setPending({ kind: 'remove', person })}>
                      Remove
                    </button>
                  )}
                  {!actions.changeRole && !actions.resetPassword && !actions.remove && actions.reason && (
                    <span className="font-normal text-ink-muted">{actions.reason}</span>
                  )}
                </div>
              )}
            </li>
          );
        })}

        {data.invitations.map(invite => (
          <li key={invite.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 bg-surface-inset/40">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-ink-heading truncate">{invite.email}</p>
              <p className="text-xs text-ink-muted">
                {roleLabel(invite.accessRole)} · invited{invite.createdAt ? ` ${new Date(invite.createdAt).toLocaleDateString()}` : ''}
              </p>
            </div>
            <StatusChip status={inviteStatus(invite)} />
            {manage && (
              <div className="flex flex-wrap gap-3 text-xs font-semibold sm:justify-end sm:w-64">
                <button type="button" className="text-navy-700 hover:underline" onClick={() => setPending({ kind: 'newLink', invite })}>
                  Get a new link
                </button>
                <button type="button" className="text-status-error-text hover:underline" onClick={() => setPending({ kind: 'revoke', invite })}>
                  Cancel invitation
                </button>
              </div>
            )}
          </li>
        ))}

        {dealerPeople.length === 0 && data.invitations.length === 0 && (
          <li className="px-4 py-8 text-center text-sm text-ink-muted">Nobody has access yet. Add the owner first.</li>
        )}
      </ul>

      {adding && (
        <AddPersonDialog
          dealerId={dealerId}
          dealershipName={dealershipName}
          signInUrl={data.signInUrl}
          initialRole={adding.role}
          initialEmail={adding.email}
          initialName={adding.name}
          onDone={(didChange) => { setAdding(null); if (didChange) void changed(); }}
        />
      )}

      {pending && (
        <ConfirmDialog
          title={confirmTitle(pending)}
          confirmLabel={confirmLabel(pending)}
          tone={pending.kind === 'remove' || pending.kind === 'revoke' ? 'danger' : 'default'}
          busy={pendingBusy}
          error={pendingError}
          onConfirm={() => void runPending()}
          onCancel={() => { setPending(null); setPendingError(null); }}
        >
          <p>{confirmBody(pending, dealershipName)}</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

function confirmTitle(p: Pending): string {
  switch (p.kind) {
    case 'role': return `Make ${p.person.email} ${roleLabel(p.to).toLowerCase()}?`;
    case 'reset': return `Reset the password for ${p.person.email}?`;
    case 'remove': return `Remove ${p.person.email}?`;
    case 'newLink': return `Create a new link for ${p.invite.email}?`;
    case 'revoke': return `Cancel the invitation for ${p.invite.email}?`;
  }
}

function confirmLabel(p: Pending): string {
  switch (p.kind) {
    case 'role': return `Make ${roleLabel(p.to).toLowerCase()}`;
    case 'reset': return 'Reset password';
    case 'remove': return 'Remove';
    case 'newLink': return 'Create new link';
    case 'revoke': return 'Cancel invitation';
  }
}

function confirmBody(p: Pending, dealershipName: string): string {
  switch (p.kind) {
    case 'role': return p.to === 'DEALER_OWNER'
      ? 'Owners can manage people, destinations and Autopilot.'
      : 'Staff can work on vehicles and leads but cannot manage people or destinations.';
    case 'reset': return 'They will be signed out everywhere. You will see a temporary password once; they must replace it when they next sign in.';
    case 'remove': return `They lose access to ${dealershipName}. Their login is kept for any other dealerships.`;
    case 'newLink': return 'The current link stops working immediately.';
    case 'revoke': return 'The link stops working. You can invite them again later.';
  }
}
