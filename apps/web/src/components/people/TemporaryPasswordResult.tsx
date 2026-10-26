import { useState } from 'react';
import { signInUrlFallback } from '@/lib/welcomeMessage.ts';

/** One-time reveal. The password cannot be retrieved after this view closes. */
export function TemporaryPasswordResult({ email, password, signInUrl }: { email: string; password: string; signInUrl?: string | null }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-3">
      <p className="text-sm text-ink-body">
        Give this to <strong>{email}</strong> directly. It is shown only now, and they will choose their own password when they sign in.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-sm font-semibold bg-surface-inset px-3 py-1.5 rounded border border-silver-200 text-ink-heading select-all">
          {password}
        </span>
        <button type="button"
          onClick={() => { void navigator.clipboard.writeText(password).then(() => { setCopied(true); setTimeout(() => setCopied(false), 2500); }); }}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-navy-900 text-white hover:bg-navy-800">
          {copied ? 'Copied' : 'Copy password'}
        </button>
      </div>
      <p className="text-xs text-ink-muted">Sign-in page: {signInUrl || signInUrlFallback()}</p>
    </div>
  );
}
