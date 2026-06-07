import type { PlatformAccountDetail, AccountUpdatePayload } from '@/lib/types.ts';
import { updateAccount } from '@/lib/api/sdk.ts';
import {
  ACCOUNT_STATE_REGISTRY,
  type AccountStateKey,
} from '@/lib/statusRegistry.ts';
import { Button } from '@/components/ui/Button.tsx';
import { useState } from 'react';

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

  return (
    <div className="space-y-4">
      {err && <div className="text-xs text-status-error-text bg-status-error-bg px-3 py-2 rounded-md border border-status-error-border">{err}</div>}
      <div className="grid grid-cols-1 gap-4">
        <FormField label="Account state">
          <select value={form.state ?? ''} onChange={set('state')} className="field-input">
            {STATE_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </FormField>
        <FormField label="Account ID">
          <input type="text" value={form.accountId ?? ''} onChange={set('accountId')} className="field-input" />
        </FormField>
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-muted mb-1">{label}</label>
      {children}
    </div>
  );
}
