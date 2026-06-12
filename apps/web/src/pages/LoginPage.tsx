import { useState, type FormEvent } from 'react';
import { OperatorAuthError } from '@/lib/api/auth.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { isDevBypassConfigured } from '@/lib/devAuth.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      if (err instanceof OperatorAuthError && err.status === 401) {
        setError(operatorCopy.auth.invalidCredentials);
      } else {
        setError(operatorCopy.auth.signInFailed);
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-navy-800 to-navy-700 flex items-center justify-center text-2xl mx-auto mb-4 shadow-chrome">
            📡
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{operatorCopy.auth.signInTitle}</h1>
          <p className="text-ink-faint mt-2 text-sm max-w-sm mx-auto leading-relaxed">
            {operatorCopy.auth.signInSubtitle}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          noValidate
          className="bg-surface-card rounded-xl shadow-elevation-3 border border-silver-200 p-6 space-y-4"
        >
          {error && (
            <p role="alert" className="rounded-lg bg-status-error-bg border border-status-error-border px-3 py-2 text-sm text-status-error-text">
              {error}
            </p>
          )}

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink-body">{operatorCopy.auth.emailLabel}</span>
            <input
              type="email"
              autoComplete="email"
              required
              autoFocus
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="field-input"
              disabled={submitting}
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-xs font-semibold text-ink-body">{operatorCopy.auth.passwordLabel}</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="field-input"
              disabled={submitting}
            />
          </label>

          <button
            type="submit"
            disabled={submitting || !email.trim() || !password}
            className="btn-primary-operator w-full !py-2.5 disabled:opacity-40"
          >
            {submitting ? operatorCopy.auth.signingIn : operatorCopy.auth.signInAction}
          </button>

          <button
            type="button"
            onClick={() => { window.location.assign('#/signup'); }}
            className="w-full rounded-md border border-silver-300 px-3 py-2.5 text-sm font-semibold text-ink-muted transition-colors hover:border-silver-400 hover:text-ink-heading"
          >
            Create dealership profile
          </button>

          {isDevBypassConfigured() && (
            <p className="text-[11px] text-ink-faint text-center leading-relaxed">
              Dev bypass active via <span className="font-mono">VITE_DEV_OPERATOR_ID</span> — sign in optional for cookie sessions.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
