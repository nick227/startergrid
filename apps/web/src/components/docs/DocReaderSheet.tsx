import { lazy, Suspense, useEffect } from 'react';
import { getDoc, docTitle } from '@/lib/docs/registry.ts';
import { docCategoryLabel } from '@/lib/docs/docCategory.ts';
import { useDocReader } from './DocReaderContext.tsx';

const DocMarkdown = lazy(() =>
  import('@/lib/docs/DocMarkdown.tsx').then(m => ({ default: m.DocMarkdown }))
);

export function DocReaderSheet() {
  const { docId, closeDoc, openDoc } = useDocReader();
  const doc = docId ? getDoc(docId) : null;

  useEffect(() => {
    if (!docId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDoc();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [docId, closeDoc]);

  if (!docId) return null;

  const title = doc ? (doc.frontmatter.title ?? docTitle(docId)) : 'Not found';
  const category = docCategoryLabel(docId);

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end" role="presentation">
      <button
        type="button"
        aria-label="Close reader"
        className="absolute inset-0 bg-navy-950/40 backdrop-blur-[1px]"
        onClick={closeDoc}
      />

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="doc-reader-title"
        className="relative flex flex-col bg-[#f9f7f4] rounded-t-2xl shadow-2xl max-h-[75vh] min-h-[40vh] animate-doc-sheet-up"
      >
        <div className="shrink-0 px-5 pt-3 pb-4 border-b border-stone-200/80 bg-[#f9f7f4] rounded-t-2xl">
          <div className="mx-auto w-10 h-1 rounded-full bg-stone-300 mb-4" aria-hidden />
          <div className="flex items-start justify-between gap-4 max-w-2xl mx-auto w-full">
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1">{category}</p>
              <h2 id="doc-reader-title" className="text-xl font-bold text-ink-heading tracking-tight leading-snug">
                {title}
              </h2>
              {doc?.frontmatter.updated && (
                <p className="text-xs text-stone-500 mt-1">Updated {doc.frontmatter.updated}</p>
              )}
            </div>
            <button
              type="button"
              onClick={closeDoc}
              className="shrink-0 w-8 h-8 rounded-full bg-stone-200/80 text-stone-600 hover:bg-stone-300 text-sm leading-none"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin px-5 py-7 sm:px-8">
          <div className="max-w-2xl mx-auto doc-reader-body">
            {doc ? (
              <Suspense fallback={<div className="h-24 animate-pulse rounded bg-stone-100" />}>
                <DocMarkdown body={doc.body} onDocLink={openDoc} />
              </Suspense>
            ) : (
              <p className="text-sm text-stone-600">
                No document at <code className="font-mono text-xs">{docId}</code>.
              </p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
