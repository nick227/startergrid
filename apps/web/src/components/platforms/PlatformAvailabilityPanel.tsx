import { useState } from 'react';
import { updateAccount } from '@/lib/api/sdk.ts';
import type { PlatformAccountDetail, PlatformPublishResult } from '@/lib/types.ts';
import { AUTO_MARKETPLACE_SLUG } from '@/lib/marketplaceBrand.ts';
import { AUTO_SYNC_CAPABLE_SLUGS } from '@/lib/platformAvailability.ts';

type Props = {
  dealerId: string;
  platform: PlatformPublishResult;
  account: PlatformAccountDetail | null;
  onRefresh: () => void;
};

export function PlatformAvailabilityPanel({ dealerId, platform, account, onRefresh }: Props) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const siteEnabled = account?.siteEnabled ?? true;
  const dealerEnabled = account?.dealerEnabled ?? false;
  const autoSync = account?.autoSyncReadyInventory ?? false;
  const supportsAutoSync = AUTO_SYNC_CAPABLE_SLUGS.has(platform.platformSlug);

  const patch = async (payload: { dealerEnabled?: boolean; autoSyncReadyInventory?: boolean }) => {
    setSaving(true);
    setError(null);
    try {
      await updateAccount(dealerId, platform.platformSlug, payload);
      onRefresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to update availability');
    } finally {
      setSaving(false);
    }
  };

  if (!siteEnabled) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 space-y-2">
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-amber-900/70">Not available</h2>
        <p className="text-sm text-amber-900/90">
          StarterGrid has this destination turned off for everyone right now. You cannot send vehicles here until it is turned back on.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-5 space-y-4">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint">Use this destination</h2>
      <p className="text-sm text-ink-muted leading-snug">
        Turn it on for this dealership, then finish connecting below. Both are needed before vehicles are sent here.
      </p>

      <label className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1"
          checked={dealerEnabled}
          disabled={saving}
          onChange={e => patch({ dealerEnabled: e.target.checked })}
        />
        <span>
          <span className="block text-sm font-semibold text-ink-heading">Send vehicles here</span>
          <span className="block text-xs text-ink-muted mt-0.5">
            When off, nothing is sent. Your sign-in and details are kept.
          </span>
        </span>
      </label>

      {supportsAutoSync && (
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            className="mt-1"
            checked={autoSync}
            disabled={saving || !dealerEnabled}
            onChange={e => patch({ autoSyncReadyInventory: e.target.checked })}
          />
          <span>
            <span className="block text-sm font-semibold text-ink-heading">Send ready vehicles automatically</span>
            <span className="block text-xs text-ink-muted mt-0.5">
              {platform.platformSlug === AUTO_MARKETPLACE_SLUG
                ? 'When on, ready vehicles are sent here when they change. That send is not a verified-live confirmation.'
                : 'When on, ready vehicle changes are sent without a separate prepare step.'}
            </span>
          </span>
        </label>
      )}

      {error && (
        <p className="text-xs text-status-error-text bg-status-error-bg border border-status-error-border rounded px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}
