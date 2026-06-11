import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useAuth } from '../../contexts/AuthContext.tsx';
import { FetchError } from '../../lib/api.ts';

export function LoginModal() {
  const { login, loginModalOpen, closeLoginModal } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (loginModalOpen) {
      setError(null);
      emailRef.current?.focus();
    } else {
      setEmail('');
      setPassword('');
      setError(null);
    }
  }, [loginModalOpen]);

  if (!loginModalOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      if (err instanceof FetchError && err.status === 401) {
        setError('Email or password is incorrect.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  function handleBackdropClick(e: React.MouseEvent) {
    if (e.target === e.currentTarget) closeLoginModal();
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="mp-card w-full max-w-sm">
        <div className="flex items-center justify-between border-b border-silver-200 px-5 py-4">
          <h2 id="login-modal-title" className="text-base font-semibold text-ink-heading">
            Sign in to your account
          </h2>
          <button
            type="button"
            onClick={closeLoginModal}
            aria-label="Close sign-in dialog"
            className="mp-focus rounded-md p-1 text-ink-muted hover:text-ink-heading"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="size-5" aria-hidden="true">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-4 px-5 py-5">
          {error && (
            <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <label className="flex flex-col gap-1.5">
            <span className="mp-label">Email</span>
            <input
              ref={emailRef}
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="mp-input"
              disabled={submitting}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="mp-label">Password</span>
            <input
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mp-input"
              disabled={submitting}
            />
          </label>

          <button
            type="submit"
            disabled={submitting || !email.trim() || !password}
            className="mp-btn-primary w-full"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
