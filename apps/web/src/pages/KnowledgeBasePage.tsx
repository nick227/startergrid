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
  const groups = useMemo(() => groupCatalogByCategory(filtered), [filtered]);

  return (
    <div className="max-w-4xl mx-auto">
      <header className="mb-8">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-slate-500 hover:text-slate-800 mb-4 block"
          >
            ← Back
          </button>
        )}
        <p className="text-[10px] font-bold uppercase tracking-[0.25em] text-slate-400 mb-2">Reference library</p>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Knowledge base</h1>
        <p className="text-sm text-slate-600 mt-2 max-w-2xl leading-relaxed font-serif">
          Operator and industry reference for syndication, inventory, accounts, and compliance.
          Articles are grouped by subject; select a title to read the full document.
        </p>
      </header>

      <div className="mb-8">
        <SearchField
          value={query}
          onChange={setQuery}
          placeholder="Search titles, subjects, keywords…"
          className="max-w-lg"
        />
        <p className="text-xs text-slate-400 mt-2">
          {filtered.length} of {all.length} articles
          {query.trim() ? ` matching “${query.trim()}”` : ''}
        </p>
      </div>

      <KnowledgeCatalog groups={groups} />
    </div>
  );
}

export default function KnowledgeBasePage(props: Props) {
  if ('dealerId' in props && props.dealerId && props.nav) {
    const { dealerId, nav, activeTab } = props;
    return (
      <OperatorPage dealerId={dealerId} activeTab={activeTab} nav={nav} hideDealerId sectionLabel="Knowledge base">
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
