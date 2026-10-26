import { useEffect, useState } from 'react';
import {
  preparePersonInvite,
  createPersonInvite,
  type DealerAccessRole,
  type InviteEmailPreview,
} from '@/lib/api/dealershipRecordApi.ts';

type Props = {
  dealerId: string;
  dealerName: string;
  defaultEmail?: string;
  defaultName?: string;
  defaultRole?: DealerAccessRole;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (result: { email: string; setupUrl?: string }) => void;
};

export function WelcomeEmailModal({
  dealerId,
  dealerName,
  defaultEmail = '',
  defaultName = '',
  defaultRole = 'DEALER_OWNER',
  isOpen,
  onClose,
  onSuccess,
}: Props) {
  const [email, setEmail] = useState(defaultEmail);
  const [name, setName] = useState(defaultName);
  const [accessRole, setAccessRole] = useState<DealerAccessRole>(defaultRole);

  const [preview, setPreview] = useState<InviteEmailPreview | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [sentResult, setSentResult] = useState<{
    email: string;
    setupUrl?: string;
    delivery?: 'EMAIL_SENT' | 'EMAIL_FAILED' | 'LINK_ONLY';
    deliveryError?: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSentResult(null);
      setError(null);
      return;
    }
    setEmail(defaultEmail);
    setName(defaultName);
    setAccessRole(defaultRole);
    void loadPreview(defaultEmail, defaultName, defaultRole);
  }, [isOpen, defaultEmail, defaultName, defaultRole]);

  const loadPreview = async (
    targetEmail: string,
    targetName: string,
    targetRole: DealerAccessRole,
  ) => {
    if (!targetEmail || !targetEmail.includes('@')) {
      // Use fallback preview for demonstration if email not yet typed
      setPreview({
        dealershipName: dealerName,
        recipientEmail: targetEmail || 'owner@dealership.com',
        recipientName: targetName || null,
        accessRole: targetRole,
        roleLabel: targetRole === 'DEALER_OWNER' ? 'Dealer Owner' : 'Dealer Staff',
        supportEmail: 'support@startergrid.com',
        subject: `Set up your StarterGrid account for ${dealerName}`,
        previewBody: `Hello${targetName ? ' ' + targetName : ''},\n\nYou have been invited to manage inventory and syndication for ${dealerName} on StarterGrid as ${targetRole === 'DEALER_OWNER' ? 'Dealer Owner' : 'Dealer Staff'}.\n\nClick the secure link below to set up your password and access your dashboard:\n[Set Up Your Account] (expires in 7 days)\n\nNeed assistance? Contact our onboarding team at support@startergrid.com.`,
      });
      return;
    }

    try {
      setLoadingPreview(true);
      setError(null);
      const res = await preparePersonInvite(dealerId, {
        email: targetEmail.trim(),
        name: targetName.trim() || undefined,
        accessRole: targetRole,
      });
      setPreview(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to prepare email preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setError('Please provide a valid recipient email address');
      return;
    }

    try {
      setSending(true);
      setError(null);
      const res = await createPersonInvite(dealerId, {
        email: email.trim(),
        name: name.trim() || undefined,
        accessRole,
      });

      const delivery = res.delivery ?? res.invite.delivery ?? (
        res.invite.deliveryStatus === 'SENT' ? 'EMAIL_SENT' :
        res.invite.deliveryStatus === 'FAILED' ? 'EMAIL_FAILED' :
        'LINK_ONLY'
      );

      setSentResult({
        email: res.invite.email,
        setupUrl: res.setupUrl,
        delivery,
        deliveryError: res.invite.deliveryError ?? null,
      });

      onSuccess({
        email: res.invite.email,
        setupUrl: res.setupUrl,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send welcome invitation');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/70 p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-white rounded-2xl border border-silver-200 shadow-elevation-3 overflow-hidden flex flex-col my-8">
        {/* Header */}
        <div className="px-6 py-4 bg-navy-900 text-white flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <span>✉️</span>
              <span>Welcome & Invitation Email</span>
            </h3>
            <p className="text-xs text-navy-200 mt-0.5">
              Secure setup link dispatch for {dealerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-navy-300 hover:text-white font-bold text-lg leading-none"
          >
            ✕
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-5 flex-1">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {sentResult ? (
            /* Sent State (Differentiated by real delivery result) */
            <div className="space-y-4">
              {sentResult.delivery === 'EMAIL_SENT' ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-emerald-800 font-bold text-sm">
                    <span>✓</span>
                    <span>Invitation Email Delivered!</span>
                  </div>
                  <p className="text-xs text-emerald-700">
                    The mail server accepted and delivered the invitation email with single-use setup instructions to{' '}
                    <strong>{sentResult.email}</strong>.
                  </p>
                </div>
              ) : sentResult.delivery === 'EMAIL_FAILED' ? (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-red-800 font-bold text-sm">
                    <span>⚠️</span>
                    <span>Email Delivery Failed</span>
                  </div>
                  <p className="text-xs text-red-700 leading-relaxed">
                    Outbound email transmission failed ({sentResult.deliveryError || 'Mail server rejected connection'}). The message was <strong>not</strong> delivered to the recipient's inbox.
                  </p>
                  <p className="text-xs text-red-900 font-semibold">
                    The single-use activation link has been safely generated below. Please share it directly with {sentResult.email}.
                  </p>
                </div>
              ) : (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-blue-800 font-bold text-sm">
                    <span>🔗</span>
                    <span>Direct Activation Link Created</span>
                  </div>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Outbound email transport is not configured for this environment. A secure, single-use activation link was created for{' '}
                    <strong>{sentResult.email}</strong>. Share the link below directly with the recipient.
                  </p>
                </div>
              )}

              {sentResult.setupUrl && (
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-ink-heading">
                    Single-Use Activation Link (Expiring in 7 Days):
                  </label>
                  <div className="p-3 bg-silver-50 border border-silver-200 rounded-lg text-xs font-mono break-all text-ink-body select-all">
                    {sentResult.setupUrl}
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-ink-muted">
                      Share this directly if the recipient is on the phone or in chat.
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (sentResult.setupUrl) {
                          void navigator.clipboard.writeText(sentResult.setupUrl);
                          setCopied(true);
                          setTimeout(() => setCopied(false), 3000);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-bold rounded bg-navy-900 text-white hover:bg-navy-800 transition-colors"
                    >
                      {copied ? '✓ Copied!' : 'Copy Activation Link'}
                    </button>
                  </div>
                </div>
              )}

              <div className="pt-4 border-t border-silver-200 flex justify-end">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-navy-900 text-white hover:bg-navy-800"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            /* Prepare & Preview Form */
            <form onSubmit={handleSend} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink-heading mb-1">
                    Recipient Email <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      void loadPreview(e.target.value, name, accessRole);
                    }}
                    placeholder="dealer@dealership.com"
                    className="w-full px-3 py-2 text-xs border border-silver-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink-heading mb-1">
                    Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      void loadPreview(email, e.target.value, accessRole);
                    }}
                    placeholder="Jordan Smith"
                    className="w-full px-3 py-2 text-xs border border-silver-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink-heading mb-1">
                  Access Level & Role
                </label>
                <select
                  value={accessRole}
                  onChange={(e) => {
                    const role = e.target.value as DealerAccessRole;
                    setAccessRole(role);
                    void loadPreview(email, name, role);
                  }}
                  className="w-full px-3 py-2 text-xs border border-silver-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-600 bg-white"
                >
                  <option value="DEALER_OWNER">Dealer Owner (Full rooftop administration & channels)</option>
                  <option value="DEALER_STAFF">Dealer Staff (Inventory operations & lead handling)</option>
                </select>
              </div>

              {/* Security & Token Guarantee Callout */}
              <div className="p-3 bg-navy-50/70 border border-navy-200 rounded-xl text-xs text-navy-900 space-y-1">
                <div className="font-semibold flex items-center gap-1.5 text-navy-950">
                  <span>🔒</span>
                  <span>Zero Plaintext Passwords</span>
                </div>
                <p className="text-[11px] text-navy-800 leading-relaxed">
                  StarterGrid invitations use secure, single-use activation tokens valid for 7 days.
                  Recipients securely establish their own credentials upon first click. Plaintext passwords are never emailed.
                </p>
              </div>

              {/* Real Email Draft Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-ink-muted">
                  <span className="font-semibold text-ink-heading">Email Message Preview:</span>
                  {loadingPreview && <span className="text-[11px] animate-pulse">Generating preview...</span>}
                </div>
                <div className="border border-silver-300 rounded-xl p-4 bg-silver-50 text-xs space-y-2">
                  <div className="border-b border-silver-200 pb-2 text-[11px] text-ink-muted space-y-0.5">
                    <div><strong>To:</strong> {email || '(Enter recipient email)'}</div>
                    <div><strong>Subject:</strong> {preview?.subject || `Set up your StarterGrid account for ${dealerName}`}</div>
                  </div>
                  <div className="whitespace-pre-line text-ink-body font-sans text-xs leading-relaxed pt-1">
                    {preview?.previewBody || 'Preparing draft...'}
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-silver-200">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={sending}
                  className="px-4 py-2 text-xs font-semibold text-ink-muted hover:bg-silver-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={sending || !email}
                  className="px-5 py-2 text-xs font-bold bg-navy-900 hover:bg-navy-800 text-white rounded-lg shadow-sm disabled:opacity-50 flex items-center gap-2 transition-colors"
                >
                  {sending ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Dispatching Email...</span>
                    </>
                  ) : (
                    <>
                      <span>✉️</span>
                      <span>Send Welcome Email</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
