import { HelpButton } from '@/components/docs/HelpButton.tsx';
import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { roleLabel } from '@/lib/dealershipLabels.ts';
import { AppHeader } from '@/components/operator/AppHeader.tsx';

type InvitePreview = { email: string; dealershipName: string | null; accessRole: string; accountExists?: boolean; expiresAt: string };

class RequestError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

async function request<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...(body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {}),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new RequestError((result as { error?: string }).error ?? 'Something went wrong.', response.status);
  return result as T;
}

/** Explains a dead invite link in words the invitee can act on. */
export function inviteProblem(status: number): string {
  if (status === 410) return 'This invitation has expired. Ask the person who invited you to send a new link.';
  if (status === 409) return 'This invitation has already been used. Sign in with the password you chose.';
  return 'This invitation link is not valid. It may have been replaced by a newer link. Ask for a new one.';
}

const FIELD = 'block w-full mt-1 px-3 py-2 text-sm border border-silver-300 rounded-md bg-surface-card focus:outline-none focus:ring-2 focus:ring-navy-500/30';

/**
 * First sign-in: either accepting an invitation link (#/invite/:token) or replacing a
 * temporary password before anything else in the app is usable.
 */
export default function AccountSetupPage({ token }: { token?: string }) {
  const { refresh, logout } = useAuth();
  const [invitation, setInvitation] = useState<InvitePreview | null>(null);
  const [linkProblem, setLinkProblem] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!token) return;
    let active = true;
    setInvitation(null);
    setLinkProblem(null);
    request<InvitePreview>('/api/auth/invites/' + encodeURIComponent(token))
      .then(value => { if (active) setInvitation(value); })
      .catch((e: unknown) => { if (active) setLinkProblem(inviteProblem(e instanceof RequestError ? e.status : 404)); });
    return () => { active = false; };
  }, [token]);

  const existingAccount = Boolean(token && invitation?.accountExists);
  const choosingPassword = !existingAccount;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (choosingPassword && password !== confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    try {
      const result = token
        ? await request<{ dealershipId?: string }>('/api/auth/invites/' + encodeURIComponent(token) + '/accept', { password })
        : await request<{ dealershipId?: string }>('/api/auth/change-password', { currentPassword, newPassword: password });
      await refresh();
      window.location.hash = result.dealershipId ? '#/' + result.dealershipId : '#/';
    } catch (err) {
      if (token && err instanceof RequestError && (err.status === 404 || err.status === 409 || err.status === 410)) {
        setLinkProblem(inviteProblem(err.status));
      } else {
        setError(err instanceof Error ? err.message : 'Could not finish setup.');
      }
    } finally {
      setBusy(false);
    }
  };

  const title = !token ? 'Choose your own password'
    : existingAccount ? `Add ${invitation?.dealershipName ?? 'this dealership'} to your account`
    : `Set up your login${invitation?.dealershipName ? ` for ${invitation.dealershipName}` : ''}`;

  return (
    <div className="min-h-screen bg-surface-page">
      <AppHeader publicRoute="login" />
      <main className="flex justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md space-y-5 rounded-xl border border-silver-200 bg-surface-card p-8 shadow-elevation-2">
        <h1 className="text-xl font-bold text-ink-heading">{title}</h1>
        <HelpButton topic="app/team-access" />

        {linkProblem ? (
          <>
            <p role="alert" className="text-sm text-ink-body">{linkProblem}</p>
            <button type="button" onClick={() => { void logout().finally(() => { window.location.hash = '#/'; }); }}
              className="px-4 py-2 text-sm font-semibold rounded-md bg-navy-900 text-white hover:bg-navy-800">
              Go to sign in
            </button>
          </>
        ) : token && !invitation ? (
          <p className="text-sm text-ink-muted">Checking your invitation…</p>
        ) : (
          <>
            {invitation && (
              <p className="text-sm text-ink-body">
                You're joining as <strong>{roleLabel(invitation.accessRole).toLowerCase()}</strong> with <strong>{invitation.email}</strong>.
              </p>
            )}
            <p className="text-sm text-ink-muted">
              {!token ? 'You signed in with a temporary password. Replace it to continue.'
                : existingAccount ? 'You already have a StarterGrid login. Enter its password to accept.'
                : 'Choose a password of at least 8 characters.'}
            </p>

            <form className="space-y-4" onSubmit={submit}>
              {!token && (
                <label className="block text-sm font-medium text-ink-body">Temporary password
                  <input required type="password" autoComplete="current-password" className={FIELD}
                    value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                </label>
              )}
              <label className="block text-sm font-medium text-ink-body">
                {existingAccount ? 'Your current password' : 'New password'}
                <input required minLength={8} maxLength={128} type="password" className={FIELD}
                  autoComplete={existingAccount ? 'current-password' : 'new-password'}
                  value={password} onChange={e => setPassword(e.target.value)} />
              </label>
              {choosingPassword && (
                <label className="block text-sm font-medium text-ink-body">Confirm new password
                  <input required minLength={8} maxLength={128} type="password" autoComplete="new-password" className={FIELD}
                    value={confirm} onChange={e => setConfirm(e.target.value)} />
                </label>
              )}
              {error && <p role="alert" className="rounded-md border border-status-error-border bg-status-error-bg px-3 py-2 text-sm text-status-error-text">{error}</p>}
              <button type="submit" disabled={busy}
                className="w-full rounded-md bg-navy-900 text-white px-4 py-2 text-sm font-semibold hover:bg-navy-800 disabled:opacity-50">
                {busy ? 'Saving…' : token ? (existingAccount ? 'Accept invitation' : 'Create login and continue') : 'Save and continue'}
              </button>
            </form>
            <button type="button" onClick={() => { void logout().finally(() => { window.location.hash = '#/'; }); }}
              className="text-sm text-ink-muted hover:text-ink-heading">
              {token ? 'Cancel' : 'Sign out'}
            </button>
          </>
        )}
      </div>
      </main>
    </div>
  );
}
