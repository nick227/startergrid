import type { PlatformAccountDetail, AccountUpdatePayload, ConnectionField } from '@/lib/types.ts';
import { updateAccount, deleteOAuthToken } from '@/lib/api/sdk.ts';
import {
  ACCOUNT_STATE_REGISTRY,
  type AccountStateKey,
} from '@/lib/statusRegistry.ts';
import { Button } from '@/components/ui/Button.tsx';
import { useState } from 'react';
import { useOAuthConnect } from '@/hooks/useOAuthConnect.ts';
import { oauthProviderDisplayName } from '@/lib/platformPresentation.ts';

const STATE_OPTIONS = (Object.keys(ACCOUNT_STATE_REGISTRY) as AccountStateKey[]).map(key => ({
  value: key,
  label: ACCOUNT_STATE_REGISTRY[key].label,
}));

const OWNER_OPTIONS = [
  { value: '', label: '—' },
  { value: 'DEALER', label: 'Dealer' },
  { value: 'OPERATOR', label: 'Operator' },
  { value: 'PLATFORM', label: 'Platform' },
];

type Props = {
  account: PlatformAccountDetail;
  dealerId: string;
  onSaved: () => void;
  onCancel?: () => void;
};

function fieldMeta(
  connectionFields: ConnectionField[] | undefined,
  key: ConnectionField['field'],
  defaultLabel: string
): { label: string; hint?: string; placeholder?: string; helpUrl?: string } {
  return connectionFields?.find(f => f.field === key) ?? { label: defaultLabel };
}

