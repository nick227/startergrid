import { useEffect, useState } from 'react';
import {
  fetchCategoryItems,
  type CategoryInventoryItemSummary,
} from '@/lib/api/sdk.ts';

type Props = {
  dealerId: string;
  categoryId: string;
  onItemClick?: (itemId: string) => void;
  /** Increment to trigger a refresh (e.g. after creating a new item). */
  refreshKey?: number;
};

function formatPrice(cents: number | null): string {
  if (cents == null || cents === 0) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function lifecycleLabel(item: CategoryInventoryItemSummary): string {
  if (item.removedAt) return 'Removed';
  if (item.soldAt)    return 'Sold';
  return 'Available';
}

function lifecycleCls(item: CategoryInventoryItemSummary): string {
  if (item.removedAt) return 'text-ink-faint';
  if (item.soldAt)    return 'text-blue-600';
  return 'text-green-600';
}

export function CategoryItemsBrowse({ dealerId, categoryId, onItemClick, refreshKey }: Props) {
  const [items, setItems] = useState<CategoryInventoryItemSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCategoryItems(dealerId, { categoryId })
      .then(res => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
      })
      .catch(err => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [dealerId, categoryId, refreshKey]);

  if (loading) {
    return <div className="py-8 text-center text-xs text-ink-muted animate-pulse">Loading inventory…</div>;
  }

  if (error) {
    return <div className="py-4 text-xs text-red-600">{error}</div>;
  }

  if (items.length === 0) {
    return (
      <div className="py-12 text-center space-y-1">
        <p className="text-sm text-ink-muted font-medium">No items yet</p>
        <p className="text-xs text-ink-faint">Use the panel above to add your first item.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-ink-muted font-medium">{total} item{total !== 1 ? 's' : ''}</p>
      <ul className="divide-y divide-silver-100">
        {items.map(item => {
          const title = (item.data['title'] as string | undefined) ?? item.primaryIdentifier ?? item.stockNumber ?? item.id;
          const subtitle = [
            item.data['author'] as string | undefined,
            item.data['format'] as string | undefined,
          ].filter(Boolean).join(' · ');

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onItemClick?.(item.id)}
                className="w-full flex items-center gap-3 px-2 py-3 hover:bg-silver-50 rounded-lg text-left transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-silver-100 border border-silver-200 flex items-center justify-center text-lg shrink-0">
                  📚
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink-body truncate">{title}</p>
                  {subtitle && (
                    <p className="text-[11px] text-ink-muted truncate">{subtitle}</p>
                  )}
                  <p className="text-[11px] text-ink-faint mt-0.5">
                    Stock #{item.stockNumber ?? '—'}
                    {item.primaryIdentifier && <span className="ml-2 font-mono">{item.primaryIdentifier}</span>}
                  </p>
                </div>
                <div className="text-right shrink-0 space-y-1">
                  <p className="text-sm font-semibold text-ink-body">{formatPrice(item.priceCents)}</p>
                  <p className={`text-[10px] font-semibold ${lifecycleCls(item)}`}>
                    {lifecycleLabel(item)}
                  </p>
                </div>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
