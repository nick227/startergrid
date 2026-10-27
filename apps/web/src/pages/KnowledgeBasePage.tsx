import { useMemo, useState } from 'react';
import {
  filterCatalogEntries,
  groupCatalogByCategory,
  listCatalogEntries,
} from '@/lib/docs/catalog.ts';
import { KnowledgeCatalog } from '@/components/knowledge';
import { SearchField } from '@/components/ui/SearchField.tsx';
import { OperatorPage } from '@/components/operator';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';
import { HELP_TASKS } from '@/lib/helpTasks.ts';

type StandaloneProps = {
  dealerId?: never;
  nav?: never;
  onBack?: () => void;
};

type OperatorProps = OperatorPageBaseProps & {
  onBack?: never;
};

type Props = StandaloneProps | OperatorProps;

function KnowledgeContent({ onBack }: { onBack?: () => void }) {
  const [query, setQuery] = useState('');
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
        <h1 className="text-2xl font-bold text-ink-heading tracking-tight">How do I…</h1>
        <p className="text-sm text-ink-body mt-2 max-w-2xl leading-relaxed">
          Start with a common dealership question. Longer reference articles are below if you need more detail.
        </p>
      </header>

      {!query.trim() && (
        <ul className="mb-10 space-y-3">
          {HELP_TASKS.map(task => (
            <li key={task.question} className="rounded-xl border border-silver-200 bg-white px-4 py-3">
              <p className="text-sm font-semibold text-ink-heading">{task.question}</p>
              <p className="text-sm text-ink-body mt-1 leading-relaxed">{task.answer}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mb-8">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search titles, subjects, keywords…"
          className="max-w-lg"
        />
        <p className="text-xs text-ink-faint mt-2">
          {filtered.length} of {all.length} articles
          {query.trim() ? ` matching “${query.trim()}”` : ''}
        </p>
      </div>

      <KnowledgeCatalog groups={groups} />

      {advanced.length > 0 && (
        <section className="mt-12">
          <h2 className="text-lg font-bold text-ink-heading">Advanced</h2>
          <p className="text-sm text-ink-muted mt-1 mb-6">
            Specialized technical reference for support and integrators.
          </p>
          <KnowledgeCatalog groups={advancedGroups} />
        </section>
      )}
    </div>
  );
}

export default function KnowledgeBasePage(props: Props) {
  if ('dealerId' in props && props.dealerId && props.nav) {
    const { dealerId, nav, activeTab } = props;
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} hideDealerId sectionLabel="Help">
        <KnowledgeContent />
      </OperatorPage>
    );
  }

  const onBack = 'onBack' in props ? props.onBack : undefined;

  return (
    <div className="min-h-screen bg-[#f4f6f8]">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <KnowledgeContent onBack={onBack} />
      </main>
    </div>
  );
}
