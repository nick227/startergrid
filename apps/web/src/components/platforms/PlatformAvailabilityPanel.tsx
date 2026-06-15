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
        <h2 className="text-[11px] font-bold uppercase tracking-widest text-amber-900/70">Availability</h2>
        <p className="text-sm text-amber-900/90">
          This platform is disabled site-wide by admin. Dealers cannot publish to it until admin re-enables it.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-silver-200 rounded-xl shadow-sm p-5 space-y-4">
      <h2 className="text-[11px] font-bold uppercase tracking-widest text-ink-faint">Availability</h2>
      <p className="text-sm text-ink-muted leading-snug">
        Enable controls whether this dealership posts to the channel. Connection setup (below) is separate—both are required before queue posts go out.
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
          <span className="block text-sm font-semibold text-ink-heading">Enable for this dealership</span>
          <span className="block text-xs text-ink-muted mt-0.5">
            When off, no outbound posts are queued for this channel. Connection settings are preserved.
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
            <span className="block text-sm font-semibold text-ink-heading">Auto-sync ready inventory</span>
            <span className="block text-xs text-ink-muted mt-0.5">
              {platform.platformSlug === AUTO_MARKETPLACE_SLUG
                ? 'When on, READY inventory changes are posted to the marketplace automatically.'
                : 'When on, inventory changes enqueue posts without manual prepare.'}
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
