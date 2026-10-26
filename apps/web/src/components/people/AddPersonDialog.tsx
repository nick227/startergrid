import { useState, type FormEvent } from 'react';
import {
  createTemporaryLogin,
  invitePerson,
  type DealerAccessRole,
  type InviteResult,
} from '@/lib/api/dealershipRecordApi.ts';
import { ROLE_DESCRIPTION, ROLE_LABEL } from '@/lib/dealershipLabels.ts';
import { InviteLinkResult } from './InviteLinkResult.tsx';
import { TemporaryPasswordResult } from './TemporaryPasswordResult.tsx';

type Props = {
  dealerId: string;
  dealershipName: string;
  signInUrl?: string | null;
  initialRole?: 'DEALER_OWNER' | 'DEALER_STAFF';
  initialEmail?: string;
  initialName?: string;
  onDone: (changed: boolean) => void;
};

const FIELD = 'w-full px-3 py-2 text-sm border border-silver-300 rounded-md bg-surface-card focus:outline-none focus:ring-2 focus:ring-navy-500/30';

type Result =
  | { kind: 'invite'; invite: InviteResult }
  | { kind: 'password'; email: string; password: string };

/** The one Add Person flow. Invitation link by default; temporary password only as an exception. */
export function AddPersonDialog({ dealerId, dealershipName, signInUrl, initialRole = 'DEALER_STAFF', initialEmail = '', initialName = '', onDone }: Props) {
  const [email, setEmail] = useState(initialEmail);
  const [name, setName] = useState(initialName);
  const [role, setRole] = useState<'DEALER_OWNER' | 'DEALER_STAFF'>(initialRole);
  const [useTemporaryPassword, setUseTemporaryPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const payload = { email: email.trim(), accessRole: role as DealerAccessRole, name: name.trim() || undefined };
    try {
      if (useTemporaryPassword) {
        const created = await createTemporaryLogin(dealerId, payload);
        setResult({ kind: 'password', email: created.email, password: created.temporaryPassword });
      } else {
        setResult({ kind: 'invite', invite: await invitePerson(dealerId, payload) });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not add this person.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="add-person-title"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-silver-200 bg-surface-card p-6 shadow-elevation-3 space-y-5">
        {result ? (
          <>
            <h3 id="add-person-title" className="text-base font-semibold text-ink-heading">
              {result.kind === 'invite' ? 'Invitation ready' : 'Temporary password created'}
            </h3>
            {result.kind === 'invite' ? (
              <InviteLinkResult invite={result.invite} dealershipName={dealershipName} accessRole={role} name={name} signInUrl={signInUrl} />
            ) : (
              <TemporaryPasswordResult email={result.email} password={result.password} signInUrl={signInUrl} />
            )}
            <div className="flex justify-end">
              <button type="button" onClick={() => onDone(true)}
                className="px-4 py-1.5 text-sm font-semibold rounded-md bg-navy-900 text-white hover:bg-navy-800">
                Done
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <h3 id="add-person-title" className="text-base font-semibold text-ink-heading">Add a person to {dealershipName}</h3>
              <p className="text-sm text-ink-muted mt-1">They get a secure link to choose their own password.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-xs font-semibold text-ink-body">Email</span>
                <input type="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="name@dealership.com" className={FIELD} />
              </label>
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-xs font-semibold text-ink-body">Name <span className="font-normal text-ink-muted">(optional, used in the welcome message)</span></span>
                <input value={name} onChange={e => setName(e.target.value)} className={FIELD} />
              </label>
            </div>

            <fieldset className="space-y-2">
              <legend className="text-xs font-semibold text-ink-body mb-1">Role</legend>
              {(['DEALER_OWNER', 'DEALER_STAFF'] as const).map(option => (
                <label key={option}
                  className={`flex items-start gap-3 rounded-md border px-3 py-2.5 cursor-pointer ${
                    role === option ? 'border-navy-500 bg-silver-50' : 'border-silver-200'
                  }`}>
                  <input type="radio" name="role" value={option} checked={role === option} onChange={() => setRole(option)} className="mt-1" />
                  <span>
                    <span className="block text-sm font-semibold text-ink-heading">{ROLE_LABEL[option]}</span>
                    <span className="block text-xs text-ink-muted">{ROLE_DESCRIPTION[option]}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <details className="rounded-md border border-silver-200 px-3 py-2" open={useTemporaryPassword}>
              <summary className="text-xs font-semibold text-ink-muted cursor-pointer">Can't use a link?</summary>
              <label className="mt-2 flex items-start gap-2 text-xs text-ink-body">
                <input type="checkbox" checked={useTemporaryPassword} onChange={e => setUseTemporaryPassword(e.target.checked)} className="mt-0.5" />
                <span>
                  Create a temporary password instead. Use this only when you can hand it over in person or by phone:
                  it is shown once, and they must replace it when they first sign in. Only works for a new email.
                </span>
              </label>
            </details>

            {error && (
              <p role="alert" className="rounded-md border border-status-error-border bg-status-error-bg px-3 py-2 text-sm text-status-error-text">{error}</p>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => onDone(false)} disabled={busy}
                className="px-3 py-1.5 text-sm font-medium rounded-md text-ink-muted hover:bg-silver-100">Cancel</button>
              <button type="submit" disabled={busy || !email.trim()}
                className="px-4 py-1.5 text-sm font-semibold rounded-md bg-navy-900 text-white hover:bg-navy-800 disabled:opacity-40">
                {busy ? 'Working…' : useTemporaryPassword ? 'Create temporary password' : 'Create invitation'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
