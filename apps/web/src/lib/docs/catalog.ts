import { docCategoryKey, docCategoryLabel } from './docCategory.ts';
import { getDoc, docTitle, listDocIds } from './registry.ts';
import type { DocCatalogEntry } from './types.ts';

function parseKeywords(raw?: string): string[] {
  if (!raw) return [];
  return raw.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
}

function fallbackSummary(body: string): string {
  const line = body.split('\n').find(l => l.trim() && !l.startsWith('#') && !l.startsWith('|'));
  if (!line) return '';
  return line.replace(/\*\*/g, '').trim().slice(0, 160);
}

export function buildCatalogEntry(docId: string): DocCatalogEntry | null {
  const doc = getDoc(docId);
  if (!doc) return null;

  const categoryKey = docCategoryKey(docId);
  return {
    id: docId,
    title: doc.frontmatter.title ?? docTitle(docId),
    summary: doc.frontmatter.summary ?? fallbackSummary(doc.body),
    categoryKey,
    category: docCategoryLabel(docId),
    keywords: parseKeywords(doc.frontmatter.keywords),
    updated: doc.frontmatter.updated,
  };
}

export function listCatalogEntries(): DocCatalogEntry[] {
  return listDocIds()
    .map(buildCatalogEntry)
    .filter((e): e is DocCatalogEntry => e !== null)
    .sort((a, b) => {
      const cat = a.category.localeCompare(b.category);
      if (cat !== 0) return cat;
      return a.title.localeCompare(b.title);
    });
}

export function groupCatalogByCategory(entries: DocCatalogEntry[]): Map<string, DocCatalogEntry[]> {
  const groups = new Map<string, DocCatalogEntry[]>();
  for (const entry of entries) {
    const list = groups.get(entry.category) ?? [];
    list.push(entry);
    groups.set(entry.category, list);
  }
  return new Map([...groups.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function searchHaystack(entry: DocCatalogEntry): string {
  const doc = getDoc(entry.id);
  const body = doc?.body.replace(/[#*|`[\]()]/g, ' ').toLowerCase() ?? '';
  return [
    entry.title,
    entry.summary,
    entry.category,
    ...entry.keywords,
    body,
  ].join(' ').toLowerCase();
}

export function filterCatalogEntries(entries: DocCatalogEntry[], query: string): DocCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return entries;

  const terms = q.split(/\s+/).filter(Boolean);
  return entries.filter(entry => {
    const haystack = searchHaystack(entry);
    return terms.every(term => haystack.includes(term));
  });
}
