import { getDoc, docTitle, listDocIds } from './registry.ts';
import type { DocCatalogEntry } from './types.ts';

function parseKeywords(raw?: string): string[] {
  if (!raw) return [];
  return raw.split(',').map(k => k.trim().toLowerCase()).filter(Boolean);
}

export function buildCatalogEntry(docId: string): DocCatalogEntry | null {
  const doc = getDoc(docId);
  if (!doc) return null;

  return {
    id: doc.id,
    feature: doc.frontmatter.feature ?? '',
    type: doc.frontmatter.type ?? 'task',
    audience: parseKeywords(doc.frontmatter.audience),
    tags: [...new Set(parseKeywords(doc.frontmatter.tags))],
    synonyms: parseKeywords(doc.frontmatter.synonyms),
    related: parseKeywords(doc.frontmatter.related),
    implementation: (doc.frontmatter.implementation ?? '').split(',').map(value => value.trim()).filter(Boolean),
    title: doc.frontmatter.title ?? docTitle(docId),
    summary: doc.frontmatter.summary ?? '',
    keywords: parseKeywords(doc.frontmatter.keywords),
    updated: doc.frontmatter.updated,
  };
}

export function listCatalogEntries(): DocCatalogEntry[] {
  return listDocIds()
    .map(buildCatalogEntry)
    .filter((e): e is DocCatalogEntry => e !== null)
    .sort((a, b) => Number(b.type === 'feature') - Number(a.type === 'feature') || a.title.localeCompare(b.title));
}

const normalize = (value: string) => value.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const STOP_WORDS = new Set(['a', 'an', 'the', 'my', 'our', 'is', 'are', 'was', 'do', 'does', 'did', 'didnt', 'why', 'how', 'to', 'in', 'on', 'of', 'for', 'and', 'i', 'it']);
let bodyIndex: Record<string, string> = {};
let bodyPromise: Promise<void> | undefined;
export function loadSearchIndex(): Promise<void> {
  return bodyPromise ??= import('./search-text.json').then(module => {
    bodyIndex = Object.fromEntries(Object.entries(module.default).map(([id, text]) => [id, normalize(text)]));
  }).catch(error => { bodyPromise = undefined; throw error; });
}

const fields = new Map<string, { title: string; summary: string; terms: string }>();

export function filterCatalogEntries(entries: DocCatalogEntry[], query: string): DocCatalogEntry[] {
  const phrase = normalize(query);
  if (!phrase) return entries;
  const terms = phrase.split(' ').filter(term => !STOP_WORDS.has(term));
  if (!terms.length) return entries;
  return entries.map(entry => {
    let searchable = fields.get(entry.id);
    if (!searchable) {
      searchable = {
        title: normalize(entry.title), summary: normalize(entry.summary),
        terms: normalize([entry.id, entry.feature, ...entry.tags, ...entry.synonyms, ...entry.keywords].join(' ')),
      };
      fields.set(entry.id, searchable);
    }
    let matched = 0;
    let score = searchable.title.includes(phrase) ? 30 : 0;
    for (const term of terms) {
      const weight = searchable.title.includes(term) ? 10 : searchable.terms.includes(term) ? 7 : searchable.summary.includes(term) ? 5 : (bodyIndex[entry.id] ?? '').includes(term) ? 1 : 0;
      if (weight) matched++;
      score += weight;
    }
    // Keep useful partial matches for natural-language questions.
    return { entry, score: score + (matched === terms.length ? 20 : 0), matched };
  }).filter(result => result.matched > 0)
    .sort((a, b) => b.score - a.score || a.entry.title.localeCompare(b.entry.title))
    .map(result => result.entry);
}
