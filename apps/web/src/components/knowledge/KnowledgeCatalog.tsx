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
      <p className="text-sm text-slate-500 py-12 text-center font-serif">{emptyMessage}</p>
    );
  }

  return (
    <div className="space-y-10">
      {[...groups.entries()].map(([category, entries]) => (
        <section key={category} aria-labelledby={`kb-cat-${category}`}>
          <h2
            id={`kb-cat-${category}`}
            className="text-xs font-sans font-bold uppercase tracking-[0.2em] text-slate-500 mb-3 pb-2 border-b border-slate-200"
          >
            {category}
          </h2>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-[38%]">
                    Title
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 hidden sm:table-cell">
                    Summary
                  </th>
                  <th className="px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-24 text-right hidden md:table-cell">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, i) => (
                  <tr
                    key={entry.id}
                    className={`group ${i < entries.length - 1 ? 'border-b border-slate-100' : ''} hover:bg-emerald-50/40 transition-colors`}
                  >
                    <td className="px-4 py-3 align-top">
                      <button
                        type="button"
                        onClick={() => openDoc(entry.id)}
                        className="text-left text-sm font-semibold text-slate-900 group-hover:text-emerald-900 underline-offset-2 hover:underline"
                      >
                        {entry.title}
                      </button>
                    </td>
                    <td className="px-4 py-3 align-top hidden sm:table-cell">
                      <p className="text-sm text-slate-600 leading-snug font-serif">{entry.summary}</p>
                    </td>
                    <td className="px-4 py-3 align-top text-right hidden md:table-cell">
                      {entry.updated && (
                        <span className="text-xs text-slate-400 tabular-nums">{entry.updated}</span>
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
