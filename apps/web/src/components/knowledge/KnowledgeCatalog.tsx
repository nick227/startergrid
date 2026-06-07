import type { DocCatalogEntry } from '@/lib/docs/types.ts';
import { useDocReader } from '@/components/docs';

type Props = {
  groups: Map<string, DocCatalogEntry[]>;
  emptyMessage?: string;
};

export function KnowledgeCatalog({ groups, emptyMessage = 'No articles match your search.' }: Props) {
  const { openDoc } = useDocReader();

  if (groups.size === 0) {
    return (
      <p className="text-sm text-ink-muted py-12 text-center font-serif">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-10">
      {[...groups.entries()].map(([category, entries]) => (
        <section key={category} aria-labelledby={`kb-cat-${category}`}>
          <h2
            id={`kb-cat-${category}`}
            className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-ink-muted mb-3 pb-2 border-b border-silver-200"
          >
            {category}
          </h2>

          <div className="bg-white rounded-xl border border-silver-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-silver-100 border-b border-silver-200">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted w-[38%]">
                    Title
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted hidden sm:table-cell">
                    Summary
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-ink-muted w-24 text-right hidden md:table-cell">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr
                    key={entry.id}
                    className={`group ${i < entries.length - 1 ? 'border-b border-silver-100' : ''} hover:bg-status-success-bg/40 transition-colors`}
                  >
                    <td className="px-4 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => openDoc(entry.id)}
                        className="text-left text-sm font-semibold text-ink-heading group-hover:text-navy-800 underline-offset-2 hover:underline"
                      >
                        {entry.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 align-top hidden sm:table-cell">
                      <p className="text-sm text-ink-body leading-snug font-serif">{entry.summary}</p>
                    </td>
                    <td className="px-4 py-3 align-top text-right hidden md:table-cell">
                      {entry.updated && (
                        <span className="text-xs text-ink-faint tabular-nums">{entry.updated}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
