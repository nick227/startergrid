import { lazy, Suspense, useEffect, useRef } from 'react';
import { getDoc, docTitle } from '@/lib/docs/registry.ts';
import { docCategoryLabel } from '@/lib/docs/docCategory.ts';
import { useDocReader } from './DocReaderContext.tsx';

const DocMarkdown = lazy(() =>
  import('@/lib/docs/DocMarkdown.tsx').then(m => ({ default: m.DocMarkdown }))
);
const HelpContent = lazy(() => import('./HelpContent.tsx').then(m => ({ default: m.HelpContent })));

export function DocReaderSheet() {
  const { isOpen, docId, helpTopic, openHelp, closeDoc, openDoc } = useDocReader();
  const dialogRef = useRef<HTMLElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const doc = docId ? getDoc(docId) : null;

  useEffect(() => {
    if (!isOpen) return;
    const trigger = document.activeElement as HTMLElement | null;
    const triggerTopic = trigger?.dataset.helpTopic;
    const previousOverflow = document.body.style.overflow;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); closeDoc(); }
    };
    window.addEventListener('keydown', onKey, true);
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = previousOverflow;
      if (trigger?.isConnected) trigger.focus();
      else if (triggerTopic) {
        // A lazy route can replace its loading header while help is open.
        const replacement = [...document.querySelectorAll<HTMLElement>('[data-help-topic]')]
          .find(element => element.dataset.helpTopic === triggerTopic);
        replacement?.focus();
      }
    };
  }, [isOpen, closeDoc]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    if (isOpen) dialogRef.current?.focus();
  }, [docId, isOpen]);

  if (!isOpen) return null;

  const title = !docId ? 'Help' : doc ? (doc.frontmatter.title ?? docTitle(docId)) : 'Article unavailable';
  const category = docId ? docCategoryLabel(docId) : 'StarterGrid';

  return (
    <div className="fixed inset-0 z-[60] flex flex-col justify-end" role="presentation">
      <button
        type="button"
        aria-label="Close help"
        tabIndex={-1}
        className="absolute inset-0 bg-navy-950/40 backdrop-blur-[1px]"
        onClick={closeDoc}
      />

      <section
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="doc-reader-title"
        className="relative flex flex-col bg-[#f9f7f4] rounded-t-2xl shadow-2xl max-h-[75vh] min-h-[40vh] animate-doc-sheet-up"
        onKeyDown={e => {
          if (e.key !== 'Tab') return;
          const items = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), [tabindex="0"]') ?? [])]
            .filter(el => el.getClientRects().length > 0);
          const first = items[0], last = items[items.length - 1];
          if (!first || !last) { e.preventDefault(); return; }
          if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) { e.preventDefault(); last.focus(); }
          else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
        }}
      >
        <div className="shrink-0 px-5 pt-3 pb-4 border-b border-stone-200/80 bg-[#f9f7f4] rounded-t-2xl">
          <div className="mx-auto w-10 h-1 rounded-full bg-stone-300 mb-4" aria-hidden />
          <div className="flex items-start justify-between gap-4 max-w-2xl mx-auto w-full">
            <div className="min-w-0">
              {docId && <button type="button" onClick={() => openHelp()} className="mb-2 text-sm font-semibold text-navy-700 underline">← All help</button>}
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
              aria-label="Close help"
            >
              ✕
            </button>
          </div>
        </div>

        <div ref={scrollRef} className="flex-1 overflow-y-auto scrollbar-thin px-5 py-7 sm:px-8">
          <div className="max-w-2xl mx-auto doc-reader-body">
            <div hidden={Boolean(docId)}>
              <Suspense fallback={<p role="status">Loading help…</p>}><HelpContent embedded topicId={helpTopic} /></Suspense>
            </div>
            {docId && (doc ? (
              <Suspense fallback={<div className="h-24 animate-pulse rounded bg-stone-100" />}>
                <DocMarkdown body={doc.body} onDocLink={openDoc} />
              </Suspense>
            ) : (
              <p className="text-sm text-stone-600">
                This article could not be found. Choose All help to search for another topic.
              </p>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