export function AccountEditForm({ account, dealerId, onSaved, onCancel }: Props) {
  const [form, setForm] = useState<AccountUpdatePayload>({
    state: account.state,
    accountId: account.accountId ?? '',
    platformRepName: account.platformRepName ?? '',
    platformRepEmail: account.platformRepEmail ?? '',
    membershipStatus: account.membershipStatus ?? '',
    nextAction: account.nextAction ?? '',
    nextActionOwner: account.nextActionOwner ?? '',
    notes: account.notes ?? '',
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { connecting, connected: justConnected, connect: handleConnect } = useOAuthConnect(dealerId, account.platformSlug, onSaved);
  const [disconnecting, setDisconnecting] = useState(false);
  const [marking, setMarking] = useState(false);

  const set = (field: keyof AccountUpdatePayload) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      await updateAccount(dealerId, account.platformSlug, {
        state: form.state,
        accountId: form.accountId || undefined,
        platformRepName: form.platformRepName || undefined,
        platformRepEmail: form.platformRepEmail || undefined,
        membershipStatus: form.membershipStatus || undefined,
        nextAction: form.nextAction || undefined,
        nextActionOwner: form.nextActionOwner || null,
        notes: form.notes || undefined,
      });
      onSaved();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed');
      setSaving(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    setErr(null);
    try {
      await deleteOAuthToken(dealerId, account.platformSlug);
      onSaved();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Disconnect failed');
      setDisconnecting(false);
    }
  };

  const handleMarkApplied = async () => {
    setMarking(true);
    setErr(null);
    try {
      await updateAccount(dealerId, account.platformSlug, { state: 'PENDING_REVIEW' });
      onSaved();
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : 'Save failed');
      setMarking(false);
    }
  };

  const isOwned = account.integrationClass === 'OWNED';
  const cf = account.connectionFields;

  const accountIdMeta    = fieldMeta(cf, 'accountId',        'Account ID');
  const membershipMeta   = fieldMeta(cf, 'membershipStatus', 'Membership / plan status');
  const repNameMeta      = fieldMeta(cf, 'platformRepName',  'Platform rep name');
  const repEmailMeta     = fieldMeta(cf, 'platformRepEmail', 'Platform rep email');

  return (
    <div className="space-y-4">
      {err && <div className="text-xs text-status-error-text bg-status-error-bg px-3 py-2 rounded-md border border-status-error-border">{err}</div>}
      <div className="grid grid-cols-1 gap-4">

        <FormField label="Account state">
          <select value={form.state ?? ''} onChange={set('state')} className="field-input">
            {STATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>

        {account.oauthProvider && !isOwned && (
          <div className="rounded-md border border-border-subtle bg-surface-subtle px-3 py-2 flex items-center justify-between gap-3">
            <span className="text-xs text-ink-muted">
              {account.oauthConnected
                ? `Connected via ${oauthProviderDisplayName(account.oauthProvider)}`
                : `Login via ${oauthProviderDisplayName(account.oauthProvider)}`}
            </span>
            {account.oauthConnected ? (
              <Button
                variant="ghost"
                size="sm"
                loading={disconnecting}
                onClick={() => void handleDisconnect()}
              >
                Disconnect
              </Button>
            ) : (
              <Button
                variant={justConnected ? 'ghost' : 'primary'}
                size="sm"
                loading={connecting}
                disabled={justConnected}
                onClick={() => void handleConnect()}
              >
                {justConnected ? 'Connected ✓' : account.oauthExpired ? 'Re-connect' : 'Connect'}
              </Button>
            )}
          </div>
        )}

        {isOwned ? (
          <p className="text-xs text-ink-faint italic">Owned channel — no external account setup required.</p>
        ) : (
          <>
            {account.partnerSignup && account.state === 'ACCOUNT_NEEDED' && (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2.5 space-y-2">
                <p className="text-xs font-semibold text-blue-800">Partner signup required</p>
                <p className="text-xs text-blue-700">{account.partnerSignup.requirements}</p>
                <p className="text-xs text-blue-600">Estimated approval: {account.partnerSignup.estimatedDays}</p>
                <div className="flex items-center gap-3 pt-0.5">
                  <a
                    href={account.partnerSignup.applyUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 text-xs font-bold rounded-md text-white bg-blue-500 hover:bg-blue-600 transition-colors"
                  >
                    Apply →
                  </a>
                  <button
                    type="button"
                    disabled={marking}
                    onClick={() => void handleMarkApplied()}
                    className="text-xs text-blue-700 underline underline-offset-2 hover:text-blue-900 disabled:opacity-50"
                  >
                    {marking ? 'Saving…' : 'Mark as applied'}
                  </button>
                </div>
              </div>
            )}

            {account.partnerSignup && account.state === 'PENDING_REVIEW' && (
              <div className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
                <p className="text-xs text-blue-700">
                  Application submitted · waiting for approval ({account.partnerSignup.estimatedDays})
                </p>
              </div>
            )}

            <FormField
              label={accountIdMeta.label}
              hint={accountIdMeta.hint}
              helpUrl={accountIdMeta.helpUrl}
            >
              <input
                type="text"
                value={form.accountId ?? ''}
                onChange={set('accountId')}
                placeholder={accountIdMeta.placeholder}
                className="field-input"
              />
            </FormField>

            <FormField label={membershipMeta.label} hint={membershipMeta.hint}>
              <input
                type="text"
                value={form.membershipStatus ?? ''}
                onChange={set('membershipStatus')}
                placeholder={membershipMeta.placeholder}
                className="field-input"
              />
            </FormField>

            <FormField label={repNameMeta.label}>
              <input
                type="text"
                value={form.platformRepName ?? ''}
                onChange={set('platformRepName')}
                className="field-input"
              />
            </FormField>

            <FormField label={repEmailMeta.label}>
              <input
                type="email"
                value={form.platformRepEmail ?? ''}
                onChange={set('platformRepEmail')}
                className="field-input"
              />
            </FormField>
          </>
        )}

        <FormField label="Next action">
          <input type="text" value={form.nextAction ?? ''} onChange={set('nextAction')} className="field-input" />
        </FormField>

        <FormField label="Next action owner">
          <select value={form.nextActionOwner ?? ''} onChange={set('nextActionOwner')} className="field-input">
            {OWNER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>

        <FormField label="Notes">
          <textarea value={form.notes ?? ''} onChange={set('notes')} rows={2} className="field-input resize-none" />
        </FormField>

      </div>
      <div className="flex gap-2">
        <Button variant="primary" size="sm" loading={saving} onClick={() => void handleSave()}>Save</Button>
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel} disabled={saving}>Cancel</Button>
        )}
      </div>
    </div>
  );
}

function FormField({
  label,
  hint,
  helpUrl,
  children,
}: {
  label: string;
  hint?: string;
  helpUrl?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-xs font-semibold text-ink-muted">{label}</label>
        {helpUrl && (
          <a
            href={helpUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-ink-faint hover:text-ink underline underline-offset-2"
          >
            Where do I find this? →
          </a>
        )}
      </div>
      {hint && <p className="text-xs text-ink-faint mb-1">{hint}</p>}
      {children}
    </div>
  );
}
