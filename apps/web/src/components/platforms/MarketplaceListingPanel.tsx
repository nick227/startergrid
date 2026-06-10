import type { PlatformAccountDetail } from '@/lib/types.ts';
import { marketplaceListingBlockerReason } from '@/lib/platformPanelGuards.ts';

type Props = {
  platformSlug: string;
  account: PlatformAccountDetail | null;
};

export function MarketplaceListingPanel({ account }: Props) {
  const blocker = marketplaceListingBlockerReason(account);

  if (blocker === 'needs_oauth') {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5">
        <p className="text-xs text-amber-800">
          Connect your account via OAuth in the Setup tab to manage marketplace listings.
        </p>
      </div>
    );
  }

  if (blocker === 'needs_setup') {
    return (
      <div className="rounded-md border border-silver-200 bg-surface-subtle px-3 py-2.5 space-y-1">
        <p className="text-xs font-semibold text-ink-body">Account setup required</p>
        <p className="text-xs text-ink-muted">
          Complete account setup in the Setup tab, then listing controls will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold uppercase tracking-wide text-ink-faint">
        Listing lifecycle
      </p>
      <div className="rounded-md border border-silver-200 bg-surface-subtle px-3 py-2.5 space-y-1.5">
        <p className="text-xs text-ink-muted leading-relaxed">
          Listings are managed per vehicle. Open a vehicle record to publish, relist,
          or end a listing on this platform.
        </p>
        <p className="text-xs text-ink-faint">
          Active listings and sync status will appear here once vehicles are published.
        </p>
      </div>
    </div>
  );
}
