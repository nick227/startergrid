import { useMemo, useState } from 'react';
import {
  filterCatalogEntries,
  groupCatalogByCategory,
  listCatalogEntries,
} from '@/lib/docs/catalog.ts';
import { KnowledgeCatalog } from '@/components/knowledge';
import { SearchField } from '@/components/ui/SearchField.tsx';
import { HELP_TASKS } from '@/lib/helpTasks.ts';

import { useDocReader } from './DocReaderContext.tsx';
import { buildCatalogEntry } from '@/lib/docs/catalog.ts';

export function HelpContent({ onBack, topicId, embedded = false }: { onBack?: () => void; topicId?: string | null; embedded?: boolean }) {
  const [query, setQuery] = useState('');
  const { openDoc } = useDocReader();
  const suggested = topicId ? buildCatalogEntry(topicId) : null;
  const tasks = HELP_TASKS.filter(task => !query.trim() || query.toLowerCase().split(/\s+/).filter(Boolean).every(term => `${task.question} ${task.answer}`.toLowerCase().includes(term)));
  const all = useMemo(() => listCatalogEntries(), []);
  const filtered = useMemo(() => filterCatalogEntries(all, query), [all, query]);
  const regular = useMemo(() => filtered.filter(entry => !entry.advanced), [filtered]);
  const advanced = useMemo(() => filtered.filter(entry => entry.advanced), [filtered]);
  const groups = useMemo(() => groupCatalogByCategory(regular), [regular]);
  const advancedGroups = useMemo(() => groupCatalogByCategory(advanced), [advanced]);

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-ink-muted hover:text-ink-heading mb-4 block"
          >
            ← Back
          </button>
        )}
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-ink-faint mb-2">Help</p>
        {!embedded && <h1 className="text-2xl font-bold text-ink-heading tracking-tight">Help</h1>}
        <p className="text-sm text-ink-body mt-2 max-w-2xl leading-relaxed">
          Find the next step for your task. Opening an article keeps your current work in place.
        </p>
      </header>

      {!query.trim() && suggested && (
        <section className="mb-6 rounded-lg border border-silver-200 bg-white p-4" aria-label="Help for this page">
          <p className="text-xs font-semibold text-ink-muted">Help for this page</p>
          <button type="button" className="mt-1 text-left font-semibold text-navy-800 underline" onClick={() => openDoc(suggested.id)}>{suggested.title}</button>
          <p className="mt-1 text-sm text-ink-body">{suggested.summary}</p>
        </section>
      )}

      <div className="mb-6">
        <label className="block">
          <span className="sr-only">Search help</span>
          <SearchField value={query} onChange={setQuery} placeholder="Search help…" className="field-input w-full max-w-lg" />
        </label>
        <p className="mt-2 text-xs text-ink-muted">{filtered.length} articles{query.trim() ? ` matching “${query.trim()}”` : ''}</p>
      </div>

      {tasks.length > 0 && (
        <ul className="mb-10 space-y-3">
          {tasks.map(task => (
            <li key={task.question} className="rounded-xl border border-silver-200 bg-white px-4 py-3">
              <button type="button" className="text-left text-sm font-semibold text-navy-800 underline underline-offset-2" onClick={() => openDoc(task.docId)}>{task.question}</button>
              <p className="text-sm text-ink-body mt-1 leading-relaxed">{task.answer}</p>
            </li>
          ))}
        </ul>
      )}

      {filtered.length === 0 && tasks.length === 0 && (
        <div className="mb-6 rounded-lg border border-silver-200 bg-white p-4" role="status">
          <p className="font-semibold text-ink-heading">No matching help found</p>
          <p className="mt-1 text-sm text-ink-body">Try a shorter phrase, such as “import”, “invitation”, or “sold”. You can also browse all articles.</p>
          <button type="button" className="mt-3 text-sm font-semibold text-navy-800 underline" onClick={() => setQuery('')}>Clear search and browse help</button>
        </div>
      )}

      {groups.size > 0 && <KnowledgeCatalog groups={groups} />}

      {advanced.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold text-ink-heading">Advanced</h2>
          <p className="text-sm text-ink-muted mt-1 mb-6">
            Connection details and reference material for support staff and technical teams.
          </p>
          <KnowledgeCatalog groups={advancedGroups} />
        </section>
      )}
    </div>
  );
}

