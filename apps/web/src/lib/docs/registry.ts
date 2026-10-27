import { articleLoaders } from './loaders.ts';
import manifest from './manifest.json';
import { parseFrontmatter } from './parseFrontmatter.ts';
import type { DocFrontmatter, ParsedDoc } from './types.ts';

type DocRecord = Omit<ParsedDoc, 'body'>;
const docs: Record<string, DocRecord> = {};
const aliases: Record<string, string> = {};
const loaders: Record<string, () => Promise<string>> = {};
const loaded = new Map<string, Promise<ParsedDoc>>();

for (const record of manifest) {
  const { advanced: _advanced, ...frontmatter } = record.frontmatter;
  docs[record.id] = { id: record.id, frontmatter: frontmatter as DocFrontmatter };
  loaders[record.id] = articleLoaders[record.id];
  for (const alias of [record.source.replace(/\.md$/, ''), ...(frontmatter.aliases ?? '').split(',').map(value => value.trim()).filter(Boolean)]) aliases[alias] = record.id;
}

export type DocId = string;
export function listDocIds(): string[] { return Object.keys(docs).sort(); }
export function getDoc(id: string): DocRecord | null { return docs[id] ?? docs[aliases[id]] ?? null; }
export function docTitle(id: string): string { return getDoc(id)?.frontmatter.title ?? id; }

/** Article bodies are separate Vite chunks; the application's page-level links need metadata only. */
export function loadDoc(id: string): Promise<ParsedDoc> {
  const record = getDoc(id);
  if (!record || !loaders[record.id]) return Promise.reject(new Error('Article not found'));
  const cached = loaded.get(record.id);
  if (cached) return cached;
  const promise = loaders[record.id]().then(raw => ({ ...record, body: parseFrontmatter(raw).body })).catch(error => {
    loaded.delete(record.id);
    throw error;
  });
  loaded.set(record.id, promise);
  return promise;
}
