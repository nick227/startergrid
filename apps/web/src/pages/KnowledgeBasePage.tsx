import { useEffect, useMemo, useRef, useState } from 'react';
import { filterCatalogEntries, listCatalogEntries, loadSearchIndex } from '@/lib/docs/catalog.ts';
import { getDoc, loadDoc } from '@/lib/docs/registry.ts';
import { DocMarkdown } from '@/lib/docs/DocMarkdown.tsx';
import { DOC_TYPES } from '@/lib/docs/types.ts';
import { documentationUrl } from '@/lib/docs/urls.ts';
import type { OperatorPageBaseProps } from '@/lib/operatorPage.ts';

type Props = Partial<OperatorPageBaseProps> & { onBack?: () => void };
const entries = listCatalogEntries();
const tags = [...new Set(entries.flatMap(entry => entry.tags))].sort();
const label = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function readLocation() {
  const [path, query = ''] = window.location.hash.slice(1).split('?');
  let id: string | null = null;
  if (path.startsWith('/docs/')) {
    try { id = decodeURIComponent(path.slice('/docs/'.length)); } catch { id = '__invalid__'; }
  }
  return { id, params: new URLSearchParams(query) };
}

export default function KnowledgeBasePage(_props: Props) {
  const [location, setLocation] = useState(readLocation);
  const locationRef = useRef(location);
  const [query, setQuery] = useState(() => location.params.get('q') ?? '');
  const [limit, setLimit] = useState(20);
  const [searchReady, setSearchReady] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [article, setArticle] = useState<{ id: string; body: string } | null>(null);
  const [articleError, setArticleError] = useState(false);
  const [retry, setRetry] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  const doc = location.id ? getDoc(location.id) : null;
  const entry = doc ? entries.find(item => item.id === doc.id) : null;
  const type = location.params.get('type') ?? '';
  const audience = location.params.get('audience') ?? '';
  const tag = location.params.get('tag') ?? '';
  const search = location.params.get('q') ?? '';
  const suffix = location.params.size ? `?${location.params}` : '';

  useEffect(() => {
    if (search && !searchReady) void loadSearchIndex().then(() => { setSearchReady(true); setSearchError(false); }).catch(() => setSearchError(true));
  }, [search, searchReady]);

  useEffect(() => {
    const update = () => {
      const next = readLocation();
      if (next.params.get('q') !== locationRef.current.params.get('q')) setQuery(next.params.get('q') ?? '');
      locationRef.current = next;
      setLocation(next); setLimit(20);
    };
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  useEffect(() => {
    let active = true;
    setArticle(null); setArticleError(false);
    if (doc) void loadDoc(doc.id).then(value => { if (active) setArticle(value); }).catch(() => { if (active) setArticleError(true); });
    return () => { active = false; };
  }, [doc, retry]);

  useEffect(() => {
    document.title = `${doc?.frontmatter.title ?? 'Documentation'} · StarterGrid`;
    if (location.id) heading.current?.focus();
    window.scrollTo(0, 0);
  }, [location.id, doc]);

  const results = useMemo(() => filterCatalogEntries(entries.filter(item =>
    (!type || item.type === type) && (!audience || item.audience.includes(audience)) && (!tag || item.tags.includes(tag))
  ), search), [type, audience, tag, search, searchReady]);
  const related = entry ? entries.filter(item => item.id !== entry.id &&
    (entry.related.includes(item.id) || item.related.includes(entry.id) || item.feature === entry.feature))
    .sort((a, b) => Number(entry.related.includes(b.id)) - Number(entry.related.includes(a.id))).slice(0, 6) : [];

  function filter(key: string, value: string) {
    const params = new URLSearchParams(location.params);
    if (value) params.set(key, value); else params.delete(key);
    window.location.hash = `/docs${params.size ? `?${params}` : ''}`;
  }

  return (
    <div className="min-h-screen bg-surface-page text-ink-body">
      <header className="border-b border-silver-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-5 flex flex-wrap items-center justify-between gap-3">
          <a href="#/docs" className="font-bold text-ink-heading">StarterGrid <span className="font-normal text-ink-muted">/ Documentation</span></a>
          <a href="#/" className="text-sm text-navy-700 underline">Open StarterGrid</a>
        </div>
      </header>
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        <form role="search" onSubmit={event => { event.preventDefault(); filter('q', query.trim()); }} className="flex gap-2 mb-6">
          <label className="flex-1 min-w-0">
            <span className="sr-only">Search documentation</span>
            <input type="search" value={query} onChange={event => setQuery(event.target.value)}
              placeholder="Ask a question or find a feature" className="field-input w-full" />
          </label>
          <button type="submit" className="btn-primary-operator">Search</button>
        </form>

        {location.id ? doc && entry ? (
          <>
            <a href={`#/docs${suffix}`} className="text-sm text-navy-700 underline">← Documentation index</a>
            <article className="mt-6">
              <p className="text-xs text-ink-muted">{label(entry.type)} · For {entry.audience.map(label).join(', ')}</p>
              <h1 ref={heading} tabIndex={-1} className="text-3xl font-bold text-ink-heading mt-2 outline-none">{entry.title}</h1>
              <p className="text-base text-ink-muted mt-3 leading-relaxed">{entry.summary}</p>
              <div className="mt-3 flex gap-3 flex-wrap text-xs text-ink-muted">
                <span>Feature: {entry.feature}</span><span>Updated {entry.updated}</span>
                <a href={documentationUrl(entry.id)} className="underline text-navy-700">Permanent link</a>
              </div>
              <div className="mt-7">{articleError ? <div role="alert">The article could not load. <button type="button" className="underline" onClick={() => setRetry(value => value + 1)}>Try again</button></div> : article?.id === doc.id ? <DocMarkdown body={article.body} /> : <p role="status">Loading article…</p>}</div>
              <div className="mt-8 flex flex-wrap gap-2" aria-label="Related tags">
                {entry.tags.map(value => <a key={value} href={`#/docs?tag=${encodeURIComponent(value)}`} className="rounded border border-silver-200 px-2 py-1 text-xs text-navy-700">{value}</a>)}
              </div>
              {related.length > 0 && <section className="mt-8 border-t border-silver-200 pt-5" aria-label="Related documentation">
                <h2 className="font-semibold text-ink-heading">Related documentation</h2>
                <ul className="mt-3 space-y-2">{related.map(item => <li key={item.id}><a href={documentationUrl(item.id)} className="text-navy-700 underline">{item.title}</a><p className="text-sm text-ink-muted">{item.summary}</p></li>)}</ul>
              </section>}
              {entry.implementation.length > 0 && <details className="mt-8 border-t border-silver-200 pt-5">
                <summary className="cursor-pointer font-semibold">Implementation references</summary>
                <p className="text-sm text-ink-muted mt-2">Repository paths for developers and agents. These are implementation references, not instructions to change production.</p>
                <ul className="mt-3 space-y-2 text-sm break-all">{entry.implementation.map(path => <li key={path}><a href={`https://github.com/nick227/startergrid/blob/main/${path.split('/').map(encodeURIComponent).join('/')}`} target="_blank" rel="noopener noreferrer" className="underline text-navy-700"><code>{path}</code><span className="sr-only"> (opens repository in a new tab)</span></a></li>)}</ul>
              </details>}
            </article>
          </>
        ) : <section><h1 ref={heading} tabIndex={-1} className="text-2xl font-bold">Article not found</h1><p className="my-3">This link may be incomplete or the article may have moved.</p><a href="#/docs" className="text-navy-700 underline">Search the documentation index</a></section> : (
          <>
            <h1 className="text-2xl font-bold text-ink-heading">Documentation index</h1>
            <p className="text-sm text-ink-muted mt-2">Find how a feature works, complete a task, or diagnose a problem.</p>
            <div className="flex flex-wrap gap-3 my-6">
              <label className="text-sm">Document type<select aria-label="Document type" value={type} onChange={event => filter('type', event.target.value)} className="field-input block mt-1"><option value="">All types</option>{DOC_TYPES.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
              <label className="text-sm">Audience<select aria-label="Audience" value={audience} onChange={event => filter('audience', event.target.value)} className="field-input block mt-1"><option value="">All audiences</option>{['user', 'staff', 'developer'].map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
              <label className="text-sm">Tag<select aria-label="Tag" value={tag} onChange={event => filter('tag', event.target.value)} className="field-input block mt-1 max-w-full"><option value="">All tags</option>{tags.map(value => <option key={value}>{value}</option>)}</select></label>
            </div>
            <p role="status" className="text-sm text-ink-muted mb-3">{results.length} {results.length === 1 ? 'article' : 'articles'}{search ? ` for “${search}”` : ''}</p>
            {searchError && <p role="status" className="text-sm text-ink-muted">Full-text search is temporarily unavailable. Results match titles, summaries, and tags.</p>}
            {location.params.size > 0 && <a href="#/docs" className="text-sm text-navy-700 underline">Clear search and filters</a>}
            {!results.length && <p className="py-8">No matching documentation. Try a shorter phrase or clear the filters.</p>}
            <ul className="divide-y divide-silver-200 mt-3">
              {results.slice(0, limit).map(item => <li key={item.id} className="py-5">
                <a href={`${documentationUrl(item.id)}${suffix}`} className="text-lg font-semibold text-navy-800 underline underline-offset-2">{item.title}</a>
                <p className="mt-1 text-sm leading-relaxed">{item.summary}</p>
                <p className="mt-2 text-xs text-ink-muted">{label(item.type)} · {item.audience.map(label).join(', ')}</p>
              </li>)}
            </ul>
            {results.length > limit && <button type="button" className="btn-secondary-operator mt-4" onClick={() => setLimit(count => count + 20)}>Show more results</button>}
          </>
        )}
      </main>
    </div>
  );
}
