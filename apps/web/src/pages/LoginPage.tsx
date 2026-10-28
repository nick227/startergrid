import { HelpButton } from '@/components/docs/HelpButton.tsx';
import { useState, type FormEvent } from 'react';
import { OperatorAuthError } from '@/lib/api/auth.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { isDevBypassConfigured } from '@/lib/devAuth.ts';
import { operatorCopy } from '@/lib/copy/operator.ts';
import { AuthFrame, AuthHeading, authFieldClass, authLabelClass, authRowClass } from '@/components/operator/AuthFrame.tsx';

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
    <AuthFrame route="login">
      <AuthHeading title={operatorCopy.auth.signInTitle} slug={operatorCopy.auth.signInSubtitle} />

      <form onSubmit={handleSubmit} noValidate className="mt-8 flex w-full flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-lg border border-status-error-border bg-status-error-bg px-3 py-2 text-left text-sm text-status-error-text">
            {error}
          </p>
        )}

        <label className={authRowClass}>
          <span className={authLabelClass}>{operatorCopy.auth.emailLabel}</span>
          <input
            type="email"
            autoComplete="email"
            required
            autoFocus
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={authFieldClass}
            disabled={submitting}
          />
        </label>

        <label className={authRowClass}>
          <span className={authLabelClass}>{operatorCopy.auth.passwordLabel}</span>
          <input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
            className={authFieldClass}
            disabled={submitting}
          />
        </label>

        <p className="pt-1 text-center text-sm text-white/50">
          or <a href="#/signup" className="font-semibold text-orange-500 hover:text-orange-600">create an account</a> instead
        </p>

        <button
          type="submit"
          disabled={submitting || !email.trim() || !password}
          className="btn-primary-operator w-full"
        >
          {submitting ? operatorCopy.auth.signingIn : operatorCopy.auth.signInAction}
        </button>

        {isDevBypassConfigured() && (
          <p className="text-center text-[11px] leading-relaxed text-white/40">
            Dev bypass active via <span className="font-mono">VITE_DEV_OPERATOR_ID</span> — sign in optional for cookie sessions.
          </p>
        )}
      </form>
      <div className="mt-6 text-center"><HelpButton topic="app/team-access" inverted /></div>
    </AuthFrame>
  );
}
