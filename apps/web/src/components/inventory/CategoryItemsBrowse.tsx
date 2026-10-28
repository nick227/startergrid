import { useEffect, useState } from 'react';
import {
  fetchCategoryItems,
  type CategoryInventoryItemSummary,
} from '@/lib/api/sdk.ts';
import { BrowseResultsHeader } from './BrowseResultsHeader.tsx';
import { SearchField } from '@/components/ui';

type Props = {
  dealerId: string;
  categoryId: string;
  onItemClick?: (itemId: string) => void;
  refreshKey?: number;
};

type CategoryMatch = 'title' | 'stock' | 'identifier';

const MATCH_LABEL: Record<CategoryMatch, string> = {
  title: 'Matched title',
  stock: 'Matched stock number',
  identifier: 'Matched identifier',
};

function itemTitle(item: CategoryInventoryItemSummary): string {
  const title = item.data['title'];
  if (typeof title === 'string' && title.trim() !== '') return title;
  return item.primaryIdentifier ?? item.stockNumber ?? item.id;
}

function categoryMatch(item: CategoryInventoryItemSummary, search: string): CategoryMatch | null {
  const q = search.trim().toLowerCase();
  if (!q) return null;
  if (itemTitle(item).toLowerCase().includes(q)) return 'title';
  if ((item.stockNumber ?? '').toLowerCase().includes(q)) return 'stock';
  if ((item.primaryIdentifier ?? '').toLowerCase().includes(q)) return 'identifier';
  return null;
}

function formatPrice(cents: number | null): string {
  if (cents == null || cents === 0) return '—';
  return `$${(cents / 100).toFixed(2)}`;
}

function lifecycleLabel(item: CategoryInventoryItemSummary): string {
  if (item.removedAt) return 'Removed';
  if (item.soldAt) return 'Sold';
  return 'Available';
}

function lifecycleCls(item: CategoryInventoryItemSummary): string {
  if (item.removedAt) return 'text-ink-faint';
  if (item.soldAt)    return 'text-blue-600';
  return 'text-green-600';
}

export function CategoryItemsBrowse({ dealerId, categoryId, onItemClick, refreshKey }: Props) {
  const [items, setItems] = useState<CategoryInventoryItemSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCategoryItems(dealerId, { categoryId })
      .then(res => {
        if (cancelled) return;
        setItems(res.items);
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

  const visible = items.flatMap(item => {
    const match = categoryMatch(item, search);
    if (search.trim() !== '' && !match) return [];
    return [{ item, match }];
  });

  return (
    <div className="space-y-3">
      <BrowseResultsHeader
        query={search}
        count={visible.length}
        browseLabel={`${items.length} item${items.length === 1 ? '' : 's'}`}
        onClear={() => setSearch('')}
      />
      <SearchField
        value={search}
        onChange={setSearch}
        placeholder="Search title, stock, or identifier"
        className="max-w-xl"
      />
      {visible.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-muted">No items match this search.</p>
      ) : (
        <ul className="divide-y divide-silver-100">
          {visible.map(({ item, match }) => {
            const title = itemTitle(item);
            const author = item.data['author'];
            const format = item.data['format'];
            const subtitle = [typeof author === 'string' ? author : '', typeof format === 'string' ? format : ''].filter(Boolean).join(' · ');
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onItemClick?.(item.id)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-3 text-left hover:bg-silver-50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-heading">{title}</p>
                    {subtitle && <p className="truncate text-[11px] text-ink-muted">{subtitle}</p>}
                    <p className="mt-0.5 text-[11px] text-ink-faint">
                      Stock #{item.stockNumber ?? '—'}
                      {item.primaryIdentifier && <span className="ml-2 font-mono">{item.primaryIdentifier}</span>}
                    </p>
                    {match && <p className="text-[11px] font-medium text-navy-800">{MATCH_LABEL[match]}</p>}
                  </div>
                  <div className="shrink-0 space-y-1 text-right">
                    <p className="text-sm font-semibold text-ink-heading">{formatPrice(item.priceCents)}</p>
                    <p className={`text-[10px] font-semibold ${lifecycleCls(item)}`}>{lifecycleLabel(item)}</p>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
