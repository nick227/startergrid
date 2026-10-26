import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext.tsx';

async function request(path: string, body?: object) {
  const response = await fetch(path, { credentials: 'include', ...(body ? {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  } : {}) });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error ?? 'Account setup failed.');
  return result;
}
export default function AccountSetupPage({ token }: { token?: string }) {
  const { refresh, logout } = useAuth();
  const [invitation, setInvitation] = useState<{ email: string; dealershipName: string } | null>(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!token) return;
    let active = true;
    setInvitation(null); setError(null);
    request('/api/auth/invites/' + encodeURIComponent(token))
      .then(value => { if (active) setInvitation(value); })
      .catch(e => { if (active) setError(e.message); });
    return () => { active = false; };
  }, [token]);
  return <main className="mx-auto max-w-md p-8 space-y-5">
    <h1 className="text-2xl font-bold">{token ? 'Set up your dealership access' : 'Choose a new password'}</h1>
    {invitation && <p>{invitation.dealershipName} · {invitation.email}</p>}
    <p>{token ? 'Choose a password for a new account. If you already have an account, enter its current password.' :
      'Replace your temporary password before continuing.'}</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    <form className="space-y-4" onSubmit={async e => {
      e.preventDefault(); setBusy(true); setError(null);
      try {
        const result = token
          ? await request('/api/auth/invites/' + encodeURIComponent(token) + '/accept', { password })
          : await request('/api/auth/change-password', { currentPassword, newPassword: password });
        await refresh();
        window.location.hash = result.dealershipId ? '#/' + result.dealershipId : '#/';
      } catch (e) { setError(e instanceof Error ? e.message : 'Unable to finish setup.'); }
      finally { setBusy(false); }
    }}>
      {!token && <label className="block">Temporary or current password
        <input required type="password" autoComplete="current-password" className="block w-full border rounded p-2"
          value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
      </label>}
      <label className="block">{token ? 'Password' : 'New password'}
        <input required minLength={8} maxLength={128} type="password" autoComplete={token ? 'current-password' : 'new-password'}
          className="block w-full border rounded p-2" value={password} onChange={e => setPassword(e.target.value)} />
      </label>
      <button disabled={busy || (!!token && !invitation)} className="rounded bg-navy-900 text-white px-4 py-2 disabled:opacity-50">
        {busy ? 'Saving…' : token ? 'Accept invitation' : 'Save password'}
      </button>
    </form>
    <button onClick={() => { void logout(); }}>Return to sign in</button>
  </main>;
}
