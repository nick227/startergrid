import { HelpButton } from '@/components/docs/HelpButton.tsx';
import { useState, type FormEvent } from 'react';
import { OperatorAuthError } from '@/lib/api/auth.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { isDevBypassConfigured } from '@/lib/devAuth.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { AppHeader } from '@/components/operator/AppHeader.tsx';

const RETURN_CHANNELS = [
  'Owned storefront',
  'Google catalog ads',
  'Facebook catalog ads',
  'Social posting',
  'Cars.com',
  'Autotrader / Cox',
];

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const title = operatorCopy.auth.signInTitle;
  const subtitle = operatorCopy.auth.signInSubtitle;

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
    <div className="min-h-screen bg-surface-page">
      <AppHeader publicRoute="login" />
      <div className="lg:grid lg:min-h-[calc(100svh-3.5rem)] lg:grid-cols-2">
        <aside className="hidden flex-col justify-between bg-navy-950 px-12 py-16 text-white lg:flex" aria-hidden="true">
          <div className="max-w-md">
            <p className="text-3xl font-bold tracking-tight">{title}</p>
            <p className="mt-3 text-sm leading-relaxed text-silver-300">{subtitle}</p>
          </div>
          <ul className="grid grid-cols-2 gap-px border border-navy-800 bg-navy-800">
            {RETURN_CHANNELS.map(channel => (
              <li key={channel} className="bg-navy-950 px-4 py-5 text-sm font-medium text-silver-100">
                {channel}
              </li>
            ))}
          </ul>
        </aside>

        <main className="flex items-center justify-center px-4 py-10 sm:px-6">
          <div className="w-full max-w-md">
            <h1 className="text-2xl font-bold tracking-tight text-ink-heading lg:sr-only">{title}</h1>
            <p className="mt-2 text-sm leading-relaxed text-ink-muted lg:hidden">{subtitle}</p>

            <form
              onSubmit={handleSubmit}
              noValidate
              className="mt-6 space-y-4 rounded-xl border border-silver-200 bg-surface-card p-6 shadow-elevation-2 lg:mt-0"
            >
              {error && (
                <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg px-3 py-2 text-sm text-status-error-text">
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

              <a
                href="#/signup"
                className="block text-center text-sm font-semibold text-ink-muted hover:text-ink-heading"
              >
                Create a dealership
              </a>

              {isDevBypassConfigured() && (
                <p className="text-center text-[11px] leading-relaxed text-ink-faint">
                  Dev bypass active via <span className="font-mono">VITE_DEV_OPERATOR_ID</span> — sign in optional for cookie sessions.
                </p>
              )}
            </form>
            <div className="mt-4 text-center"><HelpButton topic="app/team-access" /></div>
          </div>
        </main>
      </div>
    </div>
  );
}
