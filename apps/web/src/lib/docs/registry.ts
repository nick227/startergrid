import { parseFrontmatter } from './parseFrontmatter.ts';
import type { ParsedDoc } from './types.ts';

type ViteImportMeta = ImportMeta & {
  glob: (pattern: string, options: { query: string; import: string; eager: true }) => Record<string, string>;
};

const DOC_MODULES = (import.meta as ViteImportMeta).glob('../../docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>;

function pathToDocId(path: string): string {
  return path
    .replace(/^\.\.\/\.\.\/docs\//, '')
    .replace(/\.md$/, '');
}

function isPublishedDoc(path: string): boolean {
  const id = pathToDocId(path);
  return !id.split('/').some(segment => segment.startsWith('_'));
}

const DOCS: Record<string, ParsedDoc> = Object.fromEntries(
  Object.entries(DOC_MODULES)
    .filter(([path]) => isPublishedDoc(path))
    .map(([path, raw]) => {
      const id = pathToDocId(path);
      const { frontmatter, body } = parseFrontmatter(raw);
      return [id, { id, frontmatter, body }];
    })
);

export type DocId = keyof typeof DOCS & string;

export function listDocIds(): string[] {
  return Object.keys(DOCS).sort();
}

export function getDoc(docId: string): ParsedDoc | null {
  return DOCS[docId] ?? null;
}

export function docTitle(docId: string): string {
  const doc = getDoc(docId);
  if (!doc) return docId;
  return doc.frontmatter.title ?? docId.split('/').pop()!.replace(/-/g, ' ');
}
