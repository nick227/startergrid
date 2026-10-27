import { adminPlatformHash } from '@/lib/routes.ts';
import { groupDestinationSupport, type DestinationSupportTone } from '@/lib/destinationSupport.ts';

export type DestinationSupportRow = {
  slug: string;
  name: string;
  tone: DestinationSupportTone;
  status: string;
  dealersUsing: number;
  offered: boolean;
};

const GROUP_COPY: Array<{ tone: DestinationSupportTone; title: string }> = [
  { tone: 'attention', title: 'Needs attention' },
  { tone: 'offered', title: 'Offered to dealerships' },
  { tone: 'hidden', title: 'Hidden from dealerships' },
];

type Props = {
  rows: DestinationSupportRow[];
  search: string;
  onSearch: (value: string) => void;
  showingAllCategories: boolean;
  onToggleCategories: () => void;
  onCheckCredentials: () => void;
  checking: boolean;
  savingSlug: string | null;
  onToggleOffered: (slug: string, next: boolean) => void;
  onShowTable: () => void;
};

export function AdminDestinationsList({
  rows,
  search,
  onSearch,
  showingAllCategories,
  onToggleCategories,
  onCheckCredentials,
  checking,
  savingSlug,
  onToggleOffered,
  onShowTable,
}: Props) {
  const groups = groupDestinationSupport(rows);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Search destinations…"
          className="w-56 rounded-md border border-silver-300 px-3 py-1.5 text-sm"
        />
        <button type="button" onClick={onToggleCategories} className="text-sm font-medium text-navy-700 hover:underline">
          {showingAllCategories ? 'Show automotive' : 'Show all destinations'}
        </button>
        <div className="ml-auto flex items-center gap-2">
          <button type="button" onClick={onShowTable} className="text-sm text-ink-muted hover:text-ink-heading">
            Technical table
          </button>
          <button
            type="button"
            onClick={onCheckCredentials}
            disabled={checking}
            className="px-3 py-1.5 text-xs font-semibold bg-navy-800 hover:bg-navy-700 text-silver-100 rounded-md disabled:opacity-40"
          >
            {checking ? 'Checking…' : 'Check shared credentials'}
          </button>
        </div>
      </div>

      {GROUP_COPY.map(group => {
        const list = groups[group.tone];
        if (list.length === 0 && group.tone !== 'attention') return null;
        return (
          <section key={group.tone} className="space-y-2">
            <h2 className="text-sm font-bold text-ink-heading">
              {group.title}
              {list.length > 0 ? ` (${list.length})` : ''}
            </h2>
            {list.length === 0 ? (
              <p className="text-sm text-ink-muted">Nothing needs attention.</p>
            ) : (
              <ul className="divide-y divide-silver-200 rounded-xl border border-silver-200 bg-white">
                {list.map(row => (
                  <li key={row.slug} className="flex flex-wrap items-center gap-3 px-4 py-3">
                    <div className="min-w-0 flex-1">
                      <a href={adminPlatformHash(row.slug)} className="font-semibold text-navy-800 hover:underline">
                        {row.name}
                      </a>
                      <p className="text-sm text-ink-muted">{row.status}</p>
                    </div>
                    <p className="text-xs text-ink-faint">
                      {row.dealersUsing} dealership{row.dealersUsing === 1 ? '' : 's'}
                    </p>
                    <label className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-heading">
                      <input
                        type="checkbox"
                        checked={row.offered}
                        disabled={Boolean(savingSlug)}
                        onChange={e => onToggleOffered(row.slug, e.target.checked)}
                      />
                      {row.offered ? 'On' : 'Off'}
                    </label>
                  </li>
                ))}
              </ul>
            )}
          </section>
        );
      })}
    </div>
  );
}
