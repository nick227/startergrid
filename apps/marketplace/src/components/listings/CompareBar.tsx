import { useMemo, useSyncExternalStore, useState } from 'react';
import { listingHref } from '../../lib/routes.ts';
import { buildCompareRows } from '../../features/listings/listingCompareFields.ts';
import type { ListingFilterConfig } from '../../features/listings/listingFilterConfig.ts';
import {
  clearCompare,
  getCompareServerSnapshot,
  getCompareSnapshot,
  removeFromCompare,
  subscribeCompare,
  type CompareItem,
  MAX_COMPARE,
} from '../../features/listings/listingCompare.ts';

type Props = {
  categorySlug: string;
  config: ListingFilterConfig;
};

export function CompareBar({ categorySlug, config }: Props) {
  const items = useSyncExternalStore(subscribeCompare, getCompareSnapshot, getCompareServerSnapshot);
  const [open, setOpen] = useState(false);

  if (items.length === 0) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-navy-200 bg-navy-900 text-white shadow-elevation-3">
      {open ? (
        <CompareTable items={items} categorySlug={categorySlug} config={config} onClose={() => setOpen(false)} />
      ) : (
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <span className="flex-1 text-sm font-semibold">
            {items.length} of {MAX_COMPARE} selected for comparison
          </span>
          {items.length >= 2 && (
            <button
              type="button"
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-navy-900 hover:bg-navy-100"
              onClick={() => setOpen(true)}
            >
              Compare ({items.length})
            </button>
          )}
          <button
            type="button"
            className="rounded-lg border border-navy-600 px-4 py-2 text-sm font-semibold hover:bg-navy-800"
            onClick={clearCompare}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}

function CompareTable({
  items,
  categorySlug,
  config,
  onClose,
}: {
  items: CompareItem[];
  categorySlug: string;
  config: ListingFilterConfig;
  onClose: () => void;
}) {
  const rows = useMemo(() => buildCompareRows(config), [config]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold">Comparing {items.length} listings</span>
        <button type="button" className="text-sm text-navy-300 hover:text-white" onClick={onClose}>
          Collapse ↓
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr>
              <th className="w-28 text-left text-xs font-medium text-navy-400" />
              {items.map(item => (
                <th key={item.listingId} className="min-w-40 px-3 text-left">
                  <a href={listingHref(categorySlug, item.listingId)} className="block truncate font-semibold text-white hover:text-navy-200">
                    {item.title}
                  </a>
                  <button
                    type="button"
                    className="mt-0.5 text-xs text-navy-400 hover:text-white"
                    onClick={() => removeFromCompare(item.listingId)}
                  >
                    Remove
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-navy-700">
            {rows.map(row => (
              <tr key={row.label}>
                <td className="py-2 text-xs font-medium text-navy-400">{row.label}</td>
                {items.map(item => (
                  <td key={item.listingId} className="px-3 py-2 tabular-nums text-white">
                    {row.render(item)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          className="rounded-lg border border-navy-600 px-3 py-1.5 text-sm font-semibold hover:bg-navy-800"
          onClick={clearCompare}
        >
          Clear all
        </button>
      </div>
    </div>
  );
}
