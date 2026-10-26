import { useState } from 'react';
import type { InviteResult } from '@/lib/api/dealershipRecordApi.ts';
import { deliveryMessage } from '@/lib/dealershipLabels.ts';
import { signInUrlFallback, welcomeMessage } from '@/lib/welcomeMessage.ts';

type Props = {
  invite: InviteResult;
  dealershipName: string;
  accessRole: string;
  name?: string | null;
  signInUrl?: string | null;
};

/** Shown after every invitation or link replacement: the link is the deliverable. */
export function InviteLinkResult({ invite, dealershipName, accessRole, name, signInUrl }: Props) {
  const [copied, setCopied] = useState<'link' | 'message' | null>(null);
  const failed = invite.delivery === 'EMAIL_FAILED';

  const copy = async (what: 'link' | 'message') => {
    const text = what === 'link' ? invite.setupUrl : welcomeMessage({
      dealershipName,
      email: invite.email,
      accessRole,
      setupUrl: invite.setupUrl,
      expiresAt: invite.expiresAt,
      signInUrl: signInUrl || signInUrlFallback(),
      name,
    });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(what);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="space-y-3">
      <p className={`text-sm ${failed ? 'text-status-error-text' : 'text-ink-body'}`} role={failed ? 'alert' : undefined}>
        {deliveryMessage(invite.delivery, invite.email, invite.deliveryError)}
      </p>
      <div className="rounded-md border border-silver-200 bg-surface-inset p-2">
        <p className="font-mono text-[11px] text-ink-body break-all select-all">{invite.setupUrl}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => void copy('link')}
          className="px-3 py-1.5 text-xs font-semibold rounded-md bg-navy-900 text-white hover:bg-navy-800">
          {copied === 'link' ? 'Link copied' : 'Copy link'}
        </button>
        <button type="button" onClick={() => void copy('message')}
          className="px-3 py-1.5 text-xs font-semibold rounded-md border border-silver-300 text-ink-heading hover:bg-silver-50">
          {copied === 'message' ? 'Message copied' : 'Copy welcome message'}
        </button>
      </div>
      <p className="text-xs text-ink-muted">The link works once. Creating a new link cancels this one.</p>
    </div>
  );
}
