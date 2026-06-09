import { useState } from 'react';
import type { SocialPageSummary } from '@/lib/types.ts';
import { fetchSocialPages, selectSocialPage } from '@/lib/api/sdk.ts';
import { useAsyncQuery } from '@/hooks/useAsyncQuery.ts';

type Props = {
  dealerId: string;
  platformSlug: string;
  platformName: string;
  onPageSelected?: () => void;
};

export function SocialPageSelector({ dealerId, platformSlug, platformName, onPageSelected }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const { data, loading, error } = useAsyncQuery(
    () => fetchSocialPages(dealerId, platformSlug),
    [dealerId, platformSlug, tick],
  );

  const handleSync = async () => {
    setSyncing(true);
    setSyncError(null);
    try {
      await fetchSocialPages(dealerId, platformSlug);
      setTick(t => t + 1);
    } catch (e) {
      setSyncError(e instanceof Error ? e.message : 'Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleSelect = async (page: SocialPageSummary) => {
    setSelecting(page.pageId);
    try {
      await selectSocialPage(dealerId, platformSlug, page.pageId);
      setTick(t => t + 1);
      onPageSelected?.();
    } catch {
      // ignore — reload will reflect DB state
    } finally {
      setSelecting(null);
    }
  };

  if (loading) return <p className="text-xs text-ink-faint py-3">Loading pages…</p>;

  const pages = data?.pages ?? [];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-ink-heading">
          {platformName} pages
        </p>
        <button
          type="button"
          onClick={() => void handleSync()}
          disabled={syncing}
          className="text-xs font-semibold text-orange-600 hover:underline disabled:opacity-50"
        >
          {syncing ? 'Syncing…' : 'Sync from platform'}
        </button>
      </div>

      {error && <p className="text-xs text-status-error-text">{error}</p>}
      {syncError && <p className="text-xs text-status-error-text">{syncError}</p>}

      {pages.length === 0 ? (
        <div className="rounded-lg border border-silver-200 bg-silver-50 p-4 text-center">
          <p className="text-xs text-ink-muted">No pages found.</p>
          <p className="text-[11px] text-ink-faint mt-1">
            Click &ldquo;Sync from platform&rdquo; to fetch your connected pages.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-silver-100 rounded-lg border border-silver-200 overflow-hidden">
          {pages.map(page => (
            <div
              key={page.pageId}
              className={`flex items-center gap-3 p-3 transition-colors ${
                page.isSelected ? 'bg-navy-50' : 'bg-white hover:bg-silver-50'
              }`}
            >
              {page.pictureUrl ? (
                <img src={page.pictureUrl} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-silver-200 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-ink-heading truncate">{page.name}</p>
                {page.category && (
                  <p className="text-[11px] text-ink-faint truncate">{page.category}</p>
                )}
              </div>
              {page.isSelected ? (
                <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold bg-navy-100 text-navy-700 border border-navy-200">
                  Selected
                </span>
              ) : (
                <button
                  type="button"
                  disabled={selecting === page.pageId}
                  onClick={() => void handleSelect(page)}
                  className="shrink-0 px-2 py-1 text-[11px] font-semibold rounded-md bg-navy-600 text-white hover:bg-navy-700 disabled:opacity-50"
                >
                  {selecting === page.pageId ? '…' : 'Select'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
