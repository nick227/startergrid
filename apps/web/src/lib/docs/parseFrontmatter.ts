import { DOC_TYPES, type DocFrontmatter, type DocType } from './types.ts';

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

const FRONTMATTER_KEYS = new Set(['visibility', 'title', 'summary', 'keywords', 'updated', 'advanced', 'id', 'feature', 'type', 'audience', 'tags', 'synonyms', 'aliases', 'related', 'implementation']);

export function parseFrontmatter(raw: string): { frontmatter: DocFrontmatter; body: string } {
  const match = raw.match(FRONTMATTER_RE);
  if (!match) return { frontmatter: {}, body: raw.trim() };

  const frontmatter: DocFrontmatter = {};
  for (const line of match[1]!.split('\n')) {
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).trim();
    if (!FRONTMATTER_KEYS.has(key)) continue;
    const value = line.slice(idx + 1).trim();
    if (key === 'visibility' && value === 'public') frontmatter.visibility = 'public';
    if (key === 'type' && DOC_TYPES.includes(value as DocType)) frontmatter.type = value as DocType;
    if (key === 'id' || key === 'feature' || key === 'audience' || key === 'tags' || key === 'synonyms' || key === 'aliases' || key === 'related' || key === 'implementation') frontmatter[key] = value;
    if (key === 'title') frontmatter.title = value;
    if (key === 'summary') frontmatter.summary = value;
    if (key === 'keywords') frontmatter.keywords = value;
    if (key === 'updated') frontmatter.updated = value;
    if (key === 'advanced') frontmatter.advanced = value === 'true';
  }

  return { frontmatter, body: match[2]!.trim() };
}
