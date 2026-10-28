import { HelpButton } from '@/components/docs/HelpButton.tsx';
import { useState, type FormEvent } from 'react';
import { OperatorAuthError, registerOperator } from '@/lib/api/auth.ts';
import { useAuth } from '@/contexts/AuthContext.tsx';
import { billingEnabled } from '@/lib/billing.ts';
import { AuthFrame, AuthHeading, authFieldClass, authLabelClass, authRowClass } from '@/components/operator/AuthFrame.tsx';

export default function RegisterPage() {
  const { refresh } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvc, setCardCvc] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (billingEnabled && (!cardNumber.trim() || !cardExpiry.trim() || !cardCvc.trim())) {
      setError('Card number, expiry, and security code are required.');
      return;
    }
    if (billingEnabled) {
      setError('Card payments are not connected yet.');
      return;
    }
    setSubmitting(true);
    try {
      await registerOperator(email.trim(), password);
      await refresh();
      window.location.hash = '#/';
    } catch (err) {
      setError(err instanceof OperatorAuthError ? err.message : 'Could not create the account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFrame route="signup">
      <AuthHeading title="Create your account" slug="Email and password. Dealership setup is next." />
      <form onSubmit={handleSubmit} noValidate className="mt-8 flex w-full flex-col gap-4">
        {error && (
          <p role="alert" className="rounded-md border border-status-error-border bg-status-error-bg px-3 py-2 text-left text-sm text-status-error-text">
            {error}
          </p>
        )}
        <label className={authRowClass}>
          <span className={authLabelClass}>Email</span>
          <input type="email" autoComplete="email" required autoFocus value={email} onChange={e => setEmail(e.target.value)} className={authFieldClass} disabled={submitting} />
        </label>
        <label className={authRowClass}>
          <span className={authLabelClass}>Password</span>
          <input type="password" autoComplete="new-password" required value={password} onChange={e => setPassword(e.target.value)} className={authFieldClass} disabled={submitting} />
        </label>
        <label className={authRowClass}>
          <span className={authLabelClass}>Confirm password</span>
          <input type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} className={authFieldClass} disabled={submitting} />
        </label>
        {billingEnabled && (
          <>
            <label className={authRowClass}>
              <span className={authLabelClass}>Card number</span>
              <input autoComplete="cc-number" inputMode="numeric" value={cardNumber} onChange={e => setCardNumber(e.target.value)} className={authFieldClass} disabled={submitting} />
            </label>
            <label className={authRowClass}>
              <span className={authLabelClass}>Expiry</span>
              <input autoComplete="cc-exp" placeholder="MM / YY" value={cardExpiry} onChange={e => setCardExpiry(e.target.value)} className={authFieldClass} disabled={submitting} />
            </label>
            <label className={authRowClass}>
              <span className={authLabelClass}>Security code</span>
              <input autoComplete="cc-csc" inputMode="numeric" value={cardCvc} onChange={e => setCardCvc(e.target.value)} className={authFieldClass} disabled={submitting} />
            </label>
          </>
        )}
        <p className="pt-1 text-center text-sm text-white/50">
          or <a href="#/" className="font-semibold text-orange-500 hover:text-orange-600">sign in</a> instead
        </p>
        <button type="submit" disabled={submitting || !email.trim() || !password || !confirm} className="btn-primary-operator w-full">
          {submitting ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <div className="mt-6 text-center"><HelpButton topic="app/getting-started" inverted /></div>
    </AuthFrame>
  );
}
