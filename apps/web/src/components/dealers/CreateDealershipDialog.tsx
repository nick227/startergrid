import { useState, type FormEvent } from 'react';
import { BUSINESS_CATEGORY_IDS, resolveCategorySchema } from '@auto-dealer/category-schemas';
import { createDealershipRecord, DuplicateDealershipError, type ChannelSetupResult, type InviteResult } from '@/lib/api/dealershipRecordApi.ts';
import { InviteLinkResult } from '@/components/people/InviteLinkResult.tsx';

const FIELD = 'w-full px-3 py-2 text-sm border border-silver-300 rounded-md bg-surface-card focus:outline-none focus:ring-2 focus:ring-navy-500/30';

type Props = {
  onClose: () => void;
  onOpenDealership: (dealerId: string) => void;
  onCreated?: () => void;
};

/**
 * Creation from essentials only. The dealership and the owner's invitation are created together;
 * address, branding, inventory and destinations are completed in setup.
 */
export function CreateDealershipDialog({ onClose, onOpenDealership, onCreated }: Props) {
  const [legalName, setLegalName] = useState('');
  const [category, setCategory] = useState<string>('AUTOMOTIVE');
  const [ownerName, setOwnerName] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ dealerId: string; legalName: string; invite: InviteResult | null; channelSetup: ChannelSetupResult } | null>(null);
  const [existingId, setExistingId] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setExistingId(null);
    try {
      const result = await createDealershipRecord({ legalName, businessCategory: category, ownerName, ownerEmail });
      setCreated(result);
      onCreated?.();
    } catch (err) {
      if (err instanceof DuplicateDealershipError) setExistingId(err.existingDealershipId);
      setError(err instanceof DuplicateDealershipError
        ? 'This dealership already exists, so nothing new was created.'
        : err instanceof Error ? err.message : 'Could not create the dealership.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/60 p-4">
      <div role="dialog" aria-modal="true" aria-labelledby="create-dealership-title"
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-silver-200 bg-surface-card p-6 shadow-elevation-3 space-y-5">
        {created ? (
          <>
            <div>
              <h2 id="create-dealership-title" className="text-lg font-semibold text-ink-heading">{created.legalName} is set up</h2>
              <p className="text-sm text-ink-muted mt-1">Next, get the owner signed in. The rest of setup is on the dealership page.</p>
            </div>
            {created.channelSetup.status === 'NEEDS_ATTENTION' && (
              <p role="alert" className="rounded-md border border-status-warning-border bg-status-warning-bg px-3 py-2 text-sm text-status-warning-text">
                The dealership and invitation were saved, but default channel setup did not finish.
                Open the dealership and choose Finish default destinations; it is safe to repeat.
              </p>
            )}
            {created.invite && (
              <InviteLinkResult invite={created.invite} dealershipName={created.legalName} accessRole="DEALER_OWNER" name={ownerName} />
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-3 py-1.5 text-sm font-medium rounded-md text-ink-muted hover:bg-silver-100">Close</button>
              <button type="button" onClick={() => onOpenDealership(created.dealerId)}
                className="px-4 py-1.5 text-sm font-semibold rounded-md bg-navy-900 text-white hover:bg-navy-800">
                Open dealership
              </button>
            </div>
          </>
        ) : (
          <form onSubmit={submit} className="space-y-5">
            <div>
              <h2 id="create-dealership-title" className="text-lg font-semibold text-ink-heading">Add a dealership</h2>
              <p className="text-sm text-ink-muted mt-1">Just the essentials. Address, logo, inventory, and destinations come later in setup.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-xs font-semibold text-ink-body">Dealership name</span>
                <input required autoFocus value={legalName} onChange={e => setLegalName(e.target.value)} className={FIELD} />
              </label>
              <label className="block space-y-1 sm:col-span-2">
                <span className="text-xs font-semibold text-ink-body">What they sell</span>
                <select value={category} onChange={e => setCategory(e.target.value)} className={FIELD}>
                  {BUSINESS_CATEGORY_IDS.map(id => <option key={id} value={id}>{resolveCategorySchema(id).label}</option>)}
                </select>
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-ink-body">Owner name <span className="font-normal text-ink-muted">(optional)</span></span>
                <input value={ownerName} onChange={e => setOwnerName(e.target.value)} className={FIELD} />
              </label>
              <label className="block space-y-1">
                <span className="text-xs font-semibold text-ink-body">Owner email</span>
                <input type="email" required value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)} className={FIELD} />
              </label>
            </div>
            <p className="text-xs text-ink-muted">You'll get a secure setup link for the owner as soon as the dealership is created.</p>
            {error && (
              <div role="alert" className="rounded-md border border-status-error-border bg-status-error-bg px-3 py-2 text-sm text-status-error-text space-y-1">
                <p>{error}</p>
                {existingId && (
                  <button type="button" onClick={() => onOpenDealership(existingId)} className="font-semibold underline">
                    Open the existing dealership
                  </button>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} disabled={busy} className="px-3 py-1.5 text-sm font-medium rounded-md text-ink-muted hover:bg-silver-100">Cancel</button>
              <button type="submit" disabled={busy}
                className="px-4 py-1.5 text-sm font-semibold rounded-md bg-navy-900 text-white hover:bg-navy-800 disabled:opacity-40">
                {busy ? 'Creating…' : 'Create dealership'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
